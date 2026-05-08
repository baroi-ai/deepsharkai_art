import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db";
import { users, imageGenerations } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { fal } from "@fal-ai/client";
import { v4 as uuidv4 } from "uuid";
import { uploadToR2 } from "@/lib/r2";

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
    const { input } = await req.json();

    // 2. Configuration
    const hasMask = !!input.mask_url;
    const hasReference = !!input.reference_image_url;
    //const targetModelId = "fal-ai/nano-banana-pro/edit";
    //const cost = 15;
    const targetModelId = "fal-ai/nano-banana-2/edit";
    const cost = 10;

    // 3. Check Credits
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || (user.credits || 0) < cost) {
      return NextResponse.json(
        { error: "Insufficient coins", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }

    // 4. Validation
    if (!input.image_url || !input.prompt) {
      return NextResponse.json(
        { error: "Missing requirements. Image and Prompt are required." },
        { status: 400 },
      );
    }

    console.log(`🎨 Editing | Mask: ${hasMask} | Ref: ${hasReference}`);

    // 5. Construct Payload
    // Nano Banana Pro expects images in this order: [Main Image, Mask Image, Reference Image]
    const imageList = [input.image_url];
    let finalPrompt = input.prompt;

    if (hasMask) {
      imageList.push(input.mask_url);
      // We don't modify the prompt for the mask, the AI understands order
    }

    if (hasReference) {
      imageList.push(input.reference_image_url);
      // Explicitly tell the AI to use the attached reference image
      finalPrompt = `${input.prompt}. Use the provided reference image for stylistic/object guidance.`;
    }

    const falInput: any = {
      prompt: finalPrompt,
      image_urls: imageList,
      output_format: "jpeg",
      resolution: "1K",
      limit_generations: true,
    };

    // 6. Generate
    const result: any = await fal.subscribe(targetModelId, {
      input: falInput,
      logs: true,
    });

    // 7. Extract URL
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url) {
      remoteImageUrl = result.data.images[0].url;
    } else {
      throw new Error("No image returned from API");
    }

    // 8. FAST PATH: Deduct Credits
    const generationId = uuidv4();

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: input.prompt, // Store user's original prompt, not the system modified one
        model: "Deepshark inpaint",
        imageUrl: remoteImageUrl,
        fallbackUrl: remoteImageUrl,
        cost: cost,
        status: "completed",
      });
    });

    // 9. BACKGROUND TASK: R2
    (async () => {
      try {
        const res = await fetch(remoteImageUrl);
        if (!res.ok) return;

        const buffer = Buffer.from(await res.arrayBuffer());

        // 1. Define the Key (The exact path inside your R2 bucket)
        const fileKey = `users/${userId}/image/edits/${generationId}.jpg`;

        // 2. Upload to R2 (This returns JUST the fileKey string now)
        const savedKey = await uploadToR2(buffer, fileKey);

        // 3. Update DB with the KEY, never a full URL
        await db
          .update(imageGenerations)
          .set({ imageUrl: savedKey }) // 🌟 Store the key, not a URL
          .where(eq(imageGenerations.id, generationId));

        console.log("✅ Background Edit upload complete (Key Saved)");
      } catch (err) {
        console.error("Background Upload Error:", err);
      }
    })();

    return NextResponse.json({
      success: true,
      imageUrl: remoteImageUrl,
      remainingCredits: (user.credits || 0) - cost,
    });
  } catch (error: any) {
    console.error("API Edit Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Error" },
      { status: 500 },
    );
  }
}
