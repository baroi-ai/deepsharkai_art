"use client";

import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  className?: string;
  glowPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

const FeatureCard = ({
  title,
  description,
  icon: Icon,
  className,
  glowPosition = "top-right",
}: FeatureCardProps) => {
  const glowStyles = {
    "top-left": "top-0 left-0 -translate-x-1/2 -translate-y-1/2",
    "top-right": "top-0 right-0 translate-x-1/2 -translate-y-1/2",
    "bottom-left": "bottom-0 left-0 -translate-x-1/2 translate-y-1/2",
    "bottom-right": "bottom-0 right-0 translate-x-1/2 translate-y-1/2",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden glass-panel p-6 rounded-xl border border-white/10 hover-scale",
        className
      )}
    >
      <div className="absolute inset-0 hero-gradient z-10"></div>
      <div
        className={cn(
          "absolute w-40 h-40 bg-teal-500/10 rounded-full blur-3xl opacity-50",
          glowStyles[glowPosition]
        )}
      />

      <div className="relative z-10 flex flex-col h-full">
        <div className="glass-icon w-14 h-14 rounded-lg flex items-center justify-center mb-5">
          <Icon className="h-7 w-7 text-teal-400" />
        </div>

        <h3 className="text-xl font-semibold mb-3">{title}</h3>
        <p className="text-gray-400 flex-grow">{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
