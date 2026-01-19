"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Marquee from "react-fast-marquee";
import { AuthModal } from "@/components/AuthModal";
import { useSession } from "next-auth/react";

const MOBILE_BREAKPOINT = 768;

// ✅ ADDED: Custom CSS for the snake border effect
const SNAKE_BORDER_CSS = `
  @keyframes snake-rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .snake-border-container {
    position: relative;
    border-radius: 1rem; /* Matches rounded-2xl */
    overflow: hidden;
    padding: 2px; /* Controls the thickness of the snake border */
    /* Optional: add a subtle glow behind it */
    box-shadow: 0 0 20px rgba(45, 212, 191, 0.2); 
  }

  /* The spinning gradient "snake" */
  .snake-border-container::before {
    content: "";
    position: absolute;
    z-index: 0;
    left: -50%;
    top: -50%;
    width: 200%;
    height: 200%;
    background: conic-gradient(
      transparent, 
      transparent, 
      transparent, 
      #2dd4bf /* The tail color (teal-400) */, 
      #ffffff /* The leading head color (white for shine) */
    );
    animation: snake-rotate 4s linear infinite; /* Adjust speed here (e.g., 3s for faster) */
  }

  /* The inner content placed on top to mask the center */
  .snake-border-content {
    position: relative;
    z-index: 1;
    border-radius: inherit;
    height: 100%;
    width: 100%;
    /* Ensure the background is solid enough to hide the gradient behind it */
    background-color: rgba(15, 23, 42, 0.9); /* slate-900 with high opacity */
  }
`;

const leftAITools = [
  { name: "Flux", icon: "/icons/flux.png" },
  { name: "Ideogram", icon: "/icons/ideogram.png" },
  { name: "Minimax", icon: "/icons/minimax.png" },
  { name: "Wan", icon: "/icons/wan.png" },
  { name: "Google Veo", icon: "/icons/google.png" },
];

const rightAITools = [
  { name: "Luma", icon: "/icons/luma.png" },
  { name: "Recraft", icon: "/icons/recraft.png" },
  { name: "Kling", icon: "/icons/kling.png" },
  { name: "Hunyuan", icon: "/icons/hunyuan.png" },
  { name: "Pixverser", icon: "/icons/pixverser.png" },
  { name: "Hailuo", icon: "/icons/hailuo.png" },
];

const Hero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75;
    }
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const videoSources = {
    desktop: {
      webm: "/videos/hero-background.webm",
      mp4: "/videos/hero-background.mp4",
    },
    mobile: {
      webm: "/videos/hero-background-mobile.webm",
      mp4: "/videos/hero-background-mobile.mp4",
    },
  };

  const currentSources = isMobile ? videoSources.mobile : videoSources.desktop;

  return (
    <section className="relative min-h-screen flex flex-col justify-start overflow-hidden pt-20 pb-20 md:pt-24">
      {/* ✅ Inject custom CSS */}
      <style jsx>{SNAKE_BORDER_CSS}</style>

      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-slate-900/60 z-10"></div>
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="object-cover w-full h-full opacity-50"
          key={isMobile ? "mobile-video" : "desktop-video"}
          poster="/videos/hero-poster.webp"
        >
          <source src={currentSources.webm} type="video/webm" />
          <source src={currentSources.mp4} type="video/mp4" />
        </video>
      </div>
      <div className="absolute inset-0 hero-gradient z-10"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-20">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          <div className="space-y-4 mb-8">
            <div className="inline-block px-3 py-1 rounded-full bg-slate-800/80 backdrop-blur-sm border border-teal-400/20 text-sm">
              <span className="text-gray-300">AI Models & Tools</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block">AI Image Studio</span>
              <span className="text-teal-400 mt-2 block drop-shadow-[0_0_8px_rgba(20,184,166,0.5)] whitespace-nowrap text-3xl md:text-6xl lg:text-7xl">
                Generate • Upscale • Edit
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
              Create AI images, videos, and more using Multiple AI models.
            </p>
          </div>

          <div className="w-full max-w-6xl mx-auto my-8">
            <div className="flex items-center justify-center">
              <div className="w-1/2">
                <Marquee
                  gradient={false}
                  speed={30}
                  direction="right"
                  pauseOnHover={true}
                >
                  {leftAITools.map((tool, index) => (
                    <div key={index} className="mx-4 flex-shrink-0">
                      <div className="glass-panel p-3 rounded-xl flex items-center justify-center border border-white/5">
                        <img
                          src={tool.icon}
                          alt={tool.name}
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </Marquee>
              </div>

              {/* ✅ MODIFIED: Center Logo with Snake Border Effect */}
              <div className="px-4 md:px-8 flex-shrink-0">
                {/* The Outer Container with the spinning pseudo-element */}
                <div className="snake-border-container shadow-lg">
                  {/* The Inner Content masking the center */}
                  <div className="snake-border-content glass-panel p-4 flex items-center justify-center">
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                </div>
              </div>
              {/* ✅ END MODIFICATION */}

              <div className="w-1/2">
                <Marquee
                  gradient={false}
                  speed={30}
                  direction="left"
                  pauseOnHover={true}
                >
                  {rightAITools.map((tool, index) => (
                    <div key={index} className="mx-4 flex-shrink-0">
                      <div className="glass-panel p-3 rounded-xl flex items-center justify-center border border-white/5">
                        <img
                          src={tool.icon}
                          alt={tool.name}
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                    </div>
                  ))}
                </Marquee>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <Button
              className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium btn-glow px-8 py-6 text-lg"
              asChild
            >
              <Link href={isAuthenticated ? "/dashboard" : "/dashboard"}>
                {isAuthenticated ? "Start Creating" : "Start Creating"}{" "}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>

            {!isAuthenticated && (
              <AuthModal
                defaultTab="signup"
                trigger={
                  <Button
                    variant="outline"
                    className="border-teal-400/30 hover:border-teal-400/60 text-gray-100 px-8 py-6 text-lg hidden sm:inline-flex"
                  >
                    Sign up
                  </Button>
                }
              />
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>
    </section>
  );
};

export default Hero;
