import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/auth";
import { db } from "@/app/db";
import { users, transactions } from "@/app/db/schema";
import { eq } from "drizzle-orm";

const COINS_PER_RUPEE = 0.6; // Configure your rate here

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amountINR } = await req.json();

    // 1. Verify Signature (Security Check)
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    // 2. Calculate Credits
    const creditsToAdd = Math.floor(amountINR * COINS_PER_RUPEE);

    // 3. Update User Database
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
    });

    if (user) {
        await db.update(users)
        .set({ credits: (user.credits || 0) + creditsToAdd })
        .where(eq(users.id, session.user.id));
    }

    // 4. Log Transaction
    await db.insert(transactions).values({
        userId: session.user.id,
        amount: amountINR,
        currency: "INR",
        credits: creditsToAdd,
        status: "completed",
        provider: "razorpay",
        providerTransactionId: razorpay_payment_id,
    });

    return NextResponse.json({ success: true, creditsAdded: creditsToAdd });

  } catch (error) {
    console.error("Razorpay Verify Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}