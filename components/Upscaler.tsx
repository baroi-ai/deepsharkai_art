"use client";

import React, { useState, useRef, useEffect } from "react";
import { ImageUpscale, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UpscalerInteractiveHero() {
  // --- STATE FOR DRAGGABLE SLIDER ---
  const [sliderPos, setSliderPos] = useState(0); // Starts at 0% by default
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs to manage the auto-animation on scroll
  const hasAnimated = useRef(false);
  const animationRef = useRef<number | null>(null);

  // --- AUTO SLIDE ON SCROLL ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When the slider comes into view and hasn't animated yet
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;

          const startTime = performance.now();
          const duration = 1500; // 1.5 seconds smooth slide

          const animateSlider = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth "ease-out" math curve
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setSliderPos(50 * easeProgress); // Animate from 0 to 50

            if (progress < 1) {
              animationRef.current = requestAnimationFrame(animateSlider);
            }
          };

          animationRef.current = requestAnimationFrame(animateSlider);
        }
      },
      { threshold: 0.5 }, // Triggers when 50% of the image is visible on screen
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  // --- MOUSE & TOUCH HANDLERS ---
  const handleMove = (clientX: number) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPos(percent);
  };

  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const handleTouchMove = (e: React.TouchEvent) =>
    handleMove(e.touches[0].clientX);

  // Stop auto-animation if user clicks/touches it early
  const startDragging = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsDragging(true);
  };

  const handleDragEnd = () => setIsDragging(false);

  // Prevent default behavior when dragging to stop page scrolling on mobile
  useEffect(() => {
    const handleTouchMovePrevent = (e: TouchEvent) => {
      if (isDragging) e.preventDefault();
    };

    if (isDragging) {
      window.addEventListener("touchmove", handleTouchMovePrevent, {
        passive: false,
      });
      window.addEventListener("mouseup", handleDragEnd);
      window.addEventListener("touchend", handleDragEnd);
    }

    return () => {
      window.removeEventListener("touchmove", handleTouchMovePrevent);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  return (
    <section
      id="image-upscaler"
      className="py-24 relative w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center px-4 md:px-6"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 hero-gradient z-10"></div>
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/50 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>

      {/* 🌟 HEADER TEXT (Fixed Layout, No Overlap) 🌟 */}
      <div className="flex flex-col items-center text-center z-30 mb-10 max-w-2xl mx-auto">
        <span className="mb-4 inline-flex items-center gap-2 border border-teal-400/30 text-teal-400 px-3 py-1 text-sm rounded-md bg-teal-500/10">
          <ImageUpscale className="w-4 h-4" /> AI Image Upscaler
        </span>
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
          Low Res to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
            4K Ultra HD.
          </span>
        </h2>
        <p className="text-gray-400 text-lg">
          AI magically restore missing pixels and details.
        </p>
      </div>

      {/* 🌟 INTERACTIVE BEFORE / AFTER IMAGE SLIDER 🌟 */}
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl aspect-video rounded-xl md:rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-slate-900 z-30 cursor-ew-resize select-none touch-none"
        onMouseDown={startDragging}
        onTouchStart={startDragging}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
      >
        {/* BOTTOM LAYER: BEFORE IMAGE (Low Quality) */}
        {/* 👈 PUT YOUR LOW-RES "BEFORE" IMAGE PATH HERE */}
        <img
          src="/tools/before.webp"
          alt="Before Upscale"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ imageRendering: "pixelated" }}
        />

        {/* TOP LAYER: AFTER IMAGE (High Quality 4K) */}
        <div
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
          }}
          className="absolute inset-0 z-10 pointer-events-none"
        >
          {/* 👈 PUT YOUR HIGH-RES "AFTER" IMAGE PATH HERE */}
          <img
            src="/tools/after.webp"
            alt="After Upscale"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* "4K AFTER" Badge */}
          <div className="absolute top-4 left-4 bg-teal-500 text-black text-[10px] md:text-xs font-black px-3 py-1 rounded shadow-lg uppercase tracking-widest">
            4K Enhanced
          </div>
        </div>

        {/* "ORIGINAL" Badge */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md border border-white/20 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded shadow-lg uppercase tracking-widest z-0">
          Original
        </div>

        {/* 🌟 THE DRAGGABLE DIVIDER LINE 🌟 */}
        <div
          style={{ left: `${sliderPos}%` }}
          className="absolute top-0 bottom-0 w-1 bg-white z-20 flex items-center justify-center -ml-[2px] shadow-[0_0_15px_rgba(0,0,0,0.8)] pointer-events-none"
        >
          {/* Slider Handle / Knob */}
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-2xl border-2 border-slate-200">
            <div className="flex gap-1">
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
              <div className="w-0.5 h-4 bg-gray-400 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      {/* Call to Action */}
      <div className="text-center mt-12 z-30">
        <Link href="/dashboard/image/upscaler">
          <Button className="h-12 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black px-8 rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all hover:scale-105 font-bold text-base">
            Try Upscaler <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
