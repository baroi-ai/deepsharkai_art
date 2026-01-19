"use client";

import React from "react";
// ❌ REMOVE THIS: import { LucideIcon } from "lucide-react";

type GlowPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface FeatureCardProps {
  // ✅ CHANGE THIS: Accept 'ReactNode' (a rendered element) instead of 'LucideIcon'
  icon: React.ReactNode;
  title: string;
  description: string;
  glowPosition: GlowPosition;
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  glowPosition,
}) => {
  const getGlowPosition = (pos: GlowPosition) => {
    switch (pos) {
      case "top-left":
        return "-top-10 -left-10";
      case "top-right":
        return "-top-10 -right-10";
      case "bottom-left":
        return "-bottom-10 -left-10";
      case "bottom-right":
        return "-bottom-10 -right-10";
      default:
        return "";
    }
  };

  return (
    <div className="group relative p-6 rounded-2xl bg-[#0B1221] border border-white/5 hover:border-teal-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      {/* Glow Effect */}
      <div
        className={`absolute w-32 h-32 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all duration-500 ${getGlowPosition(
          glowPosition
        )}`}
      />

      <div className="relative z-10">
        <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4 text-teal-400 group-hover:text-white group-hover:bg-teal-500 transition-colors duration-300">
          {/* ✅ Render the passed icon directly */}
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
