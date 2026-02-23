import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/app/db";
import { subscriptions, users, transactions } from "@/app/db/schema";
import { generateAccessToken } from "@/lib/paypal";
import { eq, and, sql } from "drizzle-orm";

const PAYPAL_API = process.env.PAYPAL_API_URL;

// ✅ Define your plan credits for the initial payout
const PLAN_CREDITS: Record<string, number> = {
  starter: 400,
  pro: 1500,
  elite: 4200,
};

// ✅ FIX: Define the plan prices so the transaction history logs the exact USD amount!
const PLAN_PRICES: Record<string, number> = {
  starter: 9,
  pro: 29,
  elite: 79,
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subscriptionID, planId } = await req.json();

    if (!subscriptionID) {
      return NextResponse.json(
        { error: "Missing Subscription ID" },
        { status: 400 },
      );
    }

    const accessToken = await generateAccessToken();

    // 1. Get Subscription Details from PayPal to verify status
    const response = await fetch(
      `${PAYPAL_API}/v1/billing/subscriptions/${subscriptionID}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const subData = await response.json();

    // 2. Verify Status is ACTIVE
    if (subData.status === "ACTIVE") {
      // 3. Check if user already has an active sub (Prevent duplicates)
      const existingSub = await db.query.subscriptions.findFirst({
        where: and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, "active"),
        ),
      });

      if (existingSub) {
        return NextResponse.json(
          { error: "User already has an active subscription" },
          { status: 409 },
        );
      }

      // 4. Save to Database
      await db.insert(subscriptions).values({
        userId: session.user.id,
        subscriptionId: subData.id, // PayPal Sub ID
        planId: planId || "pro",
        status: "active",
        provider: "paypal",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(subData.billing_info.next_billing_time),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 5. ✅ GIVE IMMEDIATE INITIAL COINS & LOG TRANSACTION
      const creditsToAdd = PLAN_CREDITS[planId] || 0;
      const pricePaid = PLAN_PRICES[planId] || 0; // Use our accurate internal pricing

      if (creditsToAdd > 0) {
        // Update User Balance Atomically
        await db
          .update(users)
          .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
          .where(eq(users.id, session.user.id));

        // Log Transaction
        await db.insert(transactions).values({
          userId: session.user.id,
          amount: pricePaid, // ✅ Now logs $79 instead of $0
          currency: "USD",
          credits: creditsToAdd,
          status: "completed",
          provider: "paypal_subscription",
          providerTransactionId: `initial_${subData.id}`,
        });
      }

      return NextResponse.json({ success: true, creditsAdded: creditsToAdd });
    } else {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("PayPal Verify Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
