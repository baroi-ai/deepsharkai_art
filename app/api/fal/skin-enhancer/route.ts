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
    // 1. Authenticate User
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { input } = await req.json();

    const cost = 20;

    // 2. Check Credits
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

    // 3. Prepare Source Image
    const sourceImageUrl = input.image_url;
    if (!sourceImageUrl) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 4. ✅ DYNAMIC PROMPT BUILDER
    // Grab the features toggled by the user
    const features = input.features || {};
    let promptAdditions = [];

    if (features.freckles) promptAdditions.push("distinct natural freckles");
    if (features.acne)
      promptAdditions.push(
        "subtle natural acne, slight skin blemishes, real human imperfections",
      );
    if (features.peachFuzz) promptAdditions.push("fine peach fuzz on skin");
    if (features.lensFlare)
      promptAdditions.push(
        "cinematic lens flare, beautiful atmospheric lighting",
      );

    const additionsString =
      promptAdditions.length > 0 ? ", " + promptAdditions.join(", ") : "";

    // Assemble the ultimate photorealism prompt
    const finalPrompt = `raw unedited portrait photography, extreme hyper-realistic skin texture, visible pores, micro-details, subsurface scattering, dslr 85mm lens, sharp focus, exactly same face identity, no airbrushing, no smoothing${additionsString}, highly detailed, 8k resolution`;

    const targetModelId = "fal-ai/nano-banana-2/edit"; //fal-ai/flux-2/klein/9b/edit
    const falInput = {
      prompt: finalPrompt,
      image_urls: [sourceImageUrl],
      num_images: 1,
      aspect_ratio: "auto",
      output_format: "jpeg",
      resolution: "2K",
      safety_checker: true,
      strength: input.strength ?? 0.1, // ✅ Accepts the custom strength from the UI!
    };

    console.log(
      `✨ Enhancing skin with Nano Banana Pro (Strength: ${falInput.strength})`,
    );

    // 5. Generate (Wait for Fal)
    const result: any = await fal.subscribe(targetModelId, {
      input: falInput,
      logs: true,
    });

    // 6. Extract Result URL Robustly
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url) {
      remoteImageUrl = result.data.images[0].url;
    } else if (result.data?.image?.url) {
      remoteImageUrl = result.data.image.url;
    } else if (result.data?.url) {
      remoteImageUrl = result.data.url;
    }

    if (!remoteImageUrl) {
      throw new Error("Enhancement failed: Provider returned no image URL.");
    }

    // 7. Save Fal URL as 'fallbackUrl' & Deduct Credits
    const generationId = uuidv4();

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: `Skin Enhance - Strength: ${falInput.strength}`,
        model: "DeepShark Skin",
        imageUrl: remoteImageUrl,
        fallbackUrl: remoteImageUrl,
        cost: cost,
        status: "completed",
      });
    });

    // 8. BACKGROUND TASK: Upload to R2 (Key-Only Mode)
    (async () => {
      try {
        const res = await fetch(remoteImageUrl);
        if (!res.ok) return;

        const buffer = Buffer.from(await res.arrayBuffer());

        // 1. Define the Key (The exact path inside your R2 bucket)
        const fileKey = `users/${userId}/image/skin-enhancer/${generationId}.jpg`;

        // 2. Upload to R2 (This returns JUST the fileKey string now)
        const savedKey = await uploadToR2(buffer, fileKey);

        // 3. Update DB with the KEY, never a full URL
        await db
          .update(imageGenerations)
          .set({ imageUrl: savedKey }) // 🌟 Store the key, not a URL
          .where(eq(imageGenerations.id, generationId));

        console.log("✅ Background Enhancer upload complete (Key Saved)");
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
    console.error("🚨 Skin Enhancer Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
