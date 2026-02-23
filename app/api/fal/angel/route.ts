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
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { input } = await req.json();

    // --- CONFIGURATION ---
    const targetModelId =
      "fal-ai/qwen-image-edit-plus-lora-gallery/multiple-angles";
    const cost = 4;

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

    // 3. Prepare Payload
    // Frontend sends: Pitch (-1 to 1), Yaw (-90 to 90), Zoom (0 to 10)
    const rotateVal = input.yaw || 0;
    // Fix: Pitch is already -1 to 1 from frontend, passing directly usually works better for this LoRA
    const verticalVal = input.pitch || 0;
    const moveVal = (input.zoom || 0) / 10; // Normalize if needed, or pass directly depending on LoRA strength

    const falInput = {
      image_urls: [input.image_url],
      prompt: "change camera angle",
      rotate_right_left: rotateVal,
      vertical_angle: verticalVal,
      move_forward: moveVal,
      num_inference_steps: 28,
      guidance_scale: 3.5,
    };

    console.log(`Generating Angle: Y${rotateVal} P${verticalVal} Z${moveVal}`);

    // 4. Generate (Wait for Fal)
    const result: any = await fal.subscribe(targetModelId, {
      input: falInput,
      logs: true,
    });

    // 5. Extract Result URL
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url) {
      remoteImageUrl = result.data.images[0].url;
    } else if (result.data?.image?.url) {
      remoteImageUrl = result.data.image.url;
    } else {
      throw new Error("No image returned from API");
    }

    // 6. ✅ FAST PATH: Save Fal URL & Deduct Credits Immediately
    const generationId = uuidv4();
    const promptSummary = `Angle: Y${rotateVal} P${verticalVal} Z${moveVal}`;

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: promptSummary,
        model: "Deepshark Angle",
        imageUrl: remoteImageUrl, // 1. Main URL (Fal initially)
        fallbackUrl: remoteImageUrl, // 2. ✅ Backup URL (Fal permanently)
        cost: cost,
        status: "completed",
      });
    });

    // 7. ✅ BACKGROUND TASK: Upload to R2 & Update Main URL
    (async () => {
      try {
        const res = await fetch(remoteImageUrl);
        if (!res.ok) return;

        const buffer = Buffer.from(await res.arrayBuffer());
        // Organized Folder Structure
        const filename = `users/${userId}/image/angel/${generationId}.png`;

        // Upload to R2
        const r2Url = await uploadToR2(buffer, filename);

        // Update DB with permanent R2 URL
        await db
          .update(imageGenerations)
          .set({ imageUrl: r2Url })
          .where(eq(imageGenerations.id, generationId));

        console.log("✅ Background Angle upload complete");
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
    console.error("API Angle Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Error" },
      { status: 500 },
    );
  }
}
