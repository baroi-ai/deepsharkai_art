import { NextResponse } from "next/server";
import DodoPayments from "dodopayments";
import { auth } from "@/auth"; // <-- Import your auth

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

    const { billing_currency, coins } = await req.json();
    const productId = process.env.DODO_CREDIT_ID;

    if (!productId) {
      return NextResponse.json(
        { error: "Product ID not configured" },
        { status: 500 },
      );
    }

    const quantityInDollars = Math.max(1, Math.round(coins / 40));

    const checkoutSession = await dodo.checkoutSessions.create({
      product_cart: [
        {
          product_id: productId,
          quantity: quantityInDollars,
        },
      ],
      // ✅ CRITICAL: Attach the userId so the webhook knows who to give coins to
      metadata: {
        userId: session.user.id,
        purchaseType: "one_time_credits",
        coins: coins.toString(), // Send as string to avoid type issues in webhook
      },
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    });

    return NextResponse.json({ checkoutUrl: checkoutSession.checkout_url });
  } catch (error: any) {
    console.error("Dodo Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
