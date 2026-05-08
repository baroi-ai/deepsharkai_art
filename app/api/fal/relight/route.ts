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
    const cost = 10;

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
    const sourceImageUrl = input.image_url;
    if (!sourceImageUrl) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // 4. THE PROMPT ENGINEER: Translate UI to Nano Banana 2
    let promptInstruction = "";
    let logMessage = "";

    if (input.mode === "reference" && input.reference_image_url) {
      // Reference Mode (Nano Banana 2 edit handles multiple images natively)
      promptInstruction = `Apply the exact lighting style, color palette, and mood from the reference image. Preserve the original subject's exact facial identity, clothing, and background structure.`;
      logMessage = `Deep Relight: Reference Mode`;
    } else {
      // Manual Mode (Translating Sliders)
      let horizontal = "center";
      if (input.light_x < -30) horizontal = "left";
      if (input.light_x > 30) horizontal = "right";

      let vertical = "";
      if (input.light_y < -30) vertical = "top ";
      if (input.light_y > 30) vertical = "bottom ";

      const direction = `${vertical}${horizontal}`.trim();
      const colorText = input.light_color ? `colored ${input.light_color} ` : "";
      
      let intensityText = "soft, subtle";
      if (input.intensity > 70) intensityText = "dramatic, high contrast, strong";
      if (input.intensity < 30) intensityText = "very faint, minimal";

      let bgDimText = "";
      if (input.ambient_dim > 60) bgDimText = "dim the background, dark ambient shadows, moody atmosphere, ";

      // The Ironclad Identity Prompt for Natural Language Editing
      promptInstruction = `raw photo, identical subject, exact same face, same clothing, same background. ${bgDimText}Apply a ${intensityText} studio light source coming from the ${direction}. The light must be ${colorText}and cast realistic shadows on the subject.`;
      
      logMessage = `Deep Relight: ${direction} (${input.light_color})`;
    }

    console.log(`✨ ${logMessage}`);

    // 5. Build Nano Banana 2 Payload
    const targetModelId = "fal-ai/nano-banana-2/edit"; 
    
    let falInput: any = {
      prompt: promptInstruction,
      image_urls: [sourceImageUrl],
      aspect_ratio: "auto"
    };

    // Inject the reference image into the array if it exists
    if (input.mode === "reference" && input.reference_image_url) {
      falInput.image_urls.push(input.reference_image_url);
    }

    // 6. Generate (Wait for Fal)
    const result: any = await fal.subscribe(targetModelId, {
      input: falInput,
      logs: true,
    });

    // 7. Extract Result URL Robustly
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url) {
      remoteImageUrl = result.data.images[0].url;
    } else if (result.data?.image?.url) {
      remoteImageUrl = result.data.image.url;
    } else if (result.data?.url) {
      remoteImageUrl = result.data.url;
    }

    if (!remoteImageUrl) {
      throw new Error("Relight failed: Provider returned no image URL.");
    }

    const generationId = uuidv4();

    // 8. Deduct Credits & Save to DB
    await db.transaction(async (tx: any) => {
      await tx
        .update(users)
        .set({ credits: sql`${users.credits} - ${cost}` })
        .where(eq(users.id, userId));

      await tx.insert(imageGenerations).values({
        id: generationId,
        userId: userId,
        prompt: logMessage,
        model: "Deep Relight",
        imageUrl: remoteImageUrl,
        fallbackUrl: remoteImageUrl,
        cost: cost,
        status: "completed",
      });
    });

    // 9. BACKGROUND TASK: Upload to R2
    (async () => {
      try {
        const res = await fetch(remoteImageUrl);
        if (!res.ok) return;

        const buffer = Buffer.from(await res.arrayBuffer());
        const fileKey = `users/${userId}/image/relight/${generationId}.jpg`;
        const savedKey = await uploadToR2(buffer, fileKey);

        await db
          .update(imageGenerations)
          .set({ imageUrl: savedKey }) 
          .where(eq(imageGenerations.id, generationId));

        console.log("✅ Background Relight upload complete (Key Saved)");
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
    console.error("🚨 Relight Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}