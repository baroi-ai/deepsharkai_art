import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const VideoCaptionerClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading AI Captioner...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free AI Video Captioner | Add Viral Subtitles Instantly",
  description:
    "Automatically generate and edit viral, Hormozi-style captions for your videos. 100% private, runs locally in your browser. No watermarks, completely free.",
  keywords: [
    "auto captions",
    "ai subtitle generator",
    "hormozi captions",
    "add text to video",
    "free video captioner",
    "viral video editor",
    "auto transcribe video",
  ],
  openGraph: {
    title: "Free AI Video Captioner | DeepShark AI",
    description:
      "Automatically generate viral, Hormozi-style captions for your videos. Runs 100% locally in your browser. No login required.",
    images: ["/og-image.png"],
    type: "website",
  },
};

export default function VideoCaptionerPage() {
  return <VideoCaptionerClient />;
}
