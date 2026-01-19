"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import DashboardNavbar from "@/components/dashboard/dashboard-navbar";
import MobileBottomNav from "@/components/dashboard/mobile-bottom-nav";
// import AnnouncementBanner from "@/components/dashboard/announcement-banner";
import { cn } from "@/lib/utils";

// Video Sources
const VIDEO_BG = {
  desktop: "/videos/hero-background.webm",
  mobile: "/videos/hero-background-mobile.webm",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState(VIDEO_BG.desktop);

  // Handle Video Source based on screen size
  useEffect(() => {
    const handleResize = () => {
      setVideoSrc(window.innerWidth < 768 ? VIDEO_BG.mobile : VIDEO_BG.desktop);
    };
    handleResize(); // Init
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen text-white relative bg-slate-950 overflow-hidden">
      {/* Background Video */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          key={videoSrc} // Forces reload on source change
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-60"
        >
          <source src={videoSrc} type="video/webm" />
        </video>
        <div className="absolute inset-0 bg-slate-950/80" /> {/* Overlay */}
      </div>

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Banner (Optional) */}
        {/* <AnnouncementBanner id="welcome" message="Welcome to DeepShark AI!" /> */}

        <DashboardNavbar
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 no-scrollbar">
          {children}
        </main>

        <MobileBottomNav />
      </div>

      {/* Mobile Overlay for Sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
