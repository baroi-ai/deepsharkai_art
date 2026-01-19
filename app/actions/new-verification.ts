"use server";

import { db } from "@/app/db";
import { users, verificationTokens } from "@/app/db/schema";
import { eq } from "drizzle-orm";

export const newVerification = async (token: string) => {
  const existingToken = await db.query.verificationTokens.findFirst({
    where: eq(verificationTokens.token, token),
  });

  if (!existingToken) {
    return { error: "Token does not exist!" };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();

  if (hasExpired) {
    return { error: "Token has expired!" };
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, existingToken.identifier),
  });

  if (!existingUser) {
    return { error: "Email does not exist!" };
  }

  // Update User to Verified
  await db
    .update(users)
    .set({ 
      emailVerified: new Date(),
      email: existingToken.identifier // Update email just in case it changed
    })
    .where(eq(users.id, existingUser.id));

  // Delete the token
  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, existingToken.identifier));

  return { success: "Email verified!" };
};