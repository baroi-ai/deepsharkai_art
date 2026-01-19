import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Your auth helper
import { generateAccessToken } from "@/lib/paypal";

const PAYPAL_API = process.env.PAYPAL_API_URL;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount } = await req.json();

    // SERVER-SIDE VALIDATION: Ensure amount is valid
    if (!amount || amount < 5) {
      return NextResponse.json({ error: "Invalid amount. Minimum is $5." }, { status: 400 });
    }

    const accessToken = await generateAccessToken();

    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: {
              currency_code: "USD",
              value: amount.toString(),
            },
            description: `Purchase of DeepShark AI Credits`,
          },
        ],
      }),
    });

    const order = await response.json();
    return NextResponse.json({ id: order.id });

  } catch (error) {
    console.error("PayPal Create Order Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}