"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { AuthModal } from "@/components/AuthModal";
import { useSession } from "next-auth/react";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ✅ Real auth state
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) setScrolled(isScrolled);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  const navItems = [
    { name: "Features", href: "/#features" },
    { name: "AI Tools", href: "/dashboard/tools" },
    { name: "AI Models", href: "/dashboard/models" },
    { name: "Pricing", href: "/dashboard/billing" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "py-2 glass-panel shadow-md bg-slate-900/80 backdrop-blur-md border-b border-white/10"
          : "py-5 bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 md:px-6">
        {/* 1️⃣ Added 'relative' here so the absolute nav positions itself 
            relative to this box, not the whole page.
        */}
        <div className="flex items-center justify-between relative">
          {/* Left Side: Logo (Added relative z-10 to keep it clickable) */}
          <Link
            href="/"
            className="flex items-center gap-2 flex-shrink-0 relative z-10"
          >
            <img
              src="/logo.png"
              alt="DeepShark AI Logo"
              className="h-10 lg:h-12 w-auto object-contain drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]"
            />
            <span className="text-teal-500 font-bold text-2xl tracking-tight hidden sm:block drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
              DeepShark AI
            </span>
          </Link>

          {/* 2️⃣ CENTER NAV: Perfectly Centered 
             - Removed: flex-grow, justify-center
             - Added: absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
             This forces it to the exact pixel center of the parent div.
          */}
          <nav className="hidden md:flex items-center gap-6 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-max">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-300 hover:text-teal-400 transition-colors link-underline font-medium text-sm lg:text-base"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Side: Actions (Added relative z-10 to keep it clickable) */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0 relative z-10">
            {isAuthenticated ? (
              <Button
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium btn-glow"
                asChild
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <div className="flex gap-4">
                <AuthModal
                  defaultTab="signup"
                  trigger={
                    <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium btn-glow">
                      Sign Up
                    </Button>
                  }
                />
              </div>
            )}
          </div>

          {/* Mobile Menu Button (Right aligned automatically via justify-between) */}
          <button
            className="md:hidden text-gray-200 hover:text-teal-400 p-2 relative z-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu (Unchanged) */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel mt-2 pb-4 px-4 shadow-md animate-fadeIn bg-slate-900 border-b border-white/10">
          <nav className="flex flex-col space-y-4 pt-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-300 hover:text-teal-400 px-4 py-2 rounded-md hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium w-full"
                  asChild
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <div className="flex flex-col gap-2">
                  <AuthModal
                    defaultTab="signup"
                    trigger={
                      <Button className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium">
                        Sign Up
                      </Button>
                    }
                  />
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
