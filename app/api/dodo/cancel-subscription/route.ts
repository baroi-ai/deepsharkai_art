import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { auth } from "@/auth";
import { db } from "@/app/db"; // ✅ Import your database
import { subscriptions } from "@/app/db/schema"; // ✅ Import subscriptions schema
import { eq } from "drizzle-orm";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment:
    process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

export async function POST(req: Request) {
  try {
    // 1. Ensure the user is logged in
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscriptionId } = await req.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing subscription ID" },
        { status: 400 },
      );
    }

    // 2. Tell Dodo Payments to officially cancel the subscription
    await dodo.subscriptions.update(subscriptionId, {
      status: "cancelled",
    });

    // 3. ✨ NEW: Instantly update your own database to reflect the cancellation!
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.subscriptionId, subscriptionId));

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error: any) {
    console.error("Dodo Cancel Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
