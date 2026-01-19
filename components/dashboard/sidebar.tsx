"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ImageIcon,
  UserRoundPen,
  CreditCard,
  LogOut,
  LogIn,
  Video,
  ImagePlus,
  ImageUpscale,
  AudioLines,
  Dices,
  FolderCheck,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";

const mainNavItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Image", href: "/dashboard/image-generation", icon: ImageIcon },
  { name: "Upscaler", href: "/dashboard/image-upscaler", icon: ImageUpscale },
  { name: "Edit", href: "/dashboard/image-edit", icon: ImagePlus },
  { name: "More", href: "/dashboard/tools", icon: Dices },
];

const accountNavItems = [
  { name: "Assets", href: "/dashboard/assets", icon: FolderCheck },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { name: "Profile", href: "/dashboard/profile", icon: UserRoundPen },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/dashboard" });
    if (onClose) onClose();
  };

  const renderNavItem = (item: { name: string; href: string; icon: any }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href));

    const baseClasses =
      "flex flex-col items-center w-full p-3 rounded-lg group transition-colors duration-150 ease-in-out";

    let linkClasses = `${baseClasses} text-gray-400 hover:bg-gray-700 hover:text-gray-100`;
    let iconClasses = `h-6 w-6 text-gray-400 group-hover:text-gray-100`;
    let textClasses =
      "text-xs mt-1 font-medium truncate w-full text-center text-gray-400 group-hover:text-gray-100";

    if (isActive) {
      linkClasses = `${baseClasses} bg-gradient-to-br from-cyan-500 to-teal-400 text-white shadow-lg`;
      iconClasses = `h-6 w-6 text-white`;
      textClasses =
        "text-xs mt-1 font-medium truncate w-full text-center text-white";
    }

    return (
      <li key={item.name} className="w-full">
        <Link
          href={item.href}
          onClick={onClose}
          className={linkClasses}
          title={item.name}
        >
          <item.icon className={iconClasses} />
          <span className={textClasses}>{item.name}</span>
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-24 bg-transparent text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-y-auto md:z-auto ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col items-center overflow-y-auto px-2 py-4 no-scrollbar">
        <ul className="space-y-1 font-medium w-full">
          {mainNavItems.map(renderNavItem)}
        </ul>
        <hr className="my-3 border-gray-700 w-3/4" />
        <ul className="space-y-1 font-medium w-full">
          {accountNavItems.map(renderNavItem)}
        </ul>

        <div className="mt-auto w-full pt-4">
          <ul className="space-y-1 font-medium w-full">
            {isAuthenticated ? (
              <li>
                <button
                  onClick={handleLogout}
                  className="flex flex-col items-center w-full p-3 rounded-lg group text-gray-400 hover:bg-red-800/50 hover:text-red-300 transition-colors"
                >
                  <LogOut className="h-6 w-6 group-hover:text-red-300" />
                  <span className="text-xs mt-1 text-gray-400 group-hover:text-red-300">
                    Logout
                  </span>
                </button>
              </li>
            ) : (
              <li>
                {/* ✅ DISABLE URL CONTROL HERE */}
                <AuthModal
                  allowUrlControl={false}
                  trigger={
                    <button
                      className="flex flex-col items-center w-full p-3 rounded-lg group text-gray-400 hover:bg-green-800/50 hover:text-green-300 transition-colors"
                      onClick={() => {
                        if (onClose) onClose();
                      }}
                    >
                      <LogIn className="h-6 w-6 group-hover:text-green-300" />
                      <span className="text-xs mt-1 text-gray-400 group-hover:text-green-300">
                        Login
                      </span>
                    </button>
                  }
                />
              </li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
