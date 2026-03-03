"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image"; // ✅ 1. Import Next.js Image
import {
  Menu,
  Coins,
  PlusCircle,
  Download,
  LogIn,
  User,
  CreditCard,
  FolderCheck,
  MailCheck,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AuthModal } from "@/components/AuthModal";
import { useSession, signOut } from "next-auth/react";

interface DashboardNavbarProps {
  toggleSidebar: () => void;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ toggleSidebar }) => {
  const { data: session } = useSession();
  const user = session?.user;

  // @ts-ignore
  const userCoins = user?.credits || 0;

  return (
    <nav className="sticky top-0 z-30 h-16 bg-transparent">
      <div className="container mx-auto px-4 md:px-6 flex h-full items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-gray-400 hover:text-white hover:bg-white/10"
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar Menu" // ✅ Fix: Accessibility Name
          >
            <Menu className="h-6 w-6" />
          </Button>

          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            aria-label="Go to Dashboard Home" // ✅ Fix: Link Description
          >
            {/* ✅ Fix: Optimized Logo with Priority (LCP) */}
            <Image
              src="/logo.webp"
              alt="DeepShark AI Logo"
              width={40}
              height={40}
              priority={true} // Critical for top-of-page elements
              className="h-8 w-auto md:h-10 drop-shadow-[0_0_5px_rgba(20,184,166,0.5)] object-contain"
            />
            <span className="hidden text-teal-500 sm:inline-block text-lg md:text-xl font-bold drop-shadow-[0_0_5px_rgba(20,184,166,0.5)]">
              DeepShark AI
            </span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/download"
            className="hidden md:block"
            aria-label="Download Desktop App"
          >
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-white/10"
              aria-label="Download App" // ✅ Fix: Accessible Name
            >
              <Download className="h-5 w-5" />
            </Button>
          </Link>

          {/* Credits Badge */}
          {user ? (
            <Button
              variant="outline"
              size="sm"
              className="group flex items-center gap-1.5 border-teal-500/30 bg-teal-900/10 hover:bg-teal-900/20 text-teal-100 rounded-full h-8"
              asChild
              aria-label={`View Credits: ${userCoins} available`} // ✅ Fix
            >
              <Link href="/dashboard/billing">
                <Coins className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-medium">{userCoins}</span>
                <PlusCircle className="h-4 w-4 text-teal-400 opacity-70 group-hover:opacity-100" />
              </Link>
            </Button>
          ) : (
            <AuthModal
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  className="group flex items-center gap-1.5 border-teal-500/30 bg-teal-900/10 hover:bg-teal-900/20 text-teal-100 rounded-full h-8 cursor-pointer"
                  aria-label="Purchase Credits" // ✅ Fix
                >
                  <Coins className="h-4 w-4 text-teal-400" />
                  <span className="text-sm font-medium">0</span>
                  <PlusCircle className="h-4 w-4 text-teal-400 opacity-70 group-hover:opacity-100" />
                </Button>
              }
            />
          )}

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full p-0 ring-2 ring-transparent hover:ring-teal-500/50 transition-all"
                  aria-label="Open User Menu" // ✅ Fix: Accessible Name
                >
                  <Avatar className="h-full w-full border border-white/10">
                    <AvatarImage
                      src={user.image || ""}
                      alt={user.name || "User Avatar"}
                      crossOrigin="anonymous"
                    />
                    <AvatarFallback className="bg-slate-800 text-teal-400 font-bold">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-slate-950 border-white/10 text-white"
                align="end"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/dashboard/assets" className="cursor-pointer">
                    <FolderCheck className="mr-2 h-4 w-4" />
                    <span>Assets</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/dashboard/billing" className="cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/contact" className="cursor-pointer">
                    <MailCheck className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  className="text-red-400 focus:text-red-400 cursor-pointer focus:bg-red-900/20"
                  onClick={() => signOut({ callbackUrl: "/" })}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <AuthModal
              defaultTab="login"
              trigger={
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:text-teal-400 hover:bg-white/5"
                  aria-label="Login to Account" // ✅ Fix
                >
                  <LogIn className="h-5 w-5 mr-2" /> Login
                </Button>
              }
            />
          )}
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;
