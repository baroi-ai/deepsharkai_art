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

const ALLOWED_MODELS = new Set([
  "fal-ai/nano-banana-pro/edit",
  "fal-ai/topaz/upscale/image",
  "fal-ai/clarity-upscaler"
]);

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { modelId, input } = await req.json();

    // 2. Validate
    if (!ALLOWED_MODELS.has(modelId)) return NextResponse.json({ error: "Invalid Model ID" }, { status: 400 });

    const cost = 2; // Fixed cost per upscale

    // 3. Check Credits
    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId));
    if (!user || (user.credits || 0) < cost) {
      return NextResponse.json({ error: "Insufficient coins", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }

    // 4. Prepare Input
    const sourceImageUrl = input.image_url || input.image || input.image_urls?.[0];
    if (!sourceImageUrl) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    let falInput: any = {};
    let friendlyModelName = "Upscaler"; // Default name for DB

    // Input mapping logic
    switch (modelId) {
      case "fal-ai/nano-banana-pro/edit":
        friendlyModelName = "Deepshark Upscaler"; // ✅ Custom Name
        const resolution = (input.scale && Number(input.scale) >= 4) ? "4K" : "2K";
        falInput = {
          prompt: "upscale image to high quality, masterpiece, 8k resolution",
          num_images: 1,
          aspect_ratio: "auto",
          output_format: "png",
          image_urls: [sourceImageUrl],
          resolution: resolution
        };
        break;

      case "fal-ai/clarity-upscaler":
        friendlyModelName = "Clarity Upscaler"; // ✅ Custom Name
        falInput = {
          image_url: sourceImageUrl,
          upscale_factor: input.scale || 2,
          guidance_scale: 4,
          num_inference_steps: 18,
          enable_safety_checker: true
        };
        break;

      case "fal-ai/topaz/upscale/image":
        friendlyModelName = "Topaz Upscaler"; // ✅ Custom Name
        falInput = {
          image_url: sourceImageUrl,
          model: "Standard V2",
          upscale_factor: input.scale || 2,
          output_format: "jpeg"
        };
        break;

      default:
        return NextResponse.json({ error: "Model logic not implemented" }, { status: 500 });
    }

    console.log(`🚀 Upscaling with: ${friendlyModelName} (${modelId})`);

    // 5. Generate (Wait for Fal to finish)
    const result: any = await fal.subscribe(modelId, { input: falInput, logs: true });

    // 6. Extract Result URL
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url) remoteImageUrl = result.data.images[0].url;
    else if (result.data?.image?.url) remoteImageUrl = result.data.image.url;
    else if (result.data?.url) remoteImageUrl = result.data.url;

    if (!remoteImageUrl) throw new Error("Upscaling failed: No image returned.");

    // 7. ✅ FAST PATH: Save Fal URL & Deduct Credits Immediately
    const generationId = uuidv4();
    const promptText = `Upscale (${input.scale || 2}x)`;

    await db.transaction(async (tx: any) => {
      await tx.update(users).set({ credits: sql`${users.credits} - ${cost}` }).where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: promptText,
        model: friendlyModelName, // ✅ Save the custom friendly name here
        imageUrl: remoteImageUrl,    // Save Fal URL first (Fast!)
        fallbackUrl: remoteImageUrl, // Backup
        cost: cost,
        status: "completed",
      });
    });

    // 8. ✅ BACKGROUND TASK: Upload to R2 & Update DB
    (async () => {
        try {
            const res = await fetch(remoteImageUrl);
            if (!res.ok) return;
            
            const buffer = Buffer.from(await res.arrayBuffer());
            // Organized Folder Structure
            const filename = `users/${userId}/image/upscaler/${generationId}.png`; 
            
            // Upload to R2
            const r2Url = await uploadToR2(buffer, filename);
            
            // Update DB with permanent R2 URL
            await db.update(imageGenerations)
                .set({ imageUrl: r2Url }) 
                .where(eq(imageGenerations.id, generationId));
                
            console.log("✅ Background R2 upload complete");
        } catch (err) {
            console.error("Background Upload Error:", err);
        }
    })();

    // 9. Respond Immediately
    return NextResponse.json({
      success: true,
      imageUrl: remoteImageUrl, // Send Fal URL to frontend instantly
      remainingCredits: (user.credits || 0) - cost,
    });

  } catch (error: any) {
    console.error("🚨 API Upscale Error:", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}