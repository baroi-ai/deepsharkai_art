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
import { unlink } from "fs/promises";
import { revalidatePath } from "next/cache";
import path from "path";
import Razorpay from "razorpay";
import { generateAccessToken } from "@/lib/paypal"; // ✅ Import PayPal Helper
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

  // 2. 🔍 FIX: PRIORITY FETCH - ACTIVE SUBSCRIPTION
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
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
          provider: subscription.provider, // 'paypal' or 'razorpay'
        }
      : null,
  };
}

// --- 2. CANCEL SUBSCRIPTION (Razorpay & PayPal) ---
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

    // --- CASE A: RAZORPAY ---
    if (sub.provider === "razorpay") {
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      // Cancel Immediately (0)
      await razorpay.subscriptions.cancel(sub.subscriptionId, 0);
    }
    // --- CASE B: PAYPAL ---
    else if (sub.provider === "paypal") {
      const accessToken = await generateAccessToken();
      const PAYPAL_API = process.env.PAYPAL_API_URL;

      const response = await fetch(
        `${PAYPAL_API}/v1/billing/subscriptions/${sub.subscriptionId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            reason: "User requested cancellation via dashboard",
          }),
        },
      );

      if (!response.ok) {
        // If it's already cancelled (422) or not found (404), we might still want to update our DB
        // But for other errors, we should log them.
        const errData = await response.json();
        console.error("PayPal Cancel Failed:", errData);
        if (response.status !== 404 && response.status !== 422) {
          return {
            error:
              "Failed to cancel PayPal subscription. Please contact support.",
          };
        }
      }
    }

    // 3. ✅ UPDATE DB TO 'cancelled' (Common for both)
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

// ✅ ROBUT URL PARSER
function getR2KeyFromUrl(url: string | null) {
  if (!url) return null;
  try {
    // 1. If it's a full URL (https://...)
    if (url.startsWith("http")) {
      const urlObj = new URL(url);
      // Remove leading slash (e.g., "/users/123/..." -> "users/123/...")
      return urlObj.pathname.startsWith("/")
        ? urlObj.pathname.substring(1)
        : urlObj.pathname;
    }
    // 2. If it's already a relative path or key
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
    // 1. 🛑 Block if Active Subscription
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

    // 2. 🧹 Gather R2 Files
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

    console.log(`📊 Found ${allUrls.length} total generation records in DB.`);

    // 3. Convert URLs to Keys (With Logging)
    const keysToDelete: string[] = [];

    for (const url of allUrls) {
      const key = getR2KeyFromUrl(url);

      // LOGGING: Check why a key might be skipped
      if (!key) {
        console.log(`❌ Skipped (Invalid URL): ${url}`);
        continue;
      }

      // We only delete if it looks like it belongs to this user
      // This prevents deleting Fal.ai URLs or other external assets
      if (key.includes(`users/${userId}/`)) {
        keysToDelete.push(key);
      } else {
        console.log(`⚠️ Skipped (External/Mismatch): ${url} -> Key: ${key}`);
      }
    }

    // 4. 🔥 Execute Delete
    if (keysToDelete.length > 0) {
      console.log(`🔥 Deleting ${keysToDelete.length} files from R2...`);
      await deleteBatchFiles(keysToDelete);
    } else {
      console.log("✅ No matching R2 files found to delete.");
    }

    // 5. 🗑️ Clean Database
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
    console.log("✅ User deleted from Database.");

    return { success: true };
  } catch (error) {
    console.error("❌ Delete Account Error:", error);
    return { error: "Failed to delete account. Please contact support." };
  }
}
