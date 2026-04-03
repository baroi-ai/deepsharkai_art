// app/actions/notification-actions.ts
"use server";

import { db } from "../db";
import { globalNotifications } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export async function getGlobalNotifications() {
  try {
    const data = await db
      .select()
      .from(globalNotifications)
      .where(eq(globalNotifications.isActive, true))
      .orderBy(desc(globalNotifications.createdAt))
      .limit(5); // Only show the 5 most recent active broadcasts

    return data;
  } catch (error) {
    console.error("Failed to fetch broadcasts:", error);
    return [];
  }
}
