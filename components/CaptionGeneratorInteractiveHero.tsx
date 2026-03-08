"use client";

import React from "react";
import {
  ArrowRight,
  ShieldCheck,
  WifiOff,
  Zap,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CaptionGeneratorHero() {
  return (
    <section
      id="caption-generator-hero"
      className="py-24 relative w-full overflow-hidden bg-slate-950 flex flex-col items-center justify-center px-4 md:px-6"
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-900/20 via-slate-950 to-slate-950 -z-10" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/50 to-transparent z-20 pointer-events-none"></div>

      {/* 🌟 HEADER TEXT 🌟 */}
      <div className="flex flex-col items-center text-center z-30 mb-10 max-w-2xl mx-auto">
        <span className="mb-4 inline-flex items-center gap-2 border border-teal-400/30 text-teal-400 px-3 py-1 text-sm rounded-md bg-teal-500/10">
          <MessageSquare className="w-4 h-4" /> AI Video Captions
        </span>
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white leading-tight">
          Free{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
            AI Captioner.
          </span>
        </h2>
        <p className="text-gray-400 text-lg mb-6">
          100% Free forever. Runs entirely offline in your browser for privacy.
        </p>
      </div>

      {/* 🌟 9:16 VERTICAL VIDEO PLAYER 🌟 */}
      <div className="relative w-full max-w-[300px] sm:max-w-[340px] aspect-[9/16] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(20,184,166,0.15)] bg-black z-30 ring-1 ring-white/5">
        {/* 👈 PUT YOUR DEMO VIDEO PATH HERE */}
        <video
          src="/tools/captions.webm"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Top "AI Captioned" Badge floating over the video */}
        <div className="absolute top-4 left-4 bg-teal-500/90 backdrop-blur-sm text-black text-[10px] md:text-xs font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-widest">
          AI Captioned
        </div>
      </div>

      {/* Call to Action */}
      <div className="text-center mt-12 z-30">
        <Link href="/dashboard/video/caption">
          <Button className="h-12 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black px-8 rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all hover:scale-105 font-bold text-base">
            Try Caption Generator <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </section>
  );
}
