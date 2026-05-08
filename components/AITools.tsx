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
  Bolt,
} from "lucide-react";

// ✅ HARDCODED STATIC DATA
const staticTools = [
  {
    id: 1,
    name: "Image eraser",
    description: "Remove any object from image",
    image_url: "/tools/magic_eraser.webm",
    link: "/dashboard/image/eraser",
    badge: "Free",
  },
  {
    id: 2,
    name: "Caption Generator",
    description: "Generate caption for free",
    image_url: "/tools/caption-tool.webm",
    link: "/dashboard/video/caption",
    badge: "Free",
  },
  {
    id: 3,
    name: "Motion Generator",
    description:
      "Render beautiful 3D motion graphics instantly from text using AI.",
    imageUrl: "/tools/motions-tool.webm",
    link: "/dashboard/video/motions",
    badge: "Free",
  },
  {
    id: 4,
    name: "Bg Remover",
    description: "Remove Any Image background",
    image_url: "/tools/image-bg-remover-toll.webm",
    link: "/dashboard/image/bg-remover",
    badge: "Free",
  },
  {
    id: 5,
    name: "Video Eraser",
    description:
      "Remove watermarks, logos, text, and unwanted objects from videos.",
    imageUrl: "/tools/video-eraser.webm",
    link: "/dashboard/video/eraser",
    badge: "Free",
  },
  {
    id: 6,
    name: "Transcriber",
    description: "Transcribe Any audio or video file",
    imageUrl: "/tools/transciber.webm",
    link: "/dashboard/text/transcribe",
    badge: "Free",
  },
  {
    id: 7,
    name: "Auto Zoom Video",
    description:
      "Automatically add dynamic zoom cuts and camera movements to your videos.",
    imageUrl: "/tools/Auto-zoom.webm",
    link: "/dashboard/video/auto-zoom",
    badge: "Free",
  },
  {
    id: 8,
    name: "Image Relight",
    description: "Relight any image with different lighting conditions.",
    image_url: "/tools/relight-tools.webm",
    link: "/dashboard/image/relight",
    badge: "hot",
    category: "Image"
  },
  {
    id: 9,
    name: "Upscaler",
    description: "Instantly upscale you images in 4K",
    imageUrl: "/tools/image-upsclaer-tool.webm",
    link: "/dashboard/image/upscaler",
    badge: "Hot",
  },
  {
    id: 10,
    name: "Skin Enhancer",
    description: "Get red of ai plastic skin",
    imageUrl: "/tools/skin-enchor-tool.webm",
    link: "/dashboard/image/skin-enhancer",
    badge: null,
  },
  {
    id: 11,
    name: "Layers",
    description: "Extract Layers from image",
    imageUrl: "/tools/decompose.webm",
    link: "/dashboard/image/layers",
    badge: "Hot",
  },
  {
    id: 12,
    name: "Image Editor",
    description: "Edit image with text and inpaint",
    imageUrl: "/tools/image-editor-tool.webm",
    link: "/dashboard/image/edit",
    badge: null,
  },
];

const AITools = () => {
  // We slice the array to exactly 11 items to make the perfect 7 - 3 - 1 pyramid
  const toolsToDisplay = staticTools.slice(0, 11);

  return (
    <section id="tools" className="py-24 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 hero-gradient z-10"></div>
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-950 via-slate-950/50 to-transparent z-20 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-950 to-transparent z-20"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-xl mx-auto text-center mb-12">
          <span className="mb-4 inline-flex items-center gap-2 border border-teal-400/30 text-teal-400 px-3 py-1 text-sm rounded-md bg-teal-500/10">
            <Bolt className="w-4 h-4" /> Featured AI Tools
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Explore{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              latest AI Tools
            </span>
          </h2>
          <p className="text-gray-400 text-lg">
            Discover Ai Tools with Multiple Ai models.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {toolsToDisplay.map((tool, index) => {
            // Safely grab the URL regardless of whether the array uses image_url or imageUrl
            const imageUrl = tool.imageUrl || (tool as any).image_url || "";
            const isVideo =
              imageUrl.endsWith(".mp4") || imageUrl.endsWith(".webm");

            // ✅ PYRAMID LAYOUT LOGIC (7 - 3 - 1)
            let positioningClass = "";
            if (index === 7) {
              // The 8th item (starts the row of 3) is pushed to the 3rd column
              positioningClass = "lg:col-start-3";
            } else if (index === 10) {
              // The 11th item (the final single item) is pushed to the 4th (center) column
              positioningClass = "lg:col-start-4";
            }

            // ✅ MOBILE DEVICE LOGIC (Only show first 9 items on mobile)
            const mobileHiddenClass = index >= 9 ? "hidden md:block" : "";

            // BADGE LOGIC
            const isFree = tool.badge?.toLowerCase().trim() === "free";
            const badgeClass = isFree
              ? "bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.7)] ring-1 ring-emerald-300 animate-pulse border-none"
              : "bg-red-600/90 text-white shadow-md border border-red-500/20";

            return (
              <Link
                key={tool.id}
                href={tool.link || "#"}
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
                      <source src={imageUrl} type="video/webm" />
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
