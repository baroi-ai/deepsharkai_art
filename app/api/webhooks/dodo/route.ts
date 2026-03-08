import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { users, subscriptions, transactions } from "@/app/db/schema";
import { eq, sql } from "drizzle-orm";
import DodoPayments from "dodopayments";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  webhookKey: process.env.DODO_WEBHOOK_SECRET,
  environment:
    process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

const PLAN_CREDITS: Record<string, number> = {
  starter: 400,
  pro: 1500,
  elite: 4200,
};

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!process.env.DODO_WEBHOOK_SECRET) {
      console.error("❌ Missing DODO_WEBHOOK_SECRET");
      return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }

    const headers = {
      "webhook-id": req.headers.get("webhook-id") || "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
      "webhook-signature": req.headers.get("webhook-signature") || "",
    };

    let event: any;
    try {
      event = await dodo.webhooks.unwrap(rawBody, { headers });
    } catch (err: any) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const eventType = event.type || event.event_type;
    const data: any = event.data || event;

    // =========================================================
    // 🟢 SCENARIO 1 & 2: A PAYMENT WAS SUCCESSFULLY CAPTURED
    // =========================================================
    if (eventType === "payment.succeeded") {
      const metadata = data.metadata || {};
      const userId = metadata.userId;
      const purchaseType = metadata.purchaseType; // 'one_time_credits' or 'subscription'

      if (!userId) return NextResponse.json({ status: "ignored" });

      // 🟢 ONE-TIME TOP-UP
      if (purchaseType === "one_time_credits") {
        const coinAmount = Number(metadata.coins) || 0;
        const totalPaid = data.total_amount / 100;

        const existingTxn = await db.query.transactions.findFirst({
          where: eq(transactions.providerTransactionId, data.payment_id),
        });

        if (!existingTxn && coinAmount > 0) {
          // 1. Give Coins
          await db
            .update(users)
            .set({ credits: sql`${users.credits} + ${coinAmount}` })
            .where(eq(users.id, userId));

          // 2. Log Transaction
          await db.insert(transactions).values({
            userId: userId,
            amount: totalPaid,
            currency: data.currency,
            credits: coinAmount,
            status: "completed",
            provider: "dodo_topup",
            providerTransactionId: data.payment_id,
          });
          console.log(
            `✅ TOP-UP SUCCESS: Added ${coinAmount} coins to User ${userId}`,
          );
        }
      }

      // 🔵 RECURRING SUBSCRIPTION (Initial + Renewals)
      if (purchaseType === "subscription") {
        const planId = metadata.planId;
        const creditsToAdd = PLAN_CREDITS[planId] || 0;
        const totalPaid = data.total_amount / 100;

        // Prevent double processing
        const existingTxn = await db.query.transactions.findFirst({
          where: eq(transactions.providerTransactionId, data.payment_id),
        });

        if (!existingTxn && creditsToAdd > 0) {
          // 1. Give Monthly Coins
          await db
            .update(users)
            .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
            .where(eq(users.id, userId));

          // 2. Log Monthly Transaction
          await db.insert(transactions).values({
            userId: userId,
            amount: totalPaid,
            currency: data.currency,
            credits: creditsToAdd,
            status: "completed",
            provider: "dodo_subscription",
            providerTransactionId: data.payment_id,
          });

          // 3. UPDATE THE SUBSCRIPTIONS TABLE
          const now = new Date();
          const nextMonth = new Date();
          nextMonth.setDate(now.getDate() + 30); // Add 30 days for renewal date

          // Dodo attaches the subscription_id to recurring payments
          const dodoSubId = data.subscription_id || `dodo_${data.payment_id}`;

          await db
            .insert(subscriptions)
            .values({
              userId: userId,
              planId: planId,
              provider: "dodo",
              subscriptionId: dodoSubId,
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: nextMonth,
            })
            .onConflictDoUpdate({
              target: subscriptions.subscriptionId, // Match by the unique sub ID
              set: {
                status: "active",
                currentPeriodEnd: nextMonth, // Push the renewal date out by another month
                updatedAt: now,
              },
            });

          console.log(
            `✅ SUB SUCCESS: Plan ${planId} active for User ${userId}`,
          );
        }
      }
    }

    // =========================================================
    // 🔴 SCENARIO 3: USER CANCELS THEIR SUBSCRIPTION
    // =========================================================
    if (eventType === "subscription.canceled") {
      const dodoSubId = data.subscription_id;
      if (dodoSubId) {
        await db
          .update(subscriptions)
          .set({ status: "canceled", updatedAt: new Date() })
          .where(eq(subscriptions.subscriptionId, dodoSubId));

        console.log(
          `🛑 SUB CANCELED: Subscription ${dodoSubId} marked as canceled.`,
        );
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Webhook Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
