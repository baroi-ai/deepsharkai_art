// app/api/fal/upscale/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db"; // Adjust relative path if needed
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
    
    // Map frontend IDs to REAL Fal.ai Model IDs
    const REAL_MODEL_MAP: Record<string, string> = {
      "fal-ai/seedvr/upscale/image": "fal-ai/seedvr/upscale/image",
      "fal-ai/topaz/Upscale/image":  "fal-ai/topaz/upscale/image", // Adjusted casing
      "fal-ai/clarity-upscaler":     "fal-ai/clarity-upscaler",
    };

    const targetModelId = REAL_MODEL_MAP[modelId];
    if (!targetModelId) {
        return NextResponse.json({ error: "Invalid Model ID" }, { status: 400 });
    }

    const cost = 2; // Fixed cost per upscale

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

    // 3. Prepare Payload (Model-Specific Logic)
    let falInput: any = {};
    const sourceImageUrl = input.image_url || input.image || input.image_urls?.[0];

    if (!sourceImageUrl) {
        return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (targetModelId === "fal-ai/clarity-upscaler") {
        falInput = {
            image_url: sourceImageUrl,
            upscale_factor: input.scale || 2,
            prompt: "masterpiece, best quality, highres", // Default helpful prompt
            creativity: input.creativity || 0.35,
            resemblance: 0.6,
            guidance_scale: 4,
            num_inference_steps: 18,
            enable_safety_checker: true
        };
    } else if (targetModelId === "fal-ai/topaz/upscale/image") {
        falInput = {
            image_url: sourceImageUrl,
            model: "Standard V2", // Default model
            upscale_factor: input.scale || 2,
            output_format: "jpeg",
            face_enhancement: true // Generally desired for upscaling
        };
    } else if (targetModelId === "fal-ai/seedvr/upscale/image") {
        falInput = {
            image_url: sourceImageUrl,
            upscale_mode: "factor",
            upscale_factor: input.scale || 2,
            output_format: "jpg"
        };
    }

    console.log(`Upscaling with: ${targetModelId}`);

    // 4. Generate
    const result: any = await fal.subscribe(targetModelId, {
      input: falInput,
      logs: true,
    });

    // 5. Extract Image URL
    let remoteImageUrl = "";
    // Handle diverse output schemas
    if (result.data?.image?.url) {
      remoteImageUrl = result.data.image.url;
    } else if (result.data?.images?.[0]?.url) {
      remoteImageUrl = result.data.images[0].url;
    } else {
      console.error("Fal Response:", JSON.stringify(result.data, null, 2));
      throw new Error("Upscaling failed: No output image returned");
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
        prompt: `Upscale (${input.scale || 2}x)`,
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
    console.error("API Upscale Error:", error);
    const errorMessage = error.body?.message || error.message || "Internal Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: error.status || 500 }
    );
  }
}