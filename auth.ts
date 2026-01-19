import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./app/db"; 
import { users } from "./app/db/schema"; 
import { eq } from "drizzle-orm";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config"; // ✅ Import the new safe config

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig, // Merge the safe config
  adapter: DrizzleAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  secret: process.env.AUTH_SECRET,

  // ✅ Providers stay here (bcrypt is Node-only)
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true, 
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.query.users.findFirst({
          where: eq(users.email, credentials.email as string),
        });
        if (!user) throw new Error("User not found");
        if (!user.password) return null;
        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;
        if (!user.emailVerified) throw new Error("Email not verified!");
        return user;
      },
    }),
  ],
  
  // ✅ OVERRIDE Callbacks: Add the DB-heavy session callback HERE
  callbacks: {
    ...authConfig.callbacks, // Keep the JWT logic
    
    async session({ session, token }) {
      if (token && session.user && token.id) {
        // @ts-ignore
        session.user.id = token.id;

        // ✅ This DB call is now safe because this file 
        // is NOT imported by Middleware
        try {
          const freshUser = await db.query.users.findFirst({
            where: eq(users.id, token.id as string),
            columns: { credits: true }
          });
          // @ts-ignore
          session.user.credits = freshUser?.credits ?? 0;
        } catch (error) {
           console.error("Error fetching credits:", error);
           // @ts-ignore
           session.user.credits = 0;
        }
      }
      return session;
    },
  },
});