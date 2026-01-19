import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db"; 
import { users, imageGenerations } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { fal } from "@fal-ai/client";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configure Fal
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.id;
    const { input } = await req.json();

    // --- CONFIGURATION ---
    // Using Qwen Image Edit Plus with Angle LoRA
    const targetModelId = "fal-ai/qwen-image-edit-plus-lora-gallery/multiple-angles";
    const cost = 2; 

    // 1. Check Credits
    const [user] = await db.select({ credits: users.credits }).from(users).where(eq(users.id, userId));
    if (!user || (user.credits || 0) < cost) {
      return NextResponse.json({ error: "Insufficient coins", code: "INSUFFICIENT_CREDITS" }, { status: 402 });
    }

    // 2. Prepare Payload & Math Conversions
    // Frontend sends: Pitch (-90 to 90), Yaw (-180 to 180), Zoom (0 to 100)
    // Model expects: Vertical (-1 to 1), Rotate (deg), Move (0 to 10)
    
    const rotateVal = input.yaw || 0; 
    const verticalVal = (input.pitch || 0) / 90; // Convert to -1..1 range
    const moveVal = (input.zoom || 0) / 10;      // Convert to 0..10 range

    const falInput = {
        image_urls: [input.image_url], // Model requires array
        prompt: "change camera angle", // Required prompt
        rotate_right_left: rotateVal,
        vertical_angle: verticalVal,
        move_forward: moveVal,
        num_inference_steps: 28,
        guidance_scale: 3.5,
    };

    console.log(`Generating Angle Change: Rotate ${rotateVal}, Vertical ${verticalVal}, Move ${moveVal}`);

    // 3. Generate
    const result: any = await fal.subscribe(targetModelId, {
      input: falInput,
      logs: true,
    });

    // 4. Handle Result & Save
    let remoteImageUrl = "";
    if (result.data?.images?.[0]?.url) {
        remoteImageUrl = result.data.images[0].url;
    } else if (result.data?.image?.url) {
        remoteImageUrl = result.data.image.url;
    } else {
        throw new Error("No image returned from API");
    }

    const imageResponse = await fetch(remoteImageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());
    const filename = `${uuidv4()}.png`;
    const savePath = path.join(process.cwd(), "public", "generations", filename);
    
    await writeFile(savePath, buffer);
    const localUrl = `/generations/${filename}`;

    // 5. Deduct Credits
    await db.transaction(async (tx: any) => {
      await tx.update(users).set({ credits: sql`${users.credits} - ${cost}` }).where(eq(users.id, userId));
      await tx.insert(imageGenerations).values({
        userId, 
        prompt: `Angle: Y${rotateVal} P${verticalVal} Z${moveVal}`, 
        model: "qwen-angle", 
        imageUrl: localUrl, 
        cost, 
        status: "completed"
      });
    });

    return NextResponse.json({ success: true, imageUrl: localUrl, remainingCredits: (user.credits || 0) - cost });

  } catch (error: any) {
    console.error("API Angle Error:", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}