import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import for Motion Engine
const MotionGenerationClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin" />
          <Sparkles className="h-4 w-4 absolute -top-1 -right-1 text-teal-400 animate-pulse" />
        </div>
        <p className="text-gray-400 text-sm animate-pulse tracking-wide">
          Initializing 3D Motion Engine...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free AI 3D Motion Graphic Generator | Text to Animation",
  description:
    "Create professional 3D motion graphics and social media animations instantly. Turn text or images into high-end video content. Runs 100% in your browser using Remotion technology.",
  keywords: [
    "AI motion graphics",
    "3D text animation",
    "Remotion generator",
    "free video animations",
    "social media motion design",
    "text to video graphics",
    "browser based video editor",
  ],
  openGraph: {
    title: "Free AI 3D Motion Graphic Generator",
    description:
      "Turn text and images into professional 3D animations instantly. No server costs, 100% private browser rendering.",
    images: ["/og-motion.png"], // Make sure to create this image later
    type: "website",
  },
};

export default function MotionGenerationPage() {
  return <MotionGenerationClient />;
}
