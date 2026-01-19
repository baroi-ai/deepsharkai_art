"use server";

import { auth } from "../../auth"; // Your auth config
import { db } from "../db";     // Your db connection
import { users, verificationTokens, passwordResetTokens, } from "../db/schema"; // Your schema
import { eq } from "drizzle-orm";
import { unlink } from "fs/promises";
import path from "path";

// Helper to delete a file from "public" folder
async function deleteFileFromStorage(relativeUrl: string | null) {
  if (!relativeUrl) return;
  
  try {
    // Remove leading slash if present (e.g., "/uploads/img.png" -> "uploads/img.png")
    const cleanPath = relativeUrl.startsWith("/") ? relativeUrl.slice(1) : relativeUrl;
    
    // Construct full path on hard disk
    const fullPath = path.join(process.cwd(), "public", cleanPath);
    
    // Delete file
    await unlink(fullPath);
    console.log(`Deleted file: ${fullPath}`);
  } catch (error) {
    // Ignore error if file doesn't exist (already deleted)
    console.error(`Failed to delete file ${relativeUrl}:`, error);
  }
}

export async function getUserProfile() {
  // 1. Check if session exists
  const session = await auth();
  
  if (!session?.user?.email) {
    return null;
  }

  // 2. Fetch fresh data from DB (to get latest credits)
  const user = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  if (!user) return null;

  // 3. Return sanitized user data
  return {
    name: user.name,
    email: user.email,
    image: user.image,
    credits: user.credits ?? 0,
    initials: (user.name || user.email || "U").substring(0, 2).toUpperCase(),
  };
}

export async function deleteAccountAction() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Not authenticated" };

  const userId = session.user.id;

  try {
    // ---------------------------------------------------------
    // 1. FETCH & DELETE GENERATED FILES (IMAGES, VIDEOS, AUDIO)
    // ---------------------------------------------------------
    
    // ⚠️ EXAMPLE: You need to adapt this to your actual schema names
    // const userImages = await db.query.generatedImages.findMany({ where: eq(generatedImages.userId, userId) });
    // const userVideos = await db.query.generatedVideos.findMany({ where: eq(generatedVideos.userId, userId) });

    // for (const img of userImages) {
    //   await deleteFileFromStorage(img.url);
    // }
    // for (const vid of userVideos) {
    //   await deleteFileFromStorage(vid.url);
    // }

    // ---------------------------------------------------------
    // 2. DELETE DATABASE RECORDS FOR ASSETS
    // ---------------------------------------------------------
    // await db.delete(generatedImages).where(eq(generatedImages.userId, userId));
    // await db.delete(generatedVideos).where(eq(generatedVideos.userId, userId));


    // ---------------------------------------------------------
    // 3. DELETE USER DATA (Tokens & Account)
    // ---------------------------------------------------------
    
    // Delete verification tokens linked to this email
    if (session.user.email) {
       await db.delete(verificationTokens).where(eq(verificationTokens.identifier, session.user.email));
       await db.delete(passwordResetTokens).where(eq(passwordResetTokens.identifier, session.user.email));
    }

    // Finally, Delete the User
    await db.delete(users).where(eq(users.id, userId));

    return { success: true };

  } catch (error) {
    console.error("Delete Account Error:", error);
    return { error: "Failed to delete account. Please contact support." };
  }
}