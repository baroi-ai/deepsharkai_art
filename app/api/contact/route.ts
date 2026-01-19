import { NextResponse } from "next/server";
import { db } from "@/app/db";
import { contactSubmissions } from "@/app/db/schema";
import { count, eq, and, gt } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    // 1. Get IP Address (For Rate Limiting)
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    // 2. RATE LIMITING: Check last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const submissionCount = await db
      .select({ value: count() })
      .from(contactSubmissions)
      .where(
        and(
          eq(contactSubmissions.ipAddress, ip),
          gt(contactSubmissions.createdAt, oneHourAgo)
        )
      );

    // Limit: Max 3 messages per hour
    if (submissionCount[0].value >= 3) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // 3. Save to Database Only
    await db.insert(contactSubmissions).values({
      name,
      email,
      subject,
      message,
      ipAddress: ip,
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Contact API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}