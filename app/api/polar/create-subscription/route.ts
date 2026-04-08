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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await req.json();

    // ✅ Monthly + Yearly plan mapping using updated env var names
    const planMapping: Record<string, string | undefined> = {
      // Monthly
      starter: process.env.POLAR_MONTHLY_STARTER_ID,
      pro: process.env.POLAR_MONTHLY_PRO_ID,
      elite: process.env.POLAR_MONTHLY_ELITE_ID,
      // Yearly
      starter_yearly: process.env.POLAR_YEARLY_STARTER_ID,
      pro_yearly: process.env.POLAR_YEARLY_PRO_ID,
      elite_yearly: process.env.POLAR_YEARLY_ELITE_ID,
    };

    const productId = planMapping[planId];

    if (!productId) {
      console.error(`❌ No product ID found for planId: ${planId}`);
      return NextResponse.json(
        { error: "Invalid plan configuration" },
        { status: 400 },
      );
    }

    const result = await polar.checkouts.create({
      products: [productId],
      customerEmail: session.user.email!,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
      metadata: {
        userId: session.user.id,
        purchaseType: "subscription",
        planId: planId, // e.g. "pro" or "pro_yearly"
      },
    });

    return NextResponse.json({ checkoutUrl: result.url });
  } catch (error: any) {
    console.error("Polar Subscription Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
