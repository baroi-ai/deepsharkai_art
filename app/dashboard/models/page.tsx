"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ✅ React Query & Server Action
import { useQuery } from "@tanstack/react-query";
import { getModelsPaginated } from "@/app/actions/content-actions";

export default function ModelsPage() {
  const router = useRouter();

  // --- STATE ---
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce Search Input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- FETCH DATA (React Query) ---
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["models-page", page, debouncedSearch],
    queryFn: () => getModelsPaginated(page, debouncedSearch),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    placeholderData: (previousData) => previousData,
  });

  const models = data?.models || [];
  const pagination = data?.pagination || { totalPages: 1, currentPage: 1 };

  // --- RENDER CARD ---
  const renderModelCard = (model: any) => (
    <motion.div
      key={model.id}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={() => router.push(model.link || "#")}
      className="group relative cursor-pointer glass-panel p-3 rounded-xl border border-white/5 hover:border-teal-400/40 bg-slate-900/40 hover:bg-slate-800/60 transition-all duration-300 flex items-center gap-3 hover:scale-105"
    >
      {/* Badge */}
      {model.badge && (
        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
          {model.badge}
        </span>
      )}

      {/* Icon */}
      <div className="relative flex-shrink-0 h-14 w-14 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-teal-400/30 transition-colors">
        {model.icon ? (
          <img
            src={model.icon}
            alt={model.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="text-xl font-bold text-teal-400">
            {model.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Text Content */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex justify-between items-center pr-8">
          <h3 className="text-sm font-semibold text-gray-100 truncate group-hover:text-teal-400 transition-colors">
            {model.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded uppercase">
            {model.type}
          </span>
          {/* Rating */}
          <div className="flex items-center gap-0.5">
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
            <span className="text-[10px] text-gray-400">
              {model.rating || 5.0}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-400 truncate mt-1 w-full">
          {model.description}
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-7xl mx-auto w-full px-4">
      {/* --- Header & Search --- */}
      <div className="flex flex-col items-center text-center gap-4 py-8">
        <h1 className="text-3xl md:text-5xl font-bold text-white">
          Browse AI Models
        </h1>
        <p className="text-gray-400 max-w-2xl text-sm md:text-base">
          Explore the engine room of creation. Select from the world's best
          open-source and proprietary AI models for your specific needs.
        </p>

        <div className="relative w-full max-w-lg mt-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search models (e.g. 'Flux', 'Video', '3D')..."
            className="pl-10 py-6 bg-slate-900/50 border-white/10 text-white placeholder:text-gray-500 rounded-full focus-visible:ring-teal-500 focus-visible:border-teal-500 transition-all shadow-lg backdrop-blur-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- Loading State --- */}
      {isLoading && !isPlaceholderData ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-slate-900 animate-pulse border border-white/5"
            />
          ))}
        </div>
      ) : models.length > 0 ? (
        // --- Models Grid ---
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-2">
          {models.map(renderModelCard)}
        </div>
      ) : (
        // --- Empty State ---
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">
            No models found matching "{debouncedSearch}"
          </p>
          <button
            onClick={() => setSearchTerm("")}
            className="mt-2 text-teal-400 hover:underline"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* --- Pagination Controls --- */}
      {models.length > 0 && (
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
