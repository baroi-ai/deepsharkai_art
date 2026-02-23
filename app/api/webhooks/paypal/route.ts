import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { subscriptions, users, transactions } from "@/app/db/schema";
import { eq, sql } from "drizzle-orm"; // ✅ Added sql for atomic updates
import { generateAccessToken } from "@/lib/paypal";

const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID; // From PayPal Dashboard
const PAYPAL_API = process.env.PAYPAL_API_URL;

export async function POST(req: Request) {
  try {
    const body = await req.text(); // Get raw body string
    const headers = req.headers;
    const payload = JSON.parse(body);

    // 1. 🔒 VERIFY WEBHOOK SIGNATURE
    const isVerified = await verifyPayPalWebhook(
      headers,
      body,
      PAYPAL_WEBHOOK_ID!,
    );

    if (!isVerified) {
      console.error("⚠️ PayPal Webhook Signature Verification Failed");
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const eventType = payload.event_type;
    const resource = payload.resource; // The subscription or sale object

    console.log(`🔔 PayPal Webhook: ${eventType}`);

    // 2. HANDLER SWITCH
    switch (eventType) {
      // ✅ CASE A: RECURRING PAYMENT SUCCESS (RENEWAL)
      case "PAYMENT.SALE.COMPLETED": {
        const subscriptionId = resource.billing_agreement_id; // "I-..."
        const rawAmount = resource.amount.total; // "9.00" (String)
        const numericAmount = parseFloat(rawAmount);

        // Find the subscription in our DB
        const sub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.subscriptionId, subscriptionId),
        });

        if (sub) {
          // 🚨 CRITICAL FIX: Check if we already gave coins for this specific sale ID
          // This prevents double-dipping from the initial verify-subscription payout
          const existingTxn = await db.query.transactions.findFirst({
            where: eq(transactions.providerTransactionId, resource.id),
          });

          if (existingTxn) {
            console.log(
              `Webhook Ignored: Coins already given for sale ${resource.id}`,
            );
            break; // Stop here, they already got their coins!
          }

          // 1. Calculate new period start & end (Add 1 month)
          const newPeriodStart = new Date();
          const newPeriodEnd = new Date();
          newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

          // 2. Update Subscription Date
          await db
            .update(subscriptions)
            .set({
              status: "active",
              currentPeriodStart: newPeriodStart, // Ensures start date rolls forward
              currentPeriodEnd: newPeriodEnd,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.subscriptionId, subscriptionId));

          // 3. ✅ DYNAMICALLY CALCULATE CREDITS (UPDATED FOR PROFITABILITY)
          let creditsToAdd = 0;
          if (numericAmount === 9.0) creditsToAdd = 500; // Starter
          else if (numericAmount === 29.0) creditsToAdd = 1800; // Pro
          else if (numericAmount === 79.0) creditsToAdd = 5000; // Elite
          else {
            creditsToAdd = Math.floor(numericAmount * 50); // Fallback math
          }

          // 4. Update User Balance Atomically
          await db
            .update(users)
            .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
            .where(eq(users.id, sub.userId));

          // 5. Log Transaction
          await db.insert(transactions).values({
            userId: sub.userId,
            amount: numericAmount,
            currency: "USD",
            credits: creditsToAdd,
            status: "completed",
            provider: "paypal_subscription",
            providerTransactionId: resource.id, // Save the Sale ID so we never process it again
          });
        }
        break;
      }

      // ❌ CASE B: SUBSCRIPTION CANCELLED
      case "BILLING.SUBSCRIPTION.CANCELLED": {
        const subscriptionId = resource.id;

        await db
          .update(subscriptions)
          .set({ status: "cancelled", updatedAt: new Date() })
          .where(eq(subscriptions.subscriptionId, subscriptionId));

        break;
      }

      // ⚠️ CASE C: SUBSCRIPTION SUSPENDED (Payment Failed)
      case "BILLING.SUBSCRIPTION.SUSPENDED": {
        const subscriptionId = resource.id;

        await db
          .update(subscriptions)
          .set({ status: "halted", updatedAt: new Date() })
          .where(eq(subscriptions.subscriptionId, subscriptionId));

        break;
      }

      // ⚠️ CASE D: SUBSCRIPTION EXPIRED
      case "BILLING.SUBSCRIPTION.EXPIRED": {
        const subscriptionId = resource.id;

        await db
          .update(subscriptions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(subscriptions.subscriptionId, subscriptionId));

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal Webhook Error:", error);
    return NextResponse.json({ error: "Webhook Failed" }, { status: 500 });
  }
}

// --- HELPER: VERIFY SIGNATURE ---
async function verifyPayPalWebhook(
  headers: Headers,
  rawBody: string,
  webhookId: string,
) {
  const accessToken = await generateAccessToken();

  const verificationPayload = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
    webhook_id: webhookId,
    webhook_event: JSON.parse(rawBody),
  };

  const response = await fetch(
    `${PAYPAL_API}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(verificationPayload),
    },
  );

  const data = await response.json();
  return data.verification_status === "SUCCESS";
}
