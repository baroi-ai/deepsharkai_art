"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";

const LayerExplosionHero = () => {
  // 🌟 NEW: State to control the explosion animation
  const [isExploded, setIsExploded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 🌟 NEW: Trigger animation when scrolled into view on Mobile
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Only auto-trigger on scroll for mobile devices (width < 768px)
        if (window.innerWidth < 768) {
          setIsExploded(entry.isIntersecting);
        }
      },
      { threshold: 0.5 }, // Triggers when at least 50% of the image is on screen
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="layer-extractor"
      className="py-24 relative overflow-hidden bg-slate-900/30"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 hero-gradient z-10"></div>
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/50 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Header Text */}
        <div className="max-w-xl mx-auto text-center mb-16">
          <span className="mb-4 inline-flex items-center gap-2 border border-teal-400/30 text-teal-400 px-3 py-1 text-sm rounded-md bg-teal-500/10">
            <Layers className="w-4 h-4" /> AI Image Decomposer
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Image{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              Layer Extractor
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            AI instantly breaks flat images into perfectly editable layers.
          </p>
        </div>

        {/* 🌟 EXPLOSION INTERACTIVE GRID (16:9 FORMAT) 🌟 */}
        {/* ✅ FIX: Replaced 'group' with Mouse and Touch event listeners */}
        <div
          ref={containerRef}
          className="flex justify-center items-center h-[400px] md:h-[500px] w-full cursor-pointer"
          onMouseEnter={() => setIsExploded(true)}
          onMouseLeave={() => setIsExploded(false)}
          onTouchStart={() => setIsExploded(true)}
          onTouchEnd={() => setIsExploded(false)}
        >
          {/* Main 16:9 Group Container */}
          <div className="relative w-[320px] sm:w-[420px] md:w-[560px] aspect-video">
            {/* LAYER 1: Background (Flys Top Left) */}
            <div
              className={`absolute inset-0 rounded-2xl border border-white/10 shadow-2xl bg-slate-900 overflow-hidden flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-10 ${isExploded ? "-translate-x-[40%] -translate-y-[40%] -rotate-6" : ""}`}
            >
              {/* 👈 PUT YOUR BACKGROUND IMAGE PATH HERE */}
              <img
                src="/tools/layer-3.webp"
                alt="Background Layer"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />

              <span className="bg-black/70 px-3 py-1 rounded-full text-white/70 font-mono text-[10px] md:text-xs z-10 font-bold tracking-widest uppercase backdrop-blur-md">
                Layer 1: Background
              </span>
            </div>

            {/* LAYER 2: Props/Elements (Flys Top Right) */}
            <div
              className={`absolute inset-0 rounded-2xl border border-white/10 shadow-2xl bg-slate-800/80 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20 ${isExploded ? "translate-x-[40%] -translate-y-[30%] rotate-6" : ""}`}
            >
              {/* 👈 PUT YOUR SECOND LAYER PATH HERE (Use a transparent PNG) */}
              <img
                src="/tools/layer-2.webp"
                alt="Elements Layer"
                className="absolute inset-0 w-full h-full object-cover"
              />

              <span className="bg-black/70 px-3 py-1 rounded-full text-teal-400/90 font-mono text-[10px] md:text-xs z-10 font-bold tracking-widest uppercase backdrop-blur-md">
                Layer 2: Elements
              </span>
            </div>

            {/* LAYER 3: Shadows & Lights (Flys Bottom Left) */}
            <div
              className={`absolute inset-0 rounded-2xl border border-white/10 shadow-2xl bg-slate-900/80 backdrop-blur-md overflow-hidden flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-30 ${isExploded ? "-translate-x-[35%] translate-y-[40%] rotate-3" : ""}`}
            >
              {/* 👈 PUT YOUR THIRD LAYER PATH HERE (Use a transparent PNG) */}
              <img
                src="/tools/layer-4.webp"
                alt="Lighting Layer"
                className="absolute inset-0 w-full h-full object-cover mix-blend-screen"
              />

              <span className="bg-black/70 px-3 py-1 rounded-full text-gray-300 font-mono text-[10px] md:text-xs z-10 font-bold tracking-widest uppercase backdrop-blur-md">
                Layer 3: Lighting
              </span>
            </div>

            {/* LAYER 4: Main Subject (Stays Center, Scales Up) */}
            <div
              className={`absolute inset-0 rounded-2xl border border-teal-500/50 bg-[#0B1221] overflow-hidden flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-40 ${isExploded ? "shadow-[0_0_50px_rgba(20,184,166,0.4)] scale-110" : "shadow-[0_0_40px_rgba(20,184,166,0.1)] scale-105"}`}
            >
              {/* 👈 PUT YOUR MAIN SUBJECT PATH HERE */}
              <img
                src="/tools/layer-1.webp"
                alt="Main Subject"
                className="absolute inset-0 w-full h-full object-cover"
              />

              <div className="text-center z-10 flex flex-col items-center gap-1 mt-auto mb-4">
                <span className="bg-black/80 px-4 py-1.5 rounded-md text-white font-black tracking-widest uppercase text-xs md:text-sm drop-shadow-lg border border-white/10 backdrop-blur-md">
                  Main Subject
                </span>
              </div>
            </div>

            {/* LAYER 5: Foreground / Text Overlay (Flys Bottom Right) */}
            <div
              className={`absolute inset-0 rounded-2xl border border-white/10 shadow-2xl bg-transparent flex flex-col items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-50 pointer-events-none ${isExploded ? "translate-x-[45%] translate-y-[35%] -rotate-3" : ""}`}
            >
              {/* 👈 PUT YOUR FOREGROUND/TEXT PATH HERE (Use a transparent PNG) */}
              <img
                src="/tools/layer-5.webp"
                alt="Foreground Layer"
                className="absolute inset-0 w-full h-full object-cover"
              />

              <span className="bg-black/80 px-3 py-1 rounded-full text-white/90 font-mono text-[10px] md:text-xs mt-auto mb-4 font-bold tracking-widest uppercase backdrop-blur-md">
                Layer 4: Foreground
              </span>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-8">
          <Link href="/dashboard/image/layers">
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black px-8">
              Try Layer Extractor <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default LayerExplosionHero;
