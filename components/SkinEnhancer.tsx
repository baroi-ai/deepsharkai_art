"use client";

import React, { useState, useRef, useEffect } from "react";
import { ScanFace, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SkinEnhancerInteractiveHero() {
  // --- STATE FOR DRAGGABLE SLIDER ---
  const [sliderPos, setSliderPos] = useState(0); // Starts at 0% (hidden) by default
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs to manage the auto-animation
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
            setSliderPos(0 + 50 * easeProgress); // Animate from 0 to 50

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

  const startDragging = () => {
    // If user clicks while the auto-animation is playing, stop the auto-animation
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
      id="skin-enhancer"
      className="py-24 relative w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center px-4 md:px-6"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950 -z-10" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/50 to-transparent z-20 pointer-events-none"></div>

      {/* 🌟 HEADER TEXT (Fixed Layout, No Overlap) 🌟 */}
      <div className="flex flex-col items-center text-center z-30 mb-10 max-w-2xl mx-auto">
        <span className="mb-4 inline-flex items-center gap-2 border border-teal-400/30 text-teal-400 px-3 py-1 text-sm rounded-md bg-teal-500/10">
          <ScanFace className="w-4 h-4" /> AI Skin Enhancer
        </span>
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
          Plastic AI to{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
            Real Skin.
          </span>
        </h2>
        <p className="text-gray-400 text-lg">
          AI magically remove plastic smoothness and restore natural skin
          textures.
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
        {/* BOTTOM LAYER: BEFORE IMAGE (Smooth AI Skin) */}
        {/* 👈 PUT YOUR PLASTIC "BEFORE" IMAGE PATH HERE */}
        <img
          src="/tools/sking.jpeg"
          alt="Before Enhancement"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* TOP LAYER: AFTER IMAGE (Realistic Skin Texture) */}
        <div
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
          }}
          className="absolute inset-0 z-10 pointer-events-none"
        >
          {/* 👈 PUT YOUR TEXTURED "AFTER" IMAGE PATH HERE */}
          <img
            src="/tools/skin.jpg"
            alt="After Enhancement"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* "ENHANCED" Badge */}
          <div className="absolute top-4 left-4 bg-teal-500 text-black text-[10px] md:text-xs font-black px-3 py-1 rounded shadow-lg uppercase tracking-widest">
            Skin Enhanced
          </div>
        </div>

        {/* "ORIGINAL" Badge */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md border border-white/20 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded shadow-lg uppercase tracking-widest z-0">
          Original AI
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
      <div className="text-center mt-10 z-30">
        <Link href="/dashboard/image/skin-enhancer">
          <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black px-8">
            Try Skin Enhancer <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
