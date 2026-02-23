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
    // ✅ SWITCH TO NANO BANANA PRO (Smart Editing)
    const targetModelId = "fal-ai/nano-banana-pro/edit";
    const cost = 15;

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

    console.log(`🎨 Editing with: ${targetModelId} | Mask: ${hasMask}`);

    // 5. Construct Payload
    const imageList = [input.image_url];
    let finalPrompt = input.prompt;

    if (hasMask) {
      imageList.push(input.mask_url);
      finalPrompt = `${input.prompt}. Use the second image as a masking guide for the edit area.`;
    }

    const falInput: any = {
      prompt: finalPrompt,
      image_urls: imageList,
      output_format: "jpeg", // JPEGs are smaller/faster for R2
      resolution: "1K",
      limit_generations: true,
    };

    // 6. Generate (Wait for Fal)
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

    // 8. ✅ FAST PATH: Deduct Credits & Save Fallback Immediately
    const generationId = uuidv4();

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: input.prompt,
        model: "Deepshark inpaint",
        imageUrl: remoteImageUrl, // 1. Main URL (Fal initially)
        fallbackUrl: remoteImageUrl, // 2. ✅ Backup URL (Fal permanently)
        cost: cost,
        status: "completed",
      });
    });

    // 9. ✅ BACKGROUND TASK: Upload to R2 & Update Main URL
    (async () => {
      try {
        const res = await fetch(remoteImageUrl);
        if (!res.ok) return;

        const buffer = Buffer.from(await res.arrayBuffer());
        const filename = `users/${userId}/image/edits/${generationId}.jpg`; // Organized structure

        // Upload to R2
        const r2Url = await uploadToR2(buffer, filename);

        // Update DB with permanent R2 URL (keeping fallbackUrl safe)
        await db
          .update(imageGenerations)
          .set({ imageUrl: r2Url })
          .where(eq(imageGenerations.id, generationId));

        console.log("✅ Background Edit upload complete");
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
