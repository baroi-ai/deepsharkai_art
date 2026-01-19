import { route } from "@fal-ai/server-proxy/nextjs";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "../../../db";
import { users, imageGenerations, transactions } from "../../../db/schema";
import { eq, sql } from "drizzle-orm";
import { MODEL_COSTS } from "@/lib/models"; 

export const POST = async (req: NextRequest) => {
  // 1. Auth Check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // 2. Identify Model & Cost
  const targetUrl = req.headers.get("x-fal-target-url");
  if (!targetUrl) return NextResponse.json({ message: "Missing header" }, { status: 400 });

  const modelId = Object.keys(MODEL_COSTS).find((id) => targetUrl.endsWith(id));
  const baseCost = modelId ? MODEL_COSTS[modelId] : 0;
  
  // Default to 1 image cost
  const totalCost = baseCost;

  // 3. 💰 DEDUCT COINS (Reservation)
  try {
    if (totalCost > 0) {
        await db.transaction(async (tx) => {
          const [user] = await tx
            .select({ credits: users.credits })
            .from(users)
            .where(eq(users.id, session.user.id!));

          if (!user) throw new Error("User_Not_Found");
          if ((user.credits || 0) < totalCost) throw new Error("Insufficient_Coins");

          // Deduct
          await tx
            .update(users)
            .set({ 
              credits: sql`${users.credits} - ${totalCost}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, session.user.id!));
        });
    }
  } catch (error: any) {
    if (error.message === "Insufficient_Coins") {
      return NextResponse.json({ error: "Insufficient coins" }, { status: 402 });
    }
    return NextResponse.json({ message: "Transaction failed" }, { status: 500 });
  }

  // 4. 🚀 CALL FAL.AI
  // We capture the response so we can check if it succeeded
  const falResponse = await route.POST(req);

  // 5. ↩️ REFUND IF FAILED (The Fix)
  // If Fal says 403 (Forbidden), 500 (Server Error), or 400 (Bad Request)
  if (!falResponse.ok) {
    console.error(`Fal API Failed: ${falResponse.status}. Refunding user...`);
    
    if (totalCost > 0) {
      try {
        await db.transaction(async (tx) => {
          // Refund the credits back
          await tx
            .update(users)
            .set({ 
              credits: sql`${users.credits} + ${totalCost}`, // ➕ Add back
              updatedAt: new Date()
            })
            .where(eq(users.id, session.user.id!));

          // Optional: Record the refund in transactions for history
          await tx.insert(transactions).values({
            userId: session.user.id!,
            amount: totalCost,
            credits: totalCost,
            currency: "coin",
            status: "refund",
            provider: "system",
            providerTransactionId: `refund-fal-${falResponse.status}`
          });
        });
        console.log("✅ Refund successful");
      } catch (refundError) {
        console.error("CRITICAL: Failed to refund user", refundError);
      }
    }
  } else {
    // ✅ SUCCESS: Only log the generation if Fal accepted the request
    // We do this asynchronously so we don't slow down the image stream
    (async () => {
        try {
            await db.insert(imageGenerations).values({
                userId: session.user.id!,
                prompt: "Image Generation", // We can't easily read body here without breaking stream
                model: modelId || "unknown",
                cost: totalCost,
                status: "processing", 
            });
        } catch (e) { console.error("Failed to log generation:", e); }
    })();
  }

  // 6. Return the original Fal response to the frontend
  return falResponse;
};

export const GET = route.GET;