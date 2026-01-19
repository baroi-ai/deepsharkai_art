import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/app/db";
import { users, transactions } from "@/app/db/schema";
import { generateAccessToken } from "@/lib/paypal";
import { eq } from "drizzle-orm";

const PAYPAL_API = process.env.PAYPAL_API_URL;
const COINS_PER_DOLLAR = 50; // Configure your rate here

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { orderID } = await req.json();
    const accessToken = await generateAccessToken();

    // 1. Capture Payment from PayPal
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    // 2. Check if PayPal says "COMPLETED"
    if (data.status === "COMPLETED") {
      const amountPaid = parseFloat(data.purchase_units[0].payments.captures[0].amount.value);
      const creditsToAdd = Math.floor(amountPaid * COINS_PER_DOLLAR);

      // 3. Update User Credits in DB
      const user = await db.query.users.findFirst({
         where: eq(users.id, session.user.id),
      });

      if (user) {
        await db.update(users)
          .set({ credits: (user.credits || 0) + creditsToAdd })
          .where(eq(users.id, session.user.id));
      }

      // 4. Log Transaction
      await db.insert(transactions).values({
        userId: session.user.id,
        amount: amountPaid,
        currency: "USD",
        credits: creditsToAdd,
        status: "completed",
        provider: "paypal",
        providerTransactionId: orderID,
      });

      return NextResponse.json({ success: true, creditsAdded: creditsToAdd });
    } else {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

  } catch (error) {
    console.error("PayPal Capture Error:", error);
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
