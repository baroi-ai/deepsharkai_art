import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  ImagePlus,
  Video,
  AudioLines,
  Box,
  Sparkles,
} from "lucide-react";
import { db } from "../app/db";
import { aiTools } from "../app/db/schema";
import { desc } from "drizzle-orm";

// ✅ 1. CACHING
export const revalidate = 3600;

// ✅ 2. ICON MAPPER
const ICON_MAP: Record<string, any> = {
  ImagePlus: ImagePlus,
  Video: Video,
  AudioLines: AudioLines,
  Box: Box,
  default: Sparkles,
};

const AITools = async () => {
  // ✅ 3. FETCH FROM DB
  const tools = await db
    .select()
    .from(aiTools)
    .orderBy(desc(aiTools.id))
    .limit(11);

  return (
    <section id="tools" className="py-24 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 hero-gradient z-10"></div>
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/50 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-xl mx-auto text-center mb-12">
          <span className="mb-4 inline-block border border-teal-400/30 text-teal-400 px-3 py-1 text-sm rounded-md">
            Featured AI Tools
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Explore latest AI Tools
          </h2>
          <p className="text-gray-400 text-lg">
            Discover Ai Tools with Multiple Ai models.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {tools.map((tool, index) => {
            const imageUrl = tool.imageUrl || "";
            const isVideo =
              imageUrl.endsWith(".mp4") || imageUrl.endsWith(".webm");

            // ✅ 4. PYRAMID LAYOUT LOGIC (7 - 3 - 1)
            let positioningClass = "";
            if (index === 7) {
              positioningClass = "lg:col-start-3";
            } else if (index === 10) {
              positioningClass = "lg:col-start-4";
            }

            // ✅ 5. MOBILE HIDDEN LOGIC
            // If the item is the 10th or 11th (index 9 or 10), hide it on mobile, show on md and up.
            const mobileHiddenClass = index >= 9 ? "hidden md:block" : "";

            // ✅ 6. BADGE LOGIC
            const isFree = tool.badge?.toLowerCase().trim() === "free";
            const badgeClass = isFree
              ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.7)] ring-1 ring-emerald-300 animate-pulse border-none"
              : "bg-red-600/90 text-white shadow-md border border-red-500/20";

            return (
              <Link
                key={tool.id}
                href={tool.link || "#"}
                // Added mobileHiddenClass here 👇
                className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-teal-500/50 transition-all duration-300 shadow-lg hover:scale-105 ${positioningClass} ${mobileHiddenClass}`}
              >
                {/* Badge */}
                {tool.badge && (
                  <div
                    className={`absolute top-2 right-2 z-20 text-[10px] font-extrabold px-2 py-0.5 rounded-sm transition-all duration-300 ${badgeClass}`}
                  >
                    {tool.badge}
                  </div>
                )}

                {/* Media Background */}
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
                    />
                  )}
                </div>

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-3 flex flex-col justify-end">
                  <h3 className="text-xs md:text-sm font-bold text-white leading-tight mb-0.5 group-hover:text-teal-400 transition-colors">
                    {tool.name}
                  </h3>
                  <p className="text-[10px] md:text-xs text-gray-300 line-clamp-1 opacity-90">
                    {tool.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/dashboard/tools">
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black">
              Browse All Tools <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AITools;
