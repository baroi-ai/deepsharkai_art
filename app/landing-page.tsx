// ❌ DO NOT ADD "use client" HERE. This must remain a Server Component.

import React from "react";
import Link from "next/link";
import {
  Feather,
  Lock,
  GitBranch,
  DollarSign,
  Zap,
  MonitorSmartphone,
  Palette,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Components
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeatureCard from "@/components/landing-page/feature-card"; // ✅ Use the new file
import ScrollObserver from "@/components/landing-page/scroll-observer"; // ✅ Use the new file
import AIModels from "@/components/AIModels";
import AITools from "@/components/AITools";
import Footer from "@/components/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* ✅ Client-side animations run here */}
      <ScrollObserver />

      <Navbar />
      <Hero />

      {/* ✅ Database Component (Now works because parent is Server Component) */}
      <AITools />

      {/* Features Section */}
      <section id="features" className="py-20 md:py-24 relative">
        <div className="absolute top-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-teal-500/20 to-transparent"></div>
        <div className="absolute top-40 left-20 w-72 h-72 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16 reveal">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">
              Powered by{" "}
              <span className="text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
                Open & Closed Source
              </span>{" "}
              Models
            </h2>
            <p className="text-lg text-gray-400">
              We've integrated the most advanced open & closed source AI models
              to give you unparalleled creative freedom.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 md:mb-20 reveal">
            {[
              {
                icon: Feather,
                title: "Simple Interface",
                description: "Experience AI models with Simple UI/UX.",
                glowPosition: "top-right",
              },
              {
                icon: Lock,
                title: "Privacy-First",
                description: "No data collection, no tracking.",
                glowPosition: "top-left",
              },
              {
                icon: GitBranch,
                title: "Latest AI Models",
                description: "Access a curated selection of powerful models.",
                glowPosition: "bottom-right",
              },
              {
                icon: DollarSign,
                title: "Pay Per Use",
                description: "Flexible coin-based system. No subscriptions.",
                glowPosition: "bottom-left",
              },
            ].map((feature, idx) => (
              <FeatureCard
                key={idx}
                title={feature.title}
                description={feature.description}
                glowPosition={feature.glowPosition as any}
              />
            ))}
          </div>

          {/* Secondary Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 reveal">
            {[
              {
                icon: Zap,
                title: "Lightning Fast",
                desc: "Optimized inference engines.",
              },
              {
                icon: MonitorSmartphone,
                title: "Cross Platform",
                desc: "Web, Android, and iOS.",
              },
              {
                icon: Palette,
                title: "Full Control",
                desc: "Fine-tune generation parameters.",
              },
            ].map((f, i) => (
              <div key={i} className="text-center group">
                <div className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-teal-500/50 transition-colors">
                  <f.icon className="h-6 w-6 text-teal-400" />
                </div>
                <h3 className="text-xl font-medium mb-3 text-white">
                  {f.title}
                </h3>
                <p className="text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ Database Component */}
      <AIModels />

      {/* Access Section */}
      <section id="access" className="py-20 md:py-24 relative">
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 reveal">
              Access Sharky AI{" "}
              <span className="text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]">
                Anywhere
              </span>
            </h2>
            <div className="flex flex-wrap gap-4 justify-center reveal">
              <Button
                className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium btn-glow px-8 py-3 md:py-4 text-base md:text-lg"
                asChild
              >
                <Link href="/download">
                  <Download className="mr-2 h-5 w-5" />
                  Download App
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
