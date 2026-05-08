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

// ✅ Removed Clarity Upscaler
const ALLOWED_MODELS = new Set([
  //"fal-ai/nano-banana-pro/edit",
  "fal-ai/nano-banana-2/edit",
  "fal-ai/topaz/upscale/image",
]);

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { modelId, input } = await req.json();

    // 2. Validate & Calculate Dynamic Cost
    if (!ALLOWED_MODELS.has(modelId))
      return NextResponse.json({ error: "Invalid Model ID" }, { status: 400 });

    const requestedScale = Number(input.scale) || 2;
    const is4K = requestedScale >= 4;
    let cost = 10; // Fallback

    if (modelId === "fal-ai/nano-banana-2/edit") {
      cost = is4K ? 20 : 10;
    } else if (modelId === "fal-ai/topaz/upscale/image") {
      cost = is4K ? 12 : 8;
    }

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

    // 4. Prepare Input
    const sourceImageUrl =
      input.image_url || input.image || input.image_urls?.[0];
    if (!sourceImageUrl)
      return NextResponse.json({ error: "No image provided" }, { status: 400 });

    let falInput: any = {};
    let friendlyModelName = "Upscaler"; // Default name for DB

    // Input mapping logic
    switch (modelId) {
      case "fal-ai/nano-banana-2/edit":
        friendlyModelName = "Deepshark Upscaler";
        const resolution = is4K ? "4K" : "2K";
        falInput = {
          prompt: "upscale image to high quality, masterpiece, 8k resolution",
          num_images: 1,
          aspect_ratio: "auto",
          output_format: "png",
          image_urls: [sourceImageUrl],
          resolution: resolution,
        };
        break;

      case "fal-ai/topaz/upscale/image":
        friendlyModelName = "Topaz Upscaler";
        falInput = {
          image_url: sourceImageUrl,
          model: "Standard V2",
          upscale_factor: requestedScale,
          output_format: "jpeg",
        };
        break;

      default:
        return NextResponse.json(
          { error: "Model logic not implemented" },
          { status: 500 },
        );
    }

    console.log(
      `🚀 Upscaling with: ${friendlyModelName} (${modelId}) | Cost: ${cost}`,
    );

    // 5. Generate (Wait for Fal to finish)
    const result: any = await fal.subscribe(modelId, {
      input: falInput,
      logs: true,
    });

    // 6. Extract Result URL
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url)
      remoteImageUrl = result.data.images[0].url;
    else if (result.data?.image?.url) remoteImageUrl = result.data.image.url;
    else if (result.data?.url) remoteImageUrl = result.data.url;

    if (!remoteImageUrl)
      throw new Error("Upscaling failed: No image returned.");

    // 7. ✅ FAST PATH: Save Fal URL & Deduct Credits Immediately
    const generationId = uuidv4();
    const promptText = `Upscale (${requestedScale}x)`;

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: promptText,
        model: friendlyModelName,
        imageUrl: remoteImageUrl, // Save Fal URL first (Fast!)
        fallbackUrl: remoteImageUrl, // Backup
        cost: cost,
        status: "completed",
      });
    });

    // 8. ✅ BACKGROUND TASK: Upload to R2 & Update DB
    // BACKGROUND TASK: Upload Upscaled Image to R2 (Key-Only Mode)
    (async () => {
      try {
        const res = await fetch(remoteImageUrl);
        if (!res.ok) return;

        const buffer = Buffer.from(await res.arrayBuffer());

        // 1. Define the Key (The exact path inside your R2 bucket)
        const fileKey = `users/${userId}/image/upscaler/${generationId}.png`;

        // 2. Upload to R2 (This returns JUST the fileKey string now)
        const savedKey = await uploadToR2(buffer, fileKey);

        // 3. Update DB with the KEY, never a full URL
        await db
          .update(imageGenerations)
          .set({ imageUrl: savedKey }) // 🌟 Store the key, not a URL
          .where(eq(imageGenerations.id, generationId));

        console.log("✅ Background Upscaler upload complete (Key Saved)");
      } catch (err) {
        console.error("Background Upload Error:", err);
      }
    })();

    // 9. Respond Immediately
    return NextResponse.json({
      success: true,
      imageUrl: remoteImageUrl,
      remainingCredits: (user.credits || 0) - cost,
    });
  } catch (error: any) {
    console.error("🚨 API Upscale Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Error" },
      { status: 500 },
    );
  }
}
