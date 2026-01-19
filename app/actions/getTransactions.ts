"use server";

import { auth } from "@/auth";
import { db } from "@/app/db";
import { transactions } from "@/app/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUserTransactions() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  try {
    const data = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, session.user.id))
      .orderBy(desc(transactions.createdAt)); // Newest first

    return data;
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return [];
  }
}