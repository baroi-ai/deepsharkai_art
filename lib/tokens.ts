import { v4 as uuidv4 } from "uuid";
import { db } from "@/app/db";
import { verificationTokens, passwordResetTokens } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export const generateVerificationToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour expiry

  // Check if a token already exists for this email and delete it
  const existingToken = await db.query.verificationTokens.findFirst({
    where: eq(verificationTokens.identifier, email),
  });

  if (existingToken) {
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.identifier, email));
  }

  // Create new token
  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    expires,
  });

  return token;
};

export const generatePasswordResetToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(new Date().getTime() + 3600 * 1000); // 1 hour

  // Check if a token already exists and delete it
  const existingToken = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.identifier, email),
  });

  if (existingToken) {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.identifier, email));
  }

  // Insert new token
  await db.insert(passwordResetTokens).values({
    identifier: email,
    token,
    expires,
  });

  return token;
};