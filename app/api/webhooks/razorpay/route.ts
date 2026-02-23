import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "../../../db";
import { users, subscriptions, transactions } from "../../../db/schema";
import { eq, sql } from "drizzle-orm"; // ✅ Add sql here

const PLAN_CREDITS: Record<string, number> = {
  starter: 400,
  pro: 1500,
  elite: 4200,
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const { payload } = event;

    // ==========================================
    // 🟢 SCENARIO 1: ONE-TIME TOP-UP (Pay as you go)
    // ==========================================
    if (event.event === "order.paid") {
      const paymentEntity = payload.payment.entity;

      // ✅ We extract the custom notes we sent from the frontend when creating the order
      const userId = paymentEntity.notes?.userId;
      const coinAmount = Number(paymentEntity.notes?.coins);
      const amountPaidINR = paymentEntity.amount / 100;

      if (userId && coinAmount > 0) {
        // 1. Give the user their coins atomically
        await db
          .update(users)
          .set({ credits: sql`${users.credits} + ${coinAmount}` })
          .where(eq(users.id, userId));

        // 2. Log the transaction for their history page
        await db.insert(transactions).values({
          userId: userId,
          amount: amountPaidINR,
          currency: "INR",
          credits: coinAmount,
          status: "completed",
          provider: "razorpay_topup",
          providerTransactionId: paymentEntity.id,
        });

        console.log(
          `✅ TOP-UP SUCCESS: Added ${coinAmount} coins to User ${userId}`,
        );
      }
      return NextResponse.json({ status: "ok" });
    }

    // ==========================================
    // 🔵 SCENARIO 2: SUBSCRIPTIONS
    // ==========================================
    if (
      event.event === "subscription.charged" ||
      event.event === "subscription.activated"
    ) {
      const subData = payload.subscription.entity;
      const paymentData = payload.payment?.entity;
      const userId = subData.notes.userId;
      const planId = subData.notes.planInternalId;
      const amount = paymentData ? paymentData.amount / 100 : 0;

      if (!userId || !planId) return NextResponse.json({ status: "ignored" });

      // 1. ADD CREDITS (Only on 'charged' event to prevent double crediting)
      if (event.event === "subscription.charged") {
        const creditsToAdd = PLAN_CREDITS[planId] || 0;
        console.log(`💰 Adding ${creditsToAdd} credits for User ${userId}`);

        await db
          .update(users)
          .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
          .where(eq(users.id, userId));

        // Log Transaction
        const txnId = paymentData?.id || `sub_${subData.id}_${Date.now()}`;
        const existingTxn = await db.query.transactions.findFirst({
          where: eq(transactions.providerTransactionId, txnId),
        });

        if (!existingTxn) {
          await db.insert(transactions).values({
            userId: userId,
            amount: amount,
            currency: "INR",
            credits: creditsToAdd,
            status: "completed",
            provider: "razorpay_subscription",
            providerTransactionId: txnId,
          });
        }
      }

      // 2. UPDATE/INSERT SUBSCRIPTION (Atomic Upsert)
      await db
        .insert(subscriptions)
        .values({
          userId: userId,
          planId: planId,
          provider: "razorpay",
          subscriptionId: subData.id,
          status: subData.status,
          currentPeriodStart: new Date(subData.current_start * 1000),
          currentPeriodEnd: new Date(subData.current_end * 1000),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptions.subscriptionId,
          set: {
            status: subData.status,
            currentPeriodStart: new Date(subData.current_start * 1000),
            currentPeriodEnd: new Date(subData.current_end * 1000),
            updatedAt: new Date(),
          },
        });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
