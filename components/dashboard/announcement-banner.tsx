"use client";

import React, { useState, useEffect } from "react";
import { Megaphone, X, Info, AlertTriangle, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export type BannerType = "info" | "maintenance" | "offer" | "warning";

interface AnnouncementBannerProps {
  id: string;
  type?: BannerType;
  message: React.ReactNode;
  link?: string;
  linkText?: string;
}

const bannerConfig = {
  info: { icon: Info, bgClass: "bg-blue-500/80 border-blue-400" },
  maintenance: {
    icon: AlertTriangle,
    bgClass: "bg-yellow-500/80 border-yellow-400",
  },
  offer: { icon: Gift, bgClass: "bg-green-500/80 border-green-400" },
  warning: { icon: AlertTriangle, bgClass: "bg-red-500/80 border-red-400" },
};

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  id,
  type = "info",
  message,
  link,
  linkText,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check local storage on mount
    const dismissed = localStorage.getItem(`banner_${id}_dismissed`);
    if (!dismissed) setIsVisible(true);
  }, [id]);

  const config = bannerConfig[type] || bannerConfig.info;
  const Icon = config.icon || Megaphone;

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`banner_${id}_dismissed`, "true");
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={cn(
          "relative z-50 flex items-center justify-center gap-3 text-sm font-medium text-white px-4 py-2.5 border-b backdrop-blur-sm",
          config.bgClass
        )}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <div className="text-center">
          <span>{message}</span>
          {link && (
            <a
              href={link}
              className="ml-2 underline hover:text-gray-200 font-bold"
            >
              {linkText || "Learn More"} →
            </a>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="absolute right-4 p-1 hover:bg-white/20 rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnnouncementBanner;
