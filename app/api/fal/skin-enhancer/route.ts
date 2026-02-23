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
    const { modelId, input } = await req.json();

    const cost = 2;

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

    // 3. Prepare Source Image
    const sourceImageUrl = input.image_url || input.image || input.image_urls?.[0];

    if (!sourceImageUrl) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    let targetModelId = "";
    let falInput: any = {};

    // 4. Model Selection & Logic
    switch (modelId) {
      case "deepshark-realism":
        // ✅ STRATEGY: Use Nano Banana to INJECT texture
        targetModelId = "fal-ai/nano-banana-pro/edit";
        falInput = {
          // The "Anti-Plastic" Prompt
          prompt: "raw photography, hyper-realistic skin texture, visible pores, micro-details, slight freckles, peach fuzz, subsurface scattering, dslr quality, sharp focus, keep face identity exactly the same, no smoothing, no airbrushing",
          image_urls: [sourceImageUrl],
          num_images: 1,
          aspect_ratio: "auto",
          output_format: "jpeg", // JPEGs are faster for R2
          resolution: "2K", 
          safety_checker: true
        };
        break;

      case "deepshark-retoucher":
        targetModelId = "fal-ai/image-editing/retouch";
        falInput = { image_url: sourceImageUrl };
        break;

      case "deepshark-face-enhancement":
        targetModelId = "fal-ai/image-editing/face-enhancement";
        falInput = { image_url: sourceImageUrl };
        break;

      default:
        targetModelId = "fal-ai/nano-banana-pro/edit";
        falInput = {
          prompt: "improve image quality, realistic texture",
          image_urls: [sourceImageUrl],
        };
        break;
    }

    console.log(`✨ Enhancing skin with: ${modelId}`);

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

    // 7. ✅ FAST PATH: Save Fal URL as 'fallbackUrl' & Deduct Credits
    const generationId = uuidv4();
    
    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: `Skin Enhance`,
        model: "DeepShark Skin Enhancer",
        imageUrl: remoteImageUrl,    // 1. Main URL (Fal initially)
        fallbackUrl: remoteImageUrl, // 2. ✅ Backup URL (Fal permanently)
        cost: cost,
        status: "completed",
      });
    });

    // 8. ✅ BACKGROUND TASK: Upload to R2 & Update Main URL
    (async () => {
        try {
            const res = await fetch(remoteImageUrl);
            if (!res.ok) return;
            
            const buffer = Buffer.from(await res.arrayBuffer());
            const filename = `users/${userId}/image/skin-enhancer/${generationId}.jpg`; 
            
            // Upload to R2
            const r2Url = await uploadToR2(buffer, filename);
            
            // Update DB with permanent R2 URL (keep fallbackUrl as is)
            await db.update(imageGenerations)
                .set({ imageUrl: r2Url }) 
                .where(eq(imageGenerations.id, generationId));
                
            console.log("✅ Background Enhancer upload complete");
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
      { status: 500 }
    );
  }
}