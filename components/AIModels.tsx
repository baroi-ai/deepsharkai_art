import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { db } from "../app/db";
import { aiModels } from "../app/db/schema";
import { desc, eq } from "drizzle-orm";

// ✅ 1. CACHING STRATEGY
// Fetch once on server build, then re-generate every hour (3600s).
// This makes the page load instantly (Static HTML) while staying updated.
export const revalidate = 3600;

const AIModels = async () => {
  // ✅ 2. FETCH FROM DB
  const models = await db
    .select()
    .from(aiModels)
    .orderBy(desc(aiModels.id)) // Latest first
    .limit(12); // Fetch max 12 items

  // Consistent Teal Badge Style
  const badgeClass = "bg-teal-500/10 text-teal-400 border border-teal-500/20";

  return (
    <section
      id="ai-models"
      className="py-24 relative overflow-hidden bg-slate-900/30"
    >
      <div className="absolute inset-0 hero-gradient z-10"></div>

      {/* Top Fade */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/50 to-transparent z-20 pointer-events-none"></div>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-xl mx-auto text-center mb-12">
          <span className="mb-4 inline-block border border-teal-400/30 text-teal-400 px-3 py-1 text-sm rounded-md">
            Featured AI Models
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Explore latest AI Models
          </h2>
          <p className="text-gray-400 text-lg">
            Discover ready-to-use models for images, video, and more.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {models.map((model, index) => {
            // ✅ 3. RESPONSIVE LOGIC
            // - Show first 5 items on ALL screens (index 0-4)
            // - Hide items from index 5 onwards on mobile (hidden), show on desktop (lg:flex)
            const responsiveClass = index >= 5 ? "hidden lg:flex" : "flex";

            return (
              <Link
                key={model.id}
                href={model.link || "#"}
                className={`group relative cursor-pointer bg-[#0B1221] border border-white/5 hover:border-teal-500/30 rounded-xl p-4 items-center gap-4 transition-all duration-300 hover:scale-[1.02] ${responsiveClass}`}
              >
                {/* Badge (Top Right) */}
                {model.badge && (
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded ${badgeClass}`}
                  >
                    {model.badge}
                  </span>
                )}

                {/* Icon */}
                <div className="relative flex-shrink-0 h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
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

                {/* Content */}
                <div className="flex flex-col min-w-0 flex-1 justify-center">
                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-teal-400 transition-colors pr-10">
                    {model.name}
                  </h3>

                  {/* Type Tag + Description Row */}
                  <div className="flex items-center gap-2">
                    <span className="bg-[#1A2333] text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border border-white/5">
                      {model.type} {/* DB Column Name */}
                    </span>
                    <p className="text-xs text-gray-400 truncate">
                      {model.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link href="/dashboard/models">
            <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black">
              Browse All Models <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AIModels;
