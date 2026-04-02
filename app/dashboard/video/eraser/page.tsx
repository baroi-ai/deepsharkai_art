import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const VideoEraserClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading AI Video Eraser...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free Video Watermark Remover | AI Video Magic Eraser",
  description:
    "Remove watermarks, logos, text, and unwanted objects from your videos for free. Runs 100% locally in your browser using AI for total privacy.",
  keywords: [
    "video watermark remover",
    "video magic eraser",
    "remove object from video",
    "erase logo from video",
    "free video editor",
  ],
  openGraph: {
    title: "Free Video Watermark Remover | DeepShark AI",
    description:
      "Remove watermarks, logos, and unwanted objects from your videos for free. No login required.",
    images: ["/og-image.png"], // Update if you have a specific OG image
    type: "website",
  },
};

export default function VideoEraserPage() {
  return <VideoEraserClient />;
}
