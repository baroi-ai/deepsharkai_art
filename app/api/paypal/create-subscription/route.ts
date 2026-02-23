import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateAccessToken } from "@/lib/paypal";
import { db } from "@/app/db"; // ✅ Import your DB
import { subscriptions } from "@/app/db/schema"; // ✅ Import your schema
import { eq, and } from "drizzle-orm";

const PAYPAL_API = process.env.PAYPAL_API_URL;

// Map your internal Plan names to PayPal Plan IDs
const PLAN_MAP: Record<string, string> = {
  starter: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_STARTER!,
  pro: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_PRO!,
  elite: process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID_ELITE!,
};

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();

    // ------------------------------------------------------------------
    // 1. 🔒 GATEKEEPER: Check DB for existing active subscription
    // ------------------------------------------------------------------
    const existingSub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.status, "active"),
      ),
    });

    if (existingSub) {
      // 🛑 STOP HERE: Return 409 Conflict if they are already active.
      // The frontend will catch this and show "You are already subscribed".
      return NextResponse.json(
        {
          error:
            "You are already subscribed. Please cancel your current plan first in your profile.",
        },
        { status: 409 },
      );
    }

    // ------------------------------------------------------------------
    // 2. Validate Plan ID
    // ------------------------------------------------------------------
    const paypalPlanId = PLAN_MAP[planId];
    if (!paypalPlanId) {
      return NextResponse.json({ error: "Invalid Plan ID" }, { status: 400 });
    }

    const accessToken = await generateAccessToken();

    // ------------------------------------------------------------------
    // 3. Create Subscription on PayPal
    // ------------------------------------------------------------------
    const response = await fetch(`${PAYPAL_API}/v1/billing/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        subscriber: {
          name: {
            given_name: session.user.name || "User",
            surname: "Subscriber",
          },
          email_address: session.user.email,
        },
        application_context: {
          brand_name: "DeepShark AI",
          locale: "en-US",
          shipping_preference: "NO_SHIPPING",
          user_action: "SUBSCRIBE_NOW",
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
        },
      }),
    });

    const data = await response.json();

    if (data.id) {
      return NextResponse.json({ subscriptionID: data.id });
    } else {
      console.error("PayPal Sub Creation Failed:", data);

      // Handle the specific "RESOURCE_NOT_FOUND" error gracefully
      if (data.name === "RESOURCE_NOT_FOUND") {
        return NextResponse.json(
          {
            error:
              "Configuration Error: The Plan ID in your .env file does not match your PayPal Sandbox account.",
          },
          { status: 400 },
        );
      }

      throw new Error("Failed to create subscription");
    }
  } catch (error) {
    console.error("PayPal Create Sub Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
