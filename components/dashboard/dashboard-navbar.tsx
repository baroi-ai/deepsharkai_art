"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  Coins,
  PlusCircle,
  Bell,
  LogIn,
  User,
  CreditCard,
  FolderCheck,
  MailCheck,
  LogOut,
  Sparkles,
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
import { useQuery } from "@tanstack/react-query";
import { getGlobalNotifications } from "@/app/actions/notification-actions";

interface DashboardNavbarProps {
  toggleSidebar: () => void;
}

const DashboardNavbar: React.FC<DashboardNavbarProps> = ({ toggleSidebar }) => {
  const { data: session } = useSession();
  const user = session?.user;
  const [imageError, setImageError] = useState(false);
  const [lastViewedId, setLastViewedId] = useState<string | null>(null);

  // 1. Fetch Real Global Notifications from DB
  const { data: notifications = [] } = useQuery({
    queryKey: ["global-notifications"],
    queryFn: () => getGlobalNotifications(),
    enabled: !!user, // Only fetch if logged in
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 2. Load the "last seen" ID from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("deepshark_last_notif_id");
    setLastViewedId(saved);
  }, []);

  // 3. Logic: Show red dot if the latest notification ID doesn't match our saved ID
  const latestNotifId = notifications.length > 0 ? notifications[0].id : null;
  const hasUnread = latestNotifId && latestNotifId !== lastViewedId;

  // 4. Function: Mark as read when the user clicks the bell
  const handleOpenNotifications = (open: boolean) => {
    if (open && latestNotifId) {
      localStorage.setItem("deepshark_last_notif_id", latestNotifId);
      setLastViewedId(latestNotifId);
    }
  };

  // @ts-ignore
  const userCoins = user?.credits || 0;

  return (
    <>
      {/* 🌟 Custom Keyframe for the Ringing Bell */}
      <style>{`
        @keyframes ring {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(15deg); }
          40% { transform: rotate(-10deg); }
          60% { transform: rotate(5deg); }
          80% { transform: rotate(-5deg); }
        }
        .animate-ring {
          animation: ring 1s ease-in-out infinite;
          transform-origin: top center;
        }
      `}</style>

      <nav className="sticky top-0 z-30 h-16 bg-transparent">
        <div className="container mx-auto px-4 md:px-6 flex h-full items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-400 hover:text-white hover:bg-white/10"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src="/logo.webp"
                alt="DeepShark AI Logo"
                width={40}
                height={40}
                priority={true}
                className="h-8 w-auto md:h-10 drop-shadow-[0_0_5px_rgba(20,184,166,0.5)] object-contain"
              />
              <span className="hidden text-teal-500 sm:inline-block text-lg md:text-xl font-bold drop-shadow-[0_0_5_rgba(20,184,166,0.5)]">
                DeepShark AI
              </span>
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* ✅ NOTIFICATIONS DROPDOWN (Global Broadcasts) */}
            {user && (
              <DropdownMenu onOpenChange={handleOpenNotifications}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-gray-400 hover:text-white hover:bg-white/10"
                  >
                    {/* 🌟 Apply the 'animate-ring' class if unread messages exist */}
                    <Bell
                      className={`h-5 w-5 ${hasUnread ? "animate-ring text-white" : ""}`}
                    />

                    {hasUnread && (
                      <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-red-500 border-2 border-slate-950 animate-pulse" />
                    )}
                  </Button>
                </DropdownMenuTrigger>

                {/* 🌟 MOBILE FRIENDLY FIX: Dynamic width + max height + scroll */}
                <DropdownMenuContent
                  className="w-[calc(100vw-2rem)] md:w-80 max-h-[80vh] overflow-y-auto bg-slate-950 border-white/10 text-white mx-4 md:mx-0 shadow-2xl"
                  align="end"
                  sideOffset={8}
                >
                  <DropdownMenuLabel>System Updates</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/10" />

                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <DropdownMenuItem
                        key={n.id}
                        className="flex flex-col items-start gap-1 p-3 focus:bg-white/5 cursor-default whitespace-normal"
                        asChild
                      >
                        {n.link ? (
                          <Link href={n.link} className="w-full">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-teal-400 break-words">
                                {n.title}
                              </span>
                              <Sparkles className="h-3 w-3 text-teal-400 shrink-0 ml-2" />
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed mt-1 break-words">
                              {n.message}
                            </p>
                          </Link>
                        ) : (
                          <div className="w-full">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-teal-400 break-words">
                                {n.title}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 leading-relaxed mt-1 break-words">
                              {n.message}
                            </p>
                          </div>
                        )}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-500">
                      No active announcements.
                    </div>
                  )}

                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuLabel className="p-0 text-center sticky bottom-0 bg-slate-950/90 backdrop-blur-sm">
                    <div className="py-3 text-[9px] uppercase tracking-widest text-gray-600 font-bold">
                      Broadcast Feed
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Credits Badge */}
            {user ? (
              <Button
                variant="outline"
                size="sm"
                className="group flex items-center gap-1.5 border-teal-500/30 bg-teal-900/10 hover:bg-teal-900/20 text-teal-100 rounded-full h-8"
                asChild
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
                  >
                    <Avatar className="h-full w-full border border-white/10">
                      {!imageError && (
                        <AvatarImage
                          src={user.image || ""}
                          alt={user.name || "User Avatar"}
                          crossOrigin="anonymous"
                          onError={() => setImageError(true)}
                        />
                      )}
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
                      <p className="text-xs leading-none text-gray-400">
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
                  >
                    <LogIn className="h-5 w-5 mr-2" /> Login
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default DashboardNavbar;
