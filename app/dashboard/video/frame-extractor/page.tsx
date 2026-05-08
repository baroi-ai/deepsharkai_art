import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const FrameExtractorClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Frame Extractor...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free Video Frame Extractor | Save Video Frames as Images",
  description:
    "Extract high-quality images from any video instantly. Save first, middle, or last frames, or capture custom moments. No login required, runs 100% in your browser.",
  keywords: [
    "video to image",
    "frame extractor",
    "video screenshot",
    "save video frame",
    "thumbnail generator",
  ],
  openGraph: {
    title: "Free Video Frame Extractor",
    description:
      "Extract high-quality images from any video instantly. No login required.",
    images: ["/og-image.png"],
    type: "website",
  },
};

export default function FrameExtractorPage() {
  return <FrameExtractorClient />;
}
