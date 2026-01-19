import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/dashboard",
    error: "/dashboard",
  },
  callbacks: {
    // ✅ Keep this to parse the user session
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // ❌ DELETE the 'authorized' callback section entirely.
    // We will handle protection manually in your middleware.ts
  },
  providers: [], 
} satisfies NextAuthConfig;