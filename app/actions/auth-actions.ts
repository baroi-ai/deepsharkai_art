"use server";

import { signIn, signOut } from "@/auth";
import { db } from "@/app/db";
import { users, passwordResetTokens } from "@/app/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { generateVerificationToken, generatePasswordResetToken } from "@/lib/tokens";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/mail";

// --- LOGIN ACTION ---
export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Email and password required." };

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          // This handles "Wrong Password" (if auth.ts returns null)
          return { error: "Invalid email or password." };
        
        case "CallbackRouteError":
          // ✅ FIX: Check the specific error message thrown from auth.ts
          // @ts-ignore
          const cause = error.cause?.err?.message;

          if (cause === "User not found") {
             return { error: "User does not exist. Please create an account." };
          }
          
          // Default fallback for this error type is "Email not verified"
          return { error: "Email not verified.", code: "unverified" }; 
          
        default:
          return { error: "Something went wrong." };
      }
    }
    throw error;
  }
}

// --- REGISTER ACTION ---
export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "Fields required." };

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) return { error: "Email already in use." };

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.insert(users).values({
      email,
      password: hashedPassword,
      name: email.split("@")[0],
      credits: 5,
    });

    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(email, verificationToken);

    // ✅ Return success flag to trigger modal switch
    return { success: true, requireVerification: true }; 

  } catch (err) {
    console.error("Register Error:", err);
    return { error: "Failed to create account." };
  }
}

// --- ✅ NEW: RESEND VERIFICATION ACTION ---
export async function resendVerificationAction(email: string) {
  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!existingUser) return { error: "User not found." };
    if (existingUser.emailVerified) return { error: "Email already verified!" };

    const verificationToken = await generateVerificationToken(email);
    await sendVerificationEmail(email, verificationToken);

    return { success: "Verification email sent!" };
  } catch (err) {
    return { error: "Failed to resend email." };
  }
}

export async function googleLoginAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export const forgotPasswordAction = async (email: string) => {
  if (!email) return { error: "Email is required" };

  // Check if user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Security: Even if user doesn't exist, say "Email sent" to prevent email scraping
  if (!existingUser) {
    return { success: "If an account exists, a reset link has been sent." };
  }

  // If user signed up with Google (no password), they can't reset it
  //if (!existingUser.password) {
    // return { success: "If an account exists, a reset link has been sent." };
  //}

  // Generate Token & Send Email
  const passwordResetToken = await generatePasswordResetToken(email);
  await sendPasswordResetEmail(email, passwordResetToken);

  return { success: "If an account exists, a reset link has been sent." };
};

// ✅ 2. SET NEW PASSWORD ACTION
export const newPasswordAction = async (password: string, token: string | null) => {
  if (!token) return { error: "Missing token!" };
  if (!password) return { error: "Password is required!" };
  if (password.length < 6) return { error: "Password must be at least 6 characters!" };

  const existingToken = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.token, token),
  });

  if (!existingToken) return { error: "Invalid token!" };

  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) return { error: "Token has expired!" };

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, existingToken.identifier),
  });

  if (!existingUser) return { error: "User does not exist!" };

  const hashedPassword = await bcrypt.hash(password, 10);

  // Update Password
  await db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, existingUser.id));

  // Delete Token
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.identifier, existingToken.identifier));

  return { success: "Password updated! You can now login." };
};