"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowRight,
  LayoutGrid,
  BadgeDollarSign,
  ImageIcon,
  Video,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { getDashboardContent } from "@/app/actions/content-actions";

// ---------------------------------------------------------------------------
// ToolCard — unchanged
// ---------------------------------------------------------------------------
const ToolCard = ({ tool, router }: { tool: any; router: any }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const imageUrl = tool.imageUrl || "";
  const isVideo = imageUrl.endsWith(".mp4") || imageUrl.endsWith(".webm");
  const isFree = tool.badge?.toLowerCase().trim() === "free";

  const badgeClass = isFree
    ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.7)] ring-1 ring-emerald-300 animate-pulse border-none"
    : "bg-red-600/90 text-white shadow-md border border-red-500/20";

  useEffect(() => {
    if (!isVideo || !videoRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVideoLoaded(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [isVideo]);

  return (
    <div
      onClick={() => router.push(tool.link || "#")}
      className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-teal-500/50 transition-all duration-300 shadow-lg hover:scale-105 bg-slate-900"
      role="button"
      tabIndex={0}
      aria-label={`Open ${tool.name}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(tool.link || "#");
      }}
    >
      {tool.badge && (
        <div
          className={`absolute top-2 right-2 z-20 text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${badgeClass}`}
        >
          {tool.badge}
        </div>
      )}
      <div className="absolute inset-0 bg-slate-800" aria-hidden="true">
        {isVideo ? (
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
          >
            {isVideoLoaded && <source src={imageUrl} type="video/mp4" />}
          </video>
        ) : (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 768px) 33vw, 11vw"
            className="object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
          />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
      <div className="absolute bottom-0 left-0 w-full p-2 md:p-2.5 flex flex-col justify-end">
        <h3 className="text-[11px] md:text-xs font-bold text-white leading-tight mb-0.5 group-hover:text-teal-400 transition-colors truncate">
          {tool.name}
        </h3>
        <p className="text-[9px] md:text-[10px] text-gray-300 line-clamp-1 opacity-90">
          {tool.description}
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ModelCard — unchanged
// ---------------------------------------------------------------------------
const ModelCard = ({ model, router }: { model: any; router: any }) => (
  <div
    onClick={() => router.push(model.link || "#")}
    className="group relative cursor-pointer glass-panel p-3 rounded-xl border border-white/5 hover:border-teal-400/40 bg-slate-900/40 hover:bg-slate-800/60 transition-all duration-300 flex items-center gap-3 hover:scale-105"
    role="button"
    tabIndex={0}
    aria-label={`View model ${model.name}`}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") router.push(model.link || "#");
    }}
  >
    {model.badge && (
      <span className="absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
        {model.badge}
      </span>
    )}
    <div className="relative flex-shrink-0 h-12 w-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-teal-400/30 transition-colors">
      {model.icon ? (
        <Image
          src={model.icon}
          alt=""
          fill
          sizes="48px"
          className="object-cover"
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

// ---------------------------------------------------------------------------
// Filter config
// ---------------------------------------------------------------------------
const FILTERS = [
  { key: "all", label: "All", Icon: LayoutGrid },
  { key: "free", label: "Free", Icon: BadgeDollarSign },
  { key: "image", label: "Image", Icon: ImageIcon },
  { key: "video", label: "Video", Icon: Video },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function filterTools(tools: any[], active: FilterKey): any[] {
  if (active === "all") return tools;
  if (active === "free")
    return tools.filter((t) => t.badge?.toLowerCase().trim() === "free");
  return tools.filter((t) => t.category?.toLowerCase().trim() === active);
}

// ---------------------------------------------------------------------------
// Carousel variants
// ---------------------------------------------------------------------------
const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? "100%" : "-100%", opacity: 1 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d < 0 ? "100%" : "-100%", opacity: 1 }),
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function DashboardPageClient() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-content"],
    queryFn: () => getDashboardContent(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const slides = data?.slides || [];
  const tools = data?.tools || [];
  const models = data?.models || [];

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const filteredTools = filterTools(tools, activeFilter);

  // Carousel
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    if (!slides.length) return;
    setDirection(1);
    setCurrentSlideIndex((p) => (p === slides.length - 1 ? 0 : p + 1));
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    if (!slides.length) return;
    setDirection(-1);
    setCurrentSlideIndex((p) => (p === 0 ? slides.length - 1 : p - 1));
  }, [slides.length]);

  const goToSlide = (i: number) => {
    setDirection(i > currentSlideIndex ? 1 : -1);
    setCurrentSlideIndex(i);
  };

  useEffect(() => {
    if (slides.length) autoPlayRef.current = setInterval(nextSlide, 5000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [nextSlide, slides.length]);

  const pauseAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
  };
  const resumeAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    if (slides.length) autoPlayRef.current = setInterval(nextSlide, 5000);
  };
  const handleDragEnd = (_e: any, info: PanInfo) => {
    if (info.offset.x < -50) nextSlide();
    else if (info.offset.x > 50) prevSlide();
  };

  // Skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 pb-20 animate-pulse">
        <div className="h-[40vh] md:h-[50vh] w-full bg-slate-900/50 rounded-2xl border border-white/5" />
        <div className="space-y-4">
          <div className="h-8 w-48 bg-slate-900/50 rounded-md" />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-24 bg-slate-900/50 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-slate-900/50 rounded-xl border border-white/5"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* ------------------------------------------------------------------ */}
      {/* Carousel                                                             */}
      {/* ------------------------------------------------------------------ */}
      {slides.length > 0 ? (
        <section
          className="no-sidebar-swipe relative h-[40vh] md:h-[50vh] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 group bg-slate-900"
          onMouseEnter={pauseAutoPlay}
          onMouseLeave={resumeAutoPlay}
          aria-label="Featured Announcements"
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
              className="absolute inset-0 touch-pan-y"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={1}
              onDragEnd={handleDragEnd}
            >
              <Image
                src={slides[currentSlideIndex].imageUrl}
                alt=""
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent flex flex-col items-center justify-center text-center p-6 z-10">
                <motion.h1
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-3xl md:text-5xl font-bold mb-4 text-white drop-shadow-lg select-none"
                >
                  {slides[currentSlideIndex].title}
                </motion.h1>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-base md:text-lg text-gray-200 mb-8 max-w-2xl drop-shadow-md select-none"
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

          <button
            onClick={prevSlide}
            aria-label="Previous Slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 focus:opacity-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            aria-label="Next Slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 focus:opacity-100"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className="p-2 focus:outline-none"
              >
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${i === currentSlideIndex ? "w-6 bg-teal-400" : "w-2 bg-white/50 hover:bg-white/80"}`}
                />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <div className="h-[20vh] w-full flex items-center justify-center bg-slate-900/50 rounded-xl border border-white/10">
          <p className="text-gray-500">No active banners found.</p>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Featured Tools                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section>
        {/* Top row: title + View All */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-500">
            Featured Tools
          </h2>
          <Button
            asChild
            variant="ghost"
            className="text-teal-400 hover:text-teal-300"
          >
            <Link href="/dashboard/tools" aria-label="View all AI Tools">
              View All Tools <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-none">
          {FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                aria-pressed={isActive}
                className={`
                  relative flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
                  text-xs font-semibold transition-all duration-200 border
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500
                  ${
                    isActive
                      ? "bg-teal-500/20 border-teal-500/60 text-teal-300 shadow-[0_0_14px_rgba(20,184,166,0.25)]"
                      : "bg-slate-800/60 border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 hover:bg-slate-700/60"
                  }
                `}
              >
                <f.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{f.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="filter-active-ring"
                    className="absolute inset-0 rounded-full border border-teal-400/50 pointer-events-none"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tool grid — fades when filter changes */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {filteredTools.length > 0 ? (
              <>
                {/* Mobile: 3 cols */}
                <div className="grid grid-cols-3 gap-3 md:gap-4 lg:hidden">
                  {filteredTools.slice(0, 9).map((tool: any) => (
                    <ToolCard key={tool.id} tool={tool} router={router} />
                  ))}
                </div>
                {/* Desktop: 9 cols */}
                <div className="hidden lg:grid lg:grid-cols-9 lg:gap-3 xl:gap-4">
                  {filteredTools.slice(0, 9).map((tool: any) => (
                    <ToolCard key={tool.id} tool={tool} router={router} />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-32 rounded-xl border border-white/5 bg-slate-900/30">
                <p className="text-gray-500 text-sm">
                  No tools in this category yet.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Latest Models                                                        */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-teal-500">
            Latest Models
          </h2>
          <Button
            asChild
            variant="ghost"
            className="text-teal-400 hover:text-teal-300"
          >
            <Link href="/dashboard/models" aria-label="Explore all AI Models">
              View All Models <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
          {models.slice(0, 5).map((model: any) => (
            <ModelCard key={model.id} model={model} router={router} />
          ))}
        </div>
        <div className="hidden lg:grid lg:grid-cols-4 gap-4">
          {models.slice(0, 8).map((model: any) => (
            <ModelCard key={model.id} model={model} router={router} />
          ))}
        </div>
      </section>
    </div>
  );
}
