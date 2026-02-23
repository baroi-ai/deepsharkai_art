import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@/auth";
import { db } from "../../../db"; // Adjust path to your db folder
import { subscriptions } from "../../../db/schema";
import { eq, and, inArray } from "drizzle-orm";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// ⚡️ TODO: Ensure these IDs match your actual Razorpay Dashboard Plan IDs
const PLAN_MAP: Record<string, string> = {
  starter: "plan_SDCluvRpp1nJKc",
  pro: "plan_SDCmPcpuMWtDJN",
  elite: "plan_SDCnGyjEmEx5wH",
};

export async function POST(req: Request) {
  try {
    // 1. Authenticate User
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. ✅ CHECK FOR EXISTING ACTIVE SUBSCRIPTION
    // We query the DB to see if this user already has a subscription marked as 'active'
    const existingSub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.status, "active"), // Only block if they are currently active
      ),
    });

    // 2. ✅ CUSTOM ERROR MESSAGES
    if (existingSub) {
      // Case: User is already Active
      return NextResponse.json(
        {
          error:
            "You are already subscribed. Please cancel your current plan first in your profile.",
        },
        { status: 409 },
      );
    }

    // 3. Validate Plan
    const { planId } = await req.json();
    const razorpayPlanId = PLAN_MAP[planId];

    if (!razorpayPlanId) {
      return NextResponse.json(
        { error: "Invalid Plan Selected" },
        { status: 400 },
      );
    }

    // 4. Create New Subscription on Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: razorpayPlanId,
      total_count: 120, // Max billing cycles (e.g., 10 years)
      quantity: 1,
      customer_notify: 1, // Razorpay sends email to customer
      notes: {
        userId: session.user.id, // Linked for Webhook
        planInternalId: planId, // Linked for Credit Calculation
      },
    });

    // 5. Return Subscription ID to Frontend
    return NextResponse.json({
      subscriptionId: subscription.id,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay Subscription Error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    );
  }
}
