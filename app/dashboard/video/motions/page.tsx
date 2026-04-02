import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Removed `ssr: false` to comply with Next.js Server Component rules
const MotionGeneratorClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading AI Motion Renderer...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free AI Motion Graphic Generator | Render Code to Video",
  description:
    "Generate beautiful React Remotion graphics using our Custom GPT, then render them instantly in your browser. 100% free, runs locally.",
  keywords: [
    "AI motion graphics",
    "remotion generator",
    "react video animation",
    "browser video renderer",
    "text to motion graphics",
  ],
  openGraph: {
    title: "Free AI Motion Graphic Generator",
    description:
      "Instantly render 3D motion graphics and animations in your browser using AI-generated React code. No login required.",
    images: ["/og-image.png"], // Update if you have a specific OG image
    type: "website",
  },
};

export default function MotionGeneratorPage() {
  return <MotionGeneratorClient />;
}
