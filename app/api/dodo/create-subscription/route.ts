import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { auth } from "@/auth";

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  environment:
    process.env.NODE_ENV === "production" ? "live_mode" : "test_mode",
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { planId } = await req.json();

    const planMapping: Record<string, string | undefined> = {
      starter: process.env.DODO_STARTER_ID,
      pro: process.env.DODO_PRO_ID,
      elite: process.env.DODO_ELITE_ID,
    };

    const dodoProductId = planMapping[planId];

    if (!dodoProductId) {
      return NextResponse.json(
        { error: "Invalid plan configuration" },
        { status: 400 },
      );
    }

    const checkoutSession = await dodo.checkoutSessions.create({
      product_cart: [
        {
          product_id: dodoProductId,
          quantity: 1,
        },
      ],
      // ✅ CRITICAL: Attach the userId and plan details
      metadata: {
        userId: session.user.id,
        purchaseType: "subscription",
        planId: planId,
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.checkout_url });
  } catch (error: any) {
    console.error("Dodo Subscription Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
