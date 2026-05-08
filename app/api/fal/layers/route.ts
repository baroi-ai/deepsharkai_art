import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db";
import { users, imageGenerations } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { fal } from "@fal-ai/client";
import { v4 as uuidv4 } from "uuid";
import { uploadToR2 } from "@/lib/r2";

fal.config({
  credentials: process.env.FAL_KEY,
});

/** Convert a base64 data URL to a Buffer + mime type */
function dataURLtoBuffer(dataUrl: string): {
  buffer: Buffer;
  mimeType: string;
} {
  const [header, base64Data] = dataUrl.split(",");
  const mimeType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  return { buffer: Buffer.from(base64Data, "base64"), mimeType };
}

export async function POST(req: Request) {
  try {
    // 1. Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { input } = await req.json();

    const modelId = "fal-ai/qwen-image-layered";
    const numLayers = Number(input.num_layers) || 4;
    const totalCost = numLayers * 5;

    // 2. Check credits
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));

    if (!user || (user.credits || 0) < totalCost) {
      return NextResponse.json(
        { error: "Insufficient coins", code: "INSUFFICIENT_CREDITS" },
        { status: 402 },
      );
    }

    const sourceImageUrl: string = input.image_url;
    if (!sourceImageUrl) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 3. If the client sent a base64 data URL, upload it to Fal storage
    //    server-side (where the real FAL_KEY is available) so Fal gets
    //    a proper HTTPS URL — base64 blobs cause silent timeouts in fal.subscribe
    let falImageUrl: string;

    if (sourceImageUrl.startsWith("data:")) {
      console.log("📤 Converting base64 → Fal storage URL…");
      const { buffer, mimeType } = dataURLtoBuffer(sourceImageUrl);
      const ext = mimeType.split("/")[1] ?? "jpg";
      const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
      const file = new File([blob], `upload.${ext}`, { type: mimeType });
      falImageUrl = await fal.storage.upload(file);
      console.log("✅ Uploaded to Fal storage:", falImageUrl);
    } else {
      // Already a real URL (e.g. from a previous R2 upload)
      falImageUrl = sourceImageUrl;
    }

    console.log(`🧩 Decomposing: ${modelId} | layers: ${numLayers}`);

    // 4. Call Fal with a real URL
    const result: any = await fal.subscribe(modelId, {
      input: {
        image_url: falImageUrl,
        num_layers: numLayers,
        prompt: input.prompt || "decompose image layers",
        output_format: "png",
      },
      logs: true,
    });

    // 5. Extract result URLs
    if (!result.data?.images || result.data.images.length === 0) {
      throw new Error("Decomposition failed: No layers returned.");
    }

    const layerRemoteUrls: string[] = result.data.images.map(
      (img: any) => img.url,
    );

    // 6. Fast path: deduct credits + save to DB
    const groupId = uuidv4();

    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${totalCost}` })
        .where(eq(users.id, userId));

      for (let i = 0; i < layerRemoteUrls.length; i++) {
        await tx.insert(imageGenerations).values({
          id: `${groupId}-${i}`,
          userId,
          prompt: `Layer ${i + 1}/${layerRemoteUrls.length} (Decomposed)`,
          model: "Deepshark Decompose",
          imageUrl: layerRemoteUrls[i],
          fallbackUrl: layerRemoteUrls[i],
          cost: i === 0 ? totalCost : 0,
          status: "completed",
        });
      }
    });

    // 7. Background: upload all layers to R2
    (async () => {
      try {
        console.log(
          `⬆️ Background R2 upload for ${layerRemoteUrls.length} layers…`,
        );
        await Promise.all(
          layerRemoteUrls.map(async (remoteUrl, index) => {
            const res = await fetch(remoteUrl);
            if (!res.ok) return;

            const buffer = Buffer.from(await res.arrayBuffer());

            // 1. Define the Key (The exact path inside your R2 bucket)
            const fileKey = `users/${userId}/image/decomposed/${groupId}/layer-${index + 1}.png`;

            // 2. Upload to R2 (This returns JUST the fileKey string now)
            const savedKey = await uploadToR2(buffer, fileKey);

            // 3. Update DB with the KEY, never a full URL
            await db
              .update(imageGenerations)
              .set({ imageUrl: savedKey }) // 🌟 Store the key, not a URL
              .where(eq(imageGenerations.id, `${groupId}-${index}`));
          }),
        );
        console.log("✅ Background R2 upload complete (Keys Saved)");
      } catch (err) {
        console.error("Background Upload Error:", err);
      }
    })();

    return NextResponse.json({
      success: true,
      layers: layerRemoteUrls,
      remainingCredits: (user.credits || 0) - totalCost,
    });
  } catch (error: any) {
    console.error("🚨 Decompose Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
