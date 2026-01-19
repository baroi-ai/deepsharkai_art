"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Video,
  AudioLines,
  Box,
  Loader2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ✅ Import React Query Hook
import { useQuery } from "@tanstack/react-query";

// Import Server Action
import { getDashboardContent } from "@/app/actions/content-actions";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 1,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "100%" : "-100%",
    opacity: 1,
  }),
};

export default function DashboardPage() {
  const router = useRouter();

  // --- ✅ REPLACED USE-EFFECT WITH USE-QUERY ---
  // This handles caching automatically.
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-content"], // Unique key for the cache
    queryFn: () => getDashboardContent(), // The server action
    staleTime: Infinity, // ✅ KEY: Data never expires until page reload
    refetchOnWindowFocus: false, // Don't refetch when clicking tabs
    refetchOnMount: false, // Don't refetch when coming back to this page
  });

  // Extract data with fallbacks (safe access)
  const slides = data?.slides || [];
  const tools = data?.tools || [];
  const models = data?.models || [];

  // Carousel State
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // --- CAROUSEL LOGIC ---
  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    setDirection(1);
    setCurrentSlideIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (slides.length === 0) return;
    setDirection(-1);
    setCurrentSlideIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  }, [slides.length]);

  const goToSlide = (index: number) => {
    setDirection(index > currentSlideIndex ? 1 : -1);
    setCurrentSlideIndex(index);
  };

  useEffect(() => {
    if (slides.length > 0) {
      autoPlayRef.current = setInterval(nextSlide, 5000);
    }
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [nextSlide, slides.length]);

  const pauseAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
  };

  const resumeAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (slides.length > 0) {
      autoPlayRef.current = setInterval(nextSlide, 5000);
    }
  };

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.x < -50) nextSlide();
    else if (info.offset.x > 50) prevSlide();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 20) {
      if (e.deltaX > 0) nextSlide();
      else prevSlide();
    }
  };

  // --- RENDERERS ---
  const renderToolCard = (tool: any) => {
    const imageUrl = tool.imageUrl || "";
    const isVideo = imageUrl.endsWith(".mp4") || imageUrl.endsWith(".webm");
    const badgeClass =
      "bg-red-600/90 text-white shadow-md border border-red-500/20";

    return (
      <div
        key={tool.id}
        onClick={() => router.push(tool.link || "#")}
        className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-teal-500/50 transition-all duration-300 shadow-lg hover:scale-105"
      >
        {tool.badge && (
          <div
            className={`absolute top-2 right-2 z-20 text-[10px] font-bold px-2 py-0.5 rounded-sm ${badgeClass}`}
          >
            {tool.badge}
          </div>
        )}
        <div className="absolute inset-0 bg-slate-800">
          {isVideo ? (
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
            >
              <source src={imageUrl} type="video/mp4" />
            </video>
          ) : (
            <img
              src={imageUrl}
              alt={tool.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement?.classList.add(
                  "bg-gradient-to-br",
                  "from-slate-700",
                  "to-slate-900"
                );
              }}
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
        <div className="absolute top-2 left-2 z-10 opacity-70 group-hover:opacity-100 transition-opacity"></div>
        <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col justify-end">
          <h3 className="text-xs md:text-sm font-bold text-white leading-tight mb-0.5 group-hover:text-teal-400 transition-colors">
            {tool.name}
          </h3>
          <p className="text-[10px] md:text-xs text-gray-300 line-clamp-1 opacity-90">
            {tool.description}
          </p>
        </div>
      </div>
    );
  };

  const renderModelCard = (model: any) => (
    <div
      key={model.id}
      onClick={() => router.push(model.link || "#")}
      className="group relative cursor-pointer glass-panel p-3 rounded-xl border border-white/5 hover:border-teal-400/40 bg-slate-900/40 hover:bg-slate-800/60 transition-all duration-300 flex items-center gap-3 hover:scale-105"
    >
      {model.badge && (
        <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
          {model.badge}
        </span>
      )}
      <div className="relative flex-shrink-0 h-12 w-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-teal-400/30 transition-colors">
        {model.icon ? (
          <img
            src={model.icon}
            alt={model.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-lg font-bold text-teal-400">
            {model.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex justify-between items-center pr-6">
          <h3 className="text-sm font-semibold text-gray-100 truncate group-hover:text-teal-400 transition-colors">
            {model.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded uppercase">
            {model.type}
          </span>
          <p className="text-xs text-gray-400 truncate flex-1">
            {model.description}
          </p>
        </div>
      </div>
    </div>
  );

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <div className="h-[80vh] w-full flex flex-col items-center justify-center gap-4 text-teal-500">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 animate-pulse">
          Loading dashboard assets...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* --- Carousel Section --- */}
      {slides.length > 0 ? (
        <section
          className="relative h-[40vh] md:h-[50vh] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-slate-900"
          onMouseEnter={pauseAutoPlay}
          onMouseLeave={resumeAutoPlay}
          onWheel={handleWheel}
        >
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={currentSlideIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="absolute inset-0 bg-cover bg-center touch-pan-y"
              style={{
                backgroundImage: `url(${slides[currentSlideIndex].imageUrl})`,
                backgroundColor: "#0f172a",
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent flex flex-col items-center justify-center text-center p-6">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg select-none"
                >
                  {slides[currentSlideIndex].title}
                </motion.h1>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-lg text-gray-200 mb-8 max-w-2xl drop-shadow-md select-none"
                >
                  {slides[currentSlideIndex].description}
                </motion.p>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-semibold btn-glow"
                    onClick={() =>
                      router.push(slides[currentSlideIndex].ctaLink || "#")
                    }
                  >
                    {slides[currentSlideIndex].ctaText}{" "}
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Arrows and Dots */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlideIndex
                    ? "w-6 bg-teal-400"
                    : "w-2 bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="h-[20vh] w-full flex items-center justify-center bg-slate-900/50 rounded-xl border border-white/10">
          <p className="text-gray-500">No active banners found.</p>
        </div>
      )}

      {/* --- Featured Tools --- */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-500">
            Featured Tools
          </h2>
          <Button
            variant="ghost"
            className="text-teal-400 hover:text-teal-300"
            onClick={() => router.push("/dashboard/tools")}
          >
            View All <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4 lg:hidden">
          {tools.slice(0, 9).map(renderToolCard)}
        </div>
        <div className="hidden lg:grid lg:grid-cols-6 gap-4">
          {tools.slice(0, 6).map(renderToolCard)}
        </div>
      </section>

      {/* --- Top Models --- */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-500">
            Latest AI Models
          </h2>
          <Button
            variant="ghost"
            className="text-teal-400 hover:text-teal-300"
            onClick={() => router.push("/dashboard/models")}
          >
            Explore All <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
          {models.slice(0, 5).map(renderModelCard)}
        </div>
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {models.slice(0, 8).map(renderModelCard)}
        </div>
      </section>
    </div>
  );
}
