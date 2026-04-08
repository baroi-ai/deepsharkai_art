import { NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";
import { auth } from "@/auth";

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN || "",
  //server: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  server: "sandbox",
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount, coins } = await req.json();
    const productId = process.env.POLAR_TOPUP_PRODUCT_ID;

    if (!productId) {
      return NextResponse.json(
        { error: "POLAR_TOPUP_PRODUCT_ID not configured" },
        { status: 500 },
      );
    }

    const amountCents = Math.round(amount * 100);

    const result = await polar.checkouts.create({
      products: [productId],
      amount: amountCents,
      customerEmail: session.user.email!,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      metadata: {
        userId: session.user.id,
        purchaseType: "one_time_credits",
        coins: coins.toString(),
        // ✅ Store amountCents as fallback in case order.totalAmount
        // is missing on the webhook payload (e.g. custom-amount products)
        amountCents: amountCents.toString(),
      },
    });

    return NextResponse.json({ checkoutUrl: result.url });
  } catch (error: any) {
    console.error("❌ Polar create-payment error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
