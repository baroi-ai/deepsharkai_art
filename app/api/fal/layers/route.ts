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

    const modelId = "fal-ai/qwen-image-layered";

    // Calculate cost: 2 coins per layer
    const numLayers = Number(input.num_layers) || 4;
    const totalCost = numLayers * 5;

    // 2. Check Credits
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

    // 3. Prepare Input
    const sourceImageUrl = input.image_url;
    if (!sourceImageUrl) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    console.log(`🧩 Decomposing with: ${modelId} (${numLayers} layers)`);

    // 4. Generate (Wait for Fal to process)
    const result: any = await fal.subscribe(modelId, {
      input: {
        image_url: sourceImageUrl,
        num_layers: numLayers,
        prompt: input.prompt || "decompose image layers",
        output_format: "png", // PNG supports transparency (crucial for layers)
      },
      logs: true,
    });

    // 5. Extract Result URLs
    if (!result.data?.images || result.data.images.length === 0) {
      throw new Error("Decomposition failed: No layers returned.");
    }

    // Array of strings (Fal URLs)
    const layerRemoteUrls: string[] = result.data.images.map(
      (img: any) => img.url,
    );

    // 6. ✅ FAST PATH: Save Fal URLs as 'fallbackUrl' & Deduct Credits
    // We create a unique Group ID to link these layers together in the future if needed
    const groupId = uuidv4();

    await db.transaction(async (tx: any) => {
      // Deduct Credits ONCE
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${totalCost}` })
        .where(eq(users.id, userId));

      // Insert a row for EACH layer
      for (let i = 0; i < layerRemoteUrls.length; i++) {
        await tx.insert(imageGenerations).values({
          id: `${groupId}-${i}`, // Unique ID for each layer
          userId: userId,
          prompt: `Layer ${i + 1}/${layerRemoteUrls.length} (Decomposed)`,
          model: "Deepshark Decompose",
          //model: modelId,
          imageUrl: layerRemoteUrls[i], // 1. Main URL (Fal initially)
          fallbackUrl: layerRemoteUrls[i], // 2. ✅ Backup URL
          cost: i === 0 ? totalCost : 0, // Attribute cost to first image only
          status: "completed",
        });
      }
    });

    // 7. ✅ BACKGROUND TASK: Upload ALL Layers to R2
    (async () => {
      try {
        console.log(
          `Started background upload for ${layerRemoteUrls.length} layers...`,
        );

        // Map over urls and upload them in parallel
        await Promise.all(
          layerRemoteUrls.map(async (remoteUrl, index) => {
            const res = await fetch(remoteUrl);
            if (!res.ok) return;

            const buffer = Buffer.from(await res.arrayBuffer());
            // Organized path: users/{id}/decomposed/{groupId}/layer-X.png
            const filename = `users/${userId}/image/decomposed/${groupId}/layer-${
              index + 1
            }.png`;

            // Upload to R2
            const r2Url = await uploadToR2(buffer, filename);

            // Update DB with permanent R2 URL
            await db
              .update(imageGenerations)
              .set({ imageUrl: r2Url })
              .where(eq(imageGenerations.id, `${groupId}-${index}`));
          }),
        );

        console.log("✅ Background Decomposition upload complete");
      } catch (err) {
        console.error("Background Upload Error:", err);
      }
    })();

    return NextResponse.json({
      success: true,
      layers: layerRemoteUrls, // Send Fal URLs immediately
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
