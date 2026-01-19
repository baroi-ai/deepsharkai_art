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
    const { input } = await req.json();

    // --- CONFIGURATION ---
    const targetModelId = "fal-ai/bria/background/remove";
    const cost = 2; // Fixed cost

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

    // 3. Prepare Payload
    // Bria only accepts 'image_url'
    const sourceImageUrl = input.image_url || input.image;
    if (!sourceImageUrl) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    console.log(`Removing background with: ${targetModelId}`);

    // 4. Generate
    const result: any = await fal.subscribe(targetModelId, {
      input: { image_url: sourceImageUrl },
      logs: true,
    });

    // 5. Extract Image URL
    let remoteImageUrl = "";
    if (result.data?.image?.url) {
      remoteImageUrl = result.data.image.url;
    } else {
      throw new Error("Generation failed: No output image returned");
    }

    // 6. Download & Save Locally
    const imageResponse = await fetch(remoteImageUrl);
    if (!imageResponse.ok) throw new Error("Failed to download result image");

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `${uuidv4()}.png`;
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
        prompt: "Background Removal",
        model: "bria-bg-remove",
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
    console.error("API BG Remove Error:", error);
    const errorMessage = error.body?.message || error.message || "Internal Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
}