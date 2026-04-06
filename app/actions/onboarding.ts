"use server";

import { auth } from "@/auth";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
// ❌ REMOVE THIS: import { redirect } from "next/navigation";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const useCase = formData.get("useCase") as string;
  const tool = formData.get("tool") as string;
  const goal = formData.get("goal") as string;

  await db
    .update(users)
    .set({ isOnboarded: true })
    .where(eq(users.id, session.user.id));

  // 🌟 FIX: Return success instead of redirecting
  return { success: true };
}
