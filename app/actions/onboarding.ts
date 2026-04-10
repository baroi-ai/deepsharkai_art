"use server";

import { auth } from "@/auth";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(formData: FormData) {
  const session = await auth();

  // 🌟 FIX: Gracefully return if not logged in, instead of throwing a hard error
  if (!session?.user?.id) {
    return { success: false, error: "You must be logged in to onboard." };
  }

  const useCase = formData.get("useCase") as string;
  const tool = formData.get("tool") as string;
  const goal = formData.get("goal") as string;

  // 1. Update the database
  await db
    .update(users)
    .set({ isOnboarded: true })
    .where(eq(users.id, session.user.id));

  // 2. NUKE THE CACHE!
  revalidatePath("/", "layout");

  // 3. Return success to the client
  return { success: true };
}
