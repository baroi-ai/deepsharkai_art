// app/dashboard/layout.tsx
"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import DashboardNavbar from "@/components/dashboard/dashboard-navbar";
import MobileBottomNav from "@/components/dashboard/mobile-bottom-nav";
import { cn } from "@/lib/utils";
import { useSwipeable } from "react-swipeable";
import { Dancing_Script } from "next/font/google";

const dancingScript = Dancing_Script({ subsets: ["latin"] });

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
  const [isMobile, setIsMobile] = useState(false);
  const [videoSrc, setVideoSrc] = useState(VIDEO_BG.desktop);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setVideoSrc(mobile ? VIDEO_BG.mobile : VIDEO_BG.desktop);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const swipeHandlers = useSwipeable({
    onSwipedRight: (eventData) => {
      const target = eventData.event.target as HTMLElement;
      if (target.closest(".no-sidebar-swipe")) return;
      setIsSidebarOpen(true);
    },
    onSwipedLeft: () => setIsSidebarOpen(false),
    trackMouse: false,
    trackTouch: true,
    delta: 10,
  });

  return (
    <div
      {...swipeHandlers}
      className="flex h-screen text-white relative bg-slate-950 overflow-hidden touch-pan-y"
    >
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <video
          key={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          poster={isMobile ? "/videos/mobile.webp" : "/videos/hero-poster.webp"}
          className="w-full h-full object-cover opacity-60"
          suppressHydrationWarning
        >
          <source src={videoSrc} type={isMobile ? "video/mp4" : "video/webm"} />
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
