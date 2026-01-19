"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Video,
  AudioLines,
  Box,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ✅ React Query
import { useQuery } from "@tanstack/react-query";
import { getToolsPaginated } from "@/app/actions/content-actions";

export default function ToolsPage() {
  const router = useRouter();

  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  // Debounce: Wait for user to stop typing
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- FETCH DATA (React Query) ---
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["tools-page", page, debouncedSearch], // Unique cache key
    queryFn: () => getToolsPaginated(page, debouncedSearch),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching new page
  });

  const tools = data?.tools || [];
  const pagination = data?.pagination || { totalPages: 1, currentPage: 1 };

  // --- RENDER CARD ---
  const renderToolCard = (tool: any) => {
    const imageUrl = tool.imageUrl || "";
    const isVideo = imageUrl.endsWith(".mp4") || imageUrl.endsWith(".webm");
    const badgeClass =
      "bg-red-600/90 text-white shadow-md border border-red-500/20";

    return (
      <motion.div
        key={tool.id}
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => router.push(tool.link || "#")}
        className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-teal-500/50 transition-all duration-300 shadow-lg hover:scale-105 bg-slate-900"
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

        <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col justify-end">
          <h3 className="text-sm md:text-base font-bold text-white leading-tight mb-0.5 group-hover:text-teal-400 transition-colors">
            {tool.name}
          </h3>
          <p className="text-[10px] md:text-xs text-gray-300 line-clamp-1 opacity-90">
            {tool.description}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full px-4">
      {/* --- Header & Search --- */}
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <h1 className="text-3xl md:text-5xl font-bold text-white">
          Explore AI Tools
        </h1>
        <p className="text-gray-400 max-w-2xl text-sm md:text-base">
          Discover our complete collection of generative AI tools. From video
          synthesis to voice cloning, find the perfect tool for your next
          project.
        </p>

        <div className="relative w-full max-w-lg mt-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search tools (e.g. 'video', 'voice', 'swap')..."
            className="pl-10 py-6 bg-slate-900/50 border-white/10 text-white placeholder:text-gray-500 rounded-full focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-all shadow-lg backdrop-blur-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- Loading State --- */}
      {isLoading && !isPlaceholderData ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-slate-900 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : tools.length > 0 ? (
        // --- Tools Grid ---
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tools.map(renderToolCard)}
        </div>
      ) : (
        // --- Empty State ---
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No tools found matching "{debouncedSearch}"</p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-2 text-teal-400 hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* --- Pagination Controls --- */}
      {tools.length > 0 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((old) => Math.max(old - 1, 1))}
            disabled={page === 1}
            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm text-gray-400">
            Page <span className="text-white font-bold">{page}</span> of{" "}
            {pagination.totalPages}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setPage((old) => (old < pagination.totalPages ? old + 1 : old))
            }
            disabled={page === pagination.totalPages}
            className="border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
