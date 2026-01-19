import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db"; 
import { users, imageGenerations } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { fal } from "@fal-ai/client";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configure Fal
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req: Request) {
  try {
    // 1. Authenticate User
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { modelId, input } = await req.json();

    // --- CONFIGURATION ---
    
    // 1. Map to the CORRECT Model ID
    const REAL_MODEL_MAP: Record<string, string> = {
      "deepshark-realism":        "fal-ai/image-editing/realism", 
      "deepshark-face-enhancement":  "fal-ai/image-editing/face-enhancement", 
      "deepshark-retoucher":        "fal-ai/image-editing/retouch", 
    };

    const targetModelId = REAL_MODEL_MAP[modelId] || "fal-ai/image-editing/realism";
    const cost = 2; // Fixed cost for retouching

    // 2. Check User Credits
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || (user.credits || 0) < cost) {
      return NextResponse.json(
        { error: "Insufficient coins", code: "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    // 3. Prepare Payload (Strictly what the API expects)
    // The frontend sends prompts/strength, but 'retoucher' ONLY wants 'image_url'.
    // We must filter the input or the API throws 422.
    const falInput = {
      image_url: input.image_url || input.image || input.image_urls?.[0],
      // Add seed if you want consistency, otherwise leave it out
    };

    if (!falInput.image_url) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    console.log(`Generating with: ${targetModelId}`);

    // 4. Generate
    const result: any = await fal.subscribe(targetModelId, {
      input: falInput, // ✅ Only sending valid inputs now
      logs: true,
    });

    // 5. Extract Image URL
    let remoteImageUrl = "";
    if (result.data?.image?.url) {
      remoteImageUrl = result.data.image.url;
    } else if (result.data?.images?.[0]?.url) {
      remoteImageUrl = result.data.images[0].url;
    } else {
      console.error("Fal Response:", JSON.stringify(result.data, null, 2));
      throw new Error("Generation failed: No output image returned");
    }

    // 6. Download & Save Locally
    const imageResponse = await fetch(remoteImageUrl);
    if (!imageResponse.ok) throw new Error("Failed to download generated image");

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `${uuidv4()}.png`;
    // Ensure public/generations exists
    const savePath = path.join(process.cwd(), "public", "generations", filename);

    await writeFile(savePath, buffer);

    const localUrl = `/generations/${filename}`;

    // 7. DB Transaction (Deduct & Save)
    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        userId: userId,
        prompt: "Skin Enhancement (Retoucher)", // Hardcoded as this model doesn't use prompts
        model: modelId,
        imageUrl: localUrl,
        cost: cost,
        status: "completed",
      });
    });

    return NextResponse.json({
      success: true,
      imageUrl: localUrl,
      remainingCredits: (user.credits || 0) - cost,
    });

  } catch (error: any) {
    console.error("API Generation Error:", error);
    // Return detailed error if available
    const errorMessage = error.body?.message || error.message || "Internal Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
}