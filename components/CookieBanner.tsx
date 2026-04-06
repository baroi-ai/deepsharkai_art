"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const consent = localStorage.getItem("deepshark_cookie_consent");
    if (!consent) {
      // Small delay so it doesn't flash instantly on page load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("deepshark_cookie_consent", "true");
    setShowBanner(false);
    // Note: If you add Google Analytics later, you would trigger the tracking script here.
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pointer-events-none flex justify-center md:justify-end">
      <div className="pointer-events-auto bg-gray-900/95 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col gap-4 animate-in slide-in-from-bottom-5 fade-in duration-500">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-teal-500" />
            <h3 className="text-white font-semibold text-sm">We use cookies</h3>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-gray-400 text-xs leading-relaxed">
          DeepShark AI uses essential cookies to keep you logged in, and
          analytics to help us improve the app. By continuing, you agree to our
          use of cookies.
        </p>

        <div className="flex gap-2 w-full pt-2">
          <Button
            variant="outline"
            className="flex-1 bg-white/5 border-white/10 text-gray-300 hover:text-white h-9 text-xs"
            onClick={() => setShowBanner(false)} // Just hides it for now
          >
            Decline
          </Button>
          <Button
            className="flex-1 bg-teal-500 hover:bg-teal-600 text-white h-9 text-xs"
            onClick={acceptCookies}
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
