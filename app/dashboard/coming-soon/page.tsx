"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, Construction, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ComingSoonPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[80vh] p-6 text-center text-gray-400 animate-in fade-in duration-500">
      <div className="relative mb-6">
        {/* Glow effect matching button theme */}
        <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 rounded-full blur-xl opacity-50" />

        <div className="relative bg-gray-900/80 p-6 rounded-2xl border border-gray-800 shadow-2xl">
          <Construction className="h-16 w-16 text-teal-400" />
        </div>

        {/* Decorative sparkle */}
        <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-teal-400 animate-pulse" />
      </div>

      <h1 className="text-3xl font-bold text-gray-100 mb-3">Coming Soon</h1>

      <p className="max-w-md text-base text-gray-500 leading-relaxed mb-8">
        We are currently building this feature.
        <br />
        It will be available shortly.
      </p>

      {/* Return Button with Cyan-Teal Gradient */}
      <Link href="/dashboard">
        <Button className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg transition-all hover:scale-105 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};

export default ComingSoonPage;
