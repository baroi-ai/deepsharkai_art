import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { auth } from "@/auth";
import { db } from "@/app/db";
import { subscriptions } from "@/app/db/schema";
import { eq } from "drizzle-orm";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  //server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  server: "sandbox",
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

    // 2. Tell Polar to cancel the subscription immediately
    await polar.subscriptions.revoke({ id: subscriptionId });

    // 3. Update your own DB to reflect cancellation instantly
    await db
      .update(subscriptions)
      .set({
        status: "canceled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.subscriptionId, subscriptionId));

    console.log(
      `✅ Subscription ${subscriptionId} cancelled for user ${session.user.id}`,
    );

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    });
  } catch (error: any) {
    console.error("❌ Polar Cancel Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
