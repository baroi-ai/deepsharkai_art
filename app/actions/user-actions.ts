"use server";

import { auth } from "../../auth";
import { db } from "../db";
import {
  users,
  verificationTokens,
  passwordResetTokens,
  subscriptions,
  imageGenerations,
  videoGenerations,
  voiceGenerations,
} from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { deleteBatchFiles } from "@/lib/r2";

// --- ACTIONS ---

export async function getUserProfile() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  // 1. Fetch User
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!user) {
    return null;
  }

  // 2. PRIORITY FETCH - ACTIVE SUBSCRIPTION
  let subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, user.id),
      eq(subscriptions.status, "active"),
    ),
    orderBy: [desc(subscriptions.createdAt)],
  });

  // 3. Fallback: If no active sub, get the latest record
  if (!subscription) {
    subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, user.id),
      orderBy: [desc(subscriptions.createdAt)],
    });
  }

  // 4. Return combined data
  return {
    name: user.name,
    email: user.email,
    image: user.image,
    credits: user.credits ?? 0,
    initials: (user.name || user.email || "U").substring(0, 2).toUpperCase(),
    subscription: subscription
      ? {
          planId: subscription.planId,
          subscriptionId: subscription.subscriptionId,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
          provider: subscription.provider, // Now 'polar'
        }
      : null,
  };
}

// --- 2. CANCEL SUBSCRIPTION (POLAR) ---
export async function cancelSubscriptionAction() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  try {
    // 1. Find the specifically ACTIVE Subscription
    const sub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, session.user.id),
        eq(subscriptions.status, "active"),
      ),
    });

    if (!sub) {
      return { error: "No active subscription found to cancel." };
    }

    // --- POLAR CANCELLATION LOGIC ---
    if (sub.provider === "polar") {
      // TODO: Add Polar API call here if you want to cancel via server-side
      // For now, we update the DB status.
      console.log("Cancelling Polar subscription:", sub.subscriptionId);
    }

    // 3. UPDATE DB TO 'cancelled'
    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.subscriptionId, sub.subscriptionId));

    revalidatePath("/dashboard/profile");
    revalidatePath("/dashboard/billing");

    return { success: true };
  } catch (error: any) {
    console.error("Cancel Subscription Error:", error);
    return {
      error: error.message || "Failed to cancel subscription.",
    };
  }
}

// ✅ ROBUST URL PARSER
function getR2KeyFromUrl(url: string | null) {
  if (!url) return null;
  try {
    if (url.startsWith("http")) {
      const urlObj = new URL(url);
      return urlObj.pathname.startsWith("/")
        ? urlObj.pathname.substring(1)
        : urlObj.pathname;
    }
    return url.startsWith("/") ? url.substring(1) : url;
  } catch (e) {
    console.error("⚠️ Failed to parse URL:", url);
    return null;
  }
}

export async function deleteAccountAction() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const userId = session.user.id;
  console.log(`🔍 Starting deletion for User ID: ${userId}`);

  try {
    // 1. Block if Active Subscription
    const activeSub = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active"),
      ),
    });

    if (activeSub) {
      return {
        error: "Active subscription found. Please cancel it first.",
      };
    }

    // 2. Gather R2 Files
    const [images, videos, voices] = await Promise.all([
      db
        .select({ url: imageGenerations.imageUrl })
        .from(imageGenerations)
        .where(eq(imageGenerations.userId, userId)),
      db
        .select({ url: videoGenerations.videoUrl })
        .from(videoGenerations)
        .where(eq(videoGenerations.userId, userId)),
      db
        .select({ url: voiceGenerations.audioUrl })
        .from(voiceGenerations)
        .where(eq(voiceGenerations.userId, userId)),
    ]);

    const allUrls = [
      ...images.map((i) => i.url),
      ...videos.map((v) => v.url),
      ...voices.map((v) => v.url),
    ];

    const keysToDelete: string[] = [];

    for (const url of allUrls) {
      const key = getR2KeyFromUrl(url);
      if (!key) continue;

      if (key.includes(`users/${userId}/`)) {
        keysToDelete.push(key);
      }
    }

    // 4. Execute Delete from R2
    if (keysToDelete.length > 0) {
      await deleteBatchFiles(keysToDelete);
    }

    // 5. Clean Database
    if (session.user.email) {
      await db
        .delete(verificationTokens)
        .where(eq(verificationTokens.identifier, session.user.email));
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.identifier, session.user.email));
    }

    // Cascade delete user
    await db.delete(users).where(eq(users.id, userId));

    return { success: true };
  } catch (error) {
    console.error("❌ Delete Account Error:", error);
    return { error: "Failed to delete account. Please contact support." };
  }
}
