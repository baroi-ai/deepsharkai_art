"use client";

import React, { useState, useEffect, useRef } from "react"; // ✅ 1. Import useEffect and useRef
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  User,
  FolderCheck,
  PlusCircle,
  ImageIcon,
  ImagePlus,
  ImageUpscale,
  Dices,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/dashboard/billing", label: "Billings", icon: CreditCard },
  { href: "/dashboard/assets", label: "Assets", icon: FolderCheck },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const createOptions = [
  { href: "/dashboard/image/generator", label: "Image", icon: ImageIcon },
  { href: "/dashboard/image/layers", label: "Layer", icon: Layers },
  { href: "/dashboard/image/edit", label: "Edit", icon: ImagePlus },
  { href: "/dashboard/tools", label: "More", icon: Dices },
];

const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null); // ✅ 2. Create a Ref

  // ✅ 3. Add Event Listener to detect clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    }

    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/90 backdrop-blur-lg md:hidden h-16">
      <div className="mx-auto grid h-full max-w-md grid-cols-5 items-center px-1">
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-xs",
                isActive ? "text-cyan-400" : "text-gray-400",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* ✅ 4. Attach the Ref to the wrapper div */}
        <div
          ref={menuRef}
          className="relative flex h-full items-center justify-center"
        >
          {isCreateMenuOpen && (
            <div className="absolute bottom-full mb-4 w-40 rounded-lg border border-white/10 bg-slate-900 p-2 shadow-xl animate-in slide-in-from-bottom-2 fade-in">
              {createOptions.map((option) => (
                <Link
                  key={option.href}
                  href={option.href}
                  onClick={() => setIsCreateMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-white/10"
                >
                  <option.icon className="h-4 w-4" />
                  <span>{option.label}</span>
                </Link>
              ))}
            </div>
          )}
          <button
            onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-black shadow-lg transition-transform",
              isCreateMenuOpen && "scale-105",
            )}
          >
            <PlusCircle className="h-6 w-6" />
          </button>
        </div>

        {navItems.slice(2).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 text-xs",
                isActive ? "text-cyan-400" : "text-gray-400",
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
