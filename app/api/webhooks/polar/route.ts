import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { users, subscriptions, transactions } from "@/app/db/schema";
import { eq, sql } from "drizzle-orm";
import { validateEvent } from "@polar-sh/sdk/webhooks";

// ✅ Monthly credits
const PLAN_CREDITS: Record<string, number> = {
  starter: 400,
  pro: 1500,
  elite: 4200,
  // ✅ Yearly credits (upfront, all at once)
  starter_yearly: 4800,
  pro_yearly: 18000,
  elite_yearly: 50400,
};

export async function POST(req: Request) {
  const body = await req.text();
  const headers: Record<string, string> = {
    "webhook-id": req.headers.get("webhook-id") || "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") || "",
    "webhook-signature": req.headers.get("webhook-signature") || "",
  };

  let event;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("❌ Polar Webhook: Signature validation failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "order.created") {
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const order = event.data as any;
  const metadata = order.metadata || {};
  const userId = metadata.userId as string;
  const purchaseType = metadata.purchaseType;

  if (!userId) return NextResponse.json({ status: "no_user" }, { status: 200 });

  try {
    // 🛡️ IDEMPOTENCY
    const alreadyProcessed = await db.query.transactions.findFirst({
      where: eq(transactions.providerTransactionId, order.id),
    });

    if (alreadyProcessed) {
      console.log(`ℹ️ Order ${order.id} already processed.`);
      return NextResponse.json({ status: "already_done" }, { status: 200 });
    }

    const rawAmount =
      order.totalAmount ?? order.amount ?? Number(metadata.amountCents ?? 0);
    const paidAmountDollars = Number(rawAmount) / 100;

    console.log(
      `💰 Raw amount from Polar: ${rawAmount} → $${paidAmountDollars}`,
    );

    // 🟢 TOP-UP LOGIC
    if (purchaseType === "one_time_credits") {
      const coinAmount = Number(metadata.coins) || 0;

      await db
        .update(users)
        .set({ credits: sql`${users.credits} + ${coinAmount}` })
        .where(eq(users.id, userId));

      await db.insert(transactions).values({
        userId,
        amount: paidAmountDollars,
        currency: order.currency?.toLowerCase() || "usd",
        credits: coinAmount,
        status: "completed",
        provider: "polar_topup",
        providerTransactionId: order.id,
      });

      console.log(
        `✅ Added ${coinAmount} coins ($${paidAmountDollars}) to ${userId}`,
      );
    }

    // 🔵 SUBSCRIPTION LOGIC (monthly + yearly)
    if (purchaseType === "subscription") {
      const planId = metadata.planId as string;
      const creditsToAdd = PLAN_CREDITS[planId] || 0;
      const isYearly = planId.includes("_yearly");

      await db
        .update(users)
        .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
        .where(eq(users.id, userId));

      // ✅ Period end: 1 year for yearly plans, 30 days for monthly
      const periodEnd = new Date();
      if (isYearly) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setDate(periodEnd.getDate() + 30);
      }

      const subId = order.subscriptionId || order.subscription_id;

      await db
        .insert(subscriptions)
        .values({
          userId,
          planId,
          provider: "polar",
          subscriptionId: subId,
          status: "active",
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
        })
        .onConflictDoUpdate({
          target: subscriptions.subscriptionId,
          set: { status: "active", currentPeriodEnd: periodEnd },
        });

      await db.insert(transactions).values({
        userId,
        amount: paidAmountDollars,
        currency: order.currency?.toLowerCase() || "usd",
        credits: creditsToAdd,
        status: "completed",
        provider: "polar_subscription",
        providerTransactionId: order.id,
      });

      console.log(
        `✅ ${isYearly ? "Yearly" : "Monthly"} subscription ${planId} activated for ${userId} — ${creditsToAdd} credits, renews ${periodEnd.toISOString()}`,
      );
    }

    return NextResponse.json({ status: "success" });
  } catch (err) {
    console.error("❌ DB Error during Webhook:", err);
    return NextResponse.json({ error: "database_error" }, { status: 500 });
  }
}
