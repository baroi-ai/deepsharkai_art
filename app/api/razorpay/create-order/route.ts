import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@/auth";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { amount } = await req.json();

    if (!amount || amount < 1) { // Min 1 Rupee
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    // Razorpay works in "Paise" (1 Rupee = 100 Paise)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    return NextResponse.json({ orderId: order.id });

  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}