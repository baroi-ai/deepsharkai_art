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
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { input } = await req.json(); // No modelId needed, we rely on the single model

    // --- CONFIGURATION ---
    const targetModelId = "fal-ai/flux-lora/inpainting";
    const cost = 8; // Flux is premium

    // 2. Check Credits
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

    // 3. Validation
    if (!input.image_url || !input.mask_url || !input.prompt) {
        return NextResponse.json(
            { error: "Missing requirements. Ensure you have painted a mask and entered a prompt." }, 
            { status: 400 }
        );
    }

    console.log(`Inpainting with: ${targetModelId}`);

    // 4. Generate
    const result: any = await fal.subscribe(targetModelId, {
      input: {
        prompt: input.prompt,
        image_url: input.image_url,
        mask_url: input.mask_url,
        num_inference_steps: 28,
        guidance_scale: 3.5,
        strength: 1.0, // 1.0 = completely replace masked area
        enable_safety_checker: true,
        output_format: "jpeg"
      },
      logs: true,
    });

    // 5. Save & Deduct
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url) {
        remoteImageUrl = result.data.images[0].url;
    } else {
        throw new Error("No image returned from API");
    }

    const imageResponse = await fetch(remoteImageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const filename = `${uuidv4()}.jpg`;
    const savePath = path.join(process.cwd(), "public", "generations", filename);
    
    await writeFile(savePath, buffer);
    const localUrl = `/generations/${filename}`;

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        userId: userId,
        prompt: input.prompt,
        model: "flux-inpainting",
        imageUrl: localUrl,
        cost: cost,
        status: "completed",
      });
    });

    return NextResponse.json({ 
        success: true, 
        imageUrl: localUrl, 
        remainingCredits: (user.credits || 0) - cost 
    });

  } catch (error: any) {
    console.error("API Inpaint Error:", error);
    return NextResponse.json(
        { error: error.message || "Internal Error" }, 
        { status: 500 }
    );
  }
}