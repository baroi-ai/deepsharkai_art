"use server";

import { auth } from "@/auth";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache"; // 🌟 ADD THIS IMPORT

export async function completeOnboarding(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const useCase = formData.get("useCase") as string;
  const tool = formData.get("tool") as string;
  const goal = formData.get("goal") as string;

  // 1. Update the database
  await db
    .update(users)
    .set({ isOnboarded: true })
    .where(eq(users.id, session.user.id));

  // 🌟 2. NUKE THE CACHE! This tells Next.js the user is officially onboarded.
  revalidatePath("/", "layout");

  // 3. Return success to the client
  return { success: true };
}
