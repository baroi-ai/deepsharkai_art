import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db";
import { users, imageGenerations } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { fal } from "@fal-ai/client";
import { v4 as uuidv4 } from "uuid";
import { getModelCost } from "@/lib/models";
import { uploadToR2 } from "@/lib/r2";

// Configure Fal
fal.config({
  credentials: process.env.FAL_KEY,
});

const ALLOWED_MODELS = new Set([
  "fal-ai/flux-2/klein/9b",
  "fal-ai/nano-banana-pro",
  "fal-ai/gpt-image-1.5",
  "fal-ai/z-image/turbo",
  "fal-ai/minimax/image-01",
  "fal-ai/bytedance/seedream/v4.5/text-to-image",
  "fal-ai/ideogram/v3",
  "fal-ai/recraft/v3/text-to-image",
  "fal-ai/luma-photon",
  "fal-ai/flux-2/klein/9b/edit",
  "fal-ai/nano-banana-pro/edit",
]);

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { modelId, input } = await req.json();

    // 2. Validate
    const isAllowed = Array.from(ALLOWED_MODELS).some((m) =>
      modelId.startsWith(m),
    );
    if (!isAllowed)
      return NextResponse.json({ error: "Invalid Model ID" }, { status: 400 });

    // 3. Cost
    const numImages = Number(input.num_images) || 1;
    const baseCost = getModelCost(modelId) || 4;
    const totalCost = baseCost * numImages;

    // 4. Check Credits
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

    console.log(`🎨 Generating with: ${modelId} (Cost: ${totalCost})`);

    // 5. Generate (Wait for Fal)
    const result: any = await fal.subscribe(modelId, {
      input: input,
      logs: true,
    });

    // 6. Extract Fal URLs
    let imageUrls: string[] = [];
    if (result.data?.images)
      imageUrls = result.data.images.map((img: any) => img.url);
    else if (result.data?.image?.url) imageUrls = [result.data.image.url];
    else if (result.data?.url) imageUrls = [result.data.url];

    if (imageUrls.length === 0)
      throw new Error("Generation failed: No images returned.");

    // 7. DB Transaction
    const imageRecords = imageUrls.map((url) => ({
      id: uuidv4(),
      falUrl: url,
    }));

    // ✅ Clean the Model Name (Remove "fal-ai/" prefix)
    // Example: "fal-ai/flux-2/klein/9b" -> "flux-2/klein/9b"
    const cleanModelName = modelId.replace("fal-ai/", "");

    await db.transaction(async (tx: any) => {
      // Deduct
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${totalCost}` })
        .where(eq(users.id, userId));

      // Insert
      for (const record of imageRecords) {
        await tx.insert(imageGenerations).values({
          id: record.id,
          userId: userId,
          prompt: input.prompt || "Image Generation",
          model: cleanModelName, // ✅ Saved without "fal-ai/"
          imageUrl: record.falUrl,
          fallbackUrl: record.falUrl,
          cost: Math.ceil(totalCost / imageRecords.length),
          status: "completed",
        });
      }
    });

    // 8. Background Upload
    (async () => {
      try {
        await Promise.all(
          imageRecords.map(async (record) => {
            const res = await fetch(record.falUrl);
            if (!res.ok) return;

            const buffer = Buffer.from(await res.arrayBuffer());
            const filename = `users/${userId}/image/generator/${record.id}.png`;

            const r2Url = await uploadToR2(buffer, filename);

            await db
              .update(imageGenerations)
              .set({ imageUrl: r2Url })
              .where(eq(imageGenerations.id, record.id));
          }),
        );
        console.log("✅ Background R2 upload complete");
      } catch (err) {
        console.error("Background Upload Error:", err);
      }
    })();

    // 9. Respond
    return NextResponse.json({
      success: true,
      imageUrls: imageUrls,
      remainingCredits: (user.credits || 0) - totalCost,
    });
  } catch (error: any) {
    console.error("🚨 API Gen Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Error" },
      { status: 500 },
    );
  }
}
