"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import DashboardNavbar from "@/components/dashboard/dashboard-navbar";
import MobileBottomNav from "@/components/dashboard/mobile-bottom-nav";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";

import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({ subsets: ["latin"] });

// Video Sources
const VIDEO_BG = {
  desktop: "/videos/hero-background.webm",
  mobile: "/videos/bg-video.mp4",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState(VIDEO_BG.desktop);

  useEffect(() => {
    const handleResize = () => {
      setVideoSrc(window.innerWidth < 768 ? VIDEO_BG.mobile : VIDEO_BG.desktop);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Optimized Swipe Handlers with Conflict Fix
  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      // 1. Get the element the user touched
      const target = eventData.event.target as HTMLElement;

      // 2. Check if it's inside the Carousel (or any element we want to ignore)
      if (target.closest(".no-sidebar-swipe")) {
        return; // Stop! Don't open the sidebar.
      }

      setIsSidebarOpen(true);
    },
    onSwipedLeft: (eventData) => {
      // Optional: You can do the same check here if needed,
      // but usually closing the sidebar works fine from anywhere.
      setIsSidebarOpen(false);
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
    delta: 10,
  });

  return (
    <div
      {...swipeHandlers}
      className="flex h-screen text-white relative bg-slate-950 overflow-hidden touch-pan-y"
    >
      {/* ... (Background Video remains the same) ... */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <video
          key={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          poster="/videos/hero-poster.webp"
          className="w-full h-full object-cover opacity-60"
          suppressHydrationWarning
        >
          <source src={videoSrc} type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-slate-950/80" />
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <DashboardNavbar
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 no-scrollbar">
          {children}
        </main>

        <MobileBottomNav />
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
