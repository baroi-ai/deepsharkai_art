import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

// Initialize lightweight auth for Edge
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const currentPath = req.nextUrl.pathname;

  // ✅ 1. Define all protected routes here
  const protectedPaths = ["/dashboard/profile", "/dashboard/assets"];
  
  // Check if the current path matches ANY of the protected paths
  const isProtectedPage = protectedPaths.some((path) => 
    currentPath.startsWith(path)
  );

  if (isProtectedPage && !isLoggedIn) {
    // 2. Determine where to redirect back to
    const referer = req.headers.get("referer");
    const origin = req.nextUrl.origin;
    
    // Default fallback: Go to /dashboard root
    let returnUrl = "/dashboard";

    // If the user came from a page within our app, try to send them back there
    if (referer && referer.startsWith(origin)) {
      const refererPath = referer.replace(origin, "");
      
      // ✅ 3. Infinite Loop Protection
      // If the referer was ALSO a protected page (e.g. they logged out while on Profile),
      // do NOT send them back there. Keep the default "/dashboard".
      const isRefererProtected = protectedPaths.some((path) => 
        refererPath.startsWith(path)
      );

      if (!isRefererProtected) {
        returnUrl = refererPath;
      }
    }

    // 4. Construct the redirect URL
    const newUrl = new URL(returnUrl, req.url);
    
    // 5. Add the flag to open the modal
    newUrl.searchParams.set("openLogin", "true");
    
    // 6. Remember the intended destination (e.g., /dashboard/my-generations)
    newUrl.searchParams.set("callbackUrl", currentPath);

    return NextResponse.redirect(newUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on all dashboard routes
  matcher: ["/dashboard/:path*"],
};