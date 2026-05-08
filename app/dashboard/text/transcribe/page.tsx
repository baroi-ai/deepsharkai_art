import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const MediaToTextClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[calc(100vh-80px)] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Transcriber Engine...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  // ✅ Front-load both Audio & Video for search engines
  title: "Free Audio & Video to Text Transcriber | Offline AI",
  description:
    "Convert audio and video files to text instantly with our free AI transcriber. Runs 100% locally in your browser for total privacy and zero data uploads.",
  keywords: [
    "audio to text converter",
    "video to text",
    "free transcription tool",
    "mp3 to text",
    "mp4 to text",
    "offline transcriber",
    "browser-based transcription",
    "unlimited audio transcription",
    "whisper ai transcription",
  ],
  openGraph: {
    title: "Free AI Audio & Video Transcriber",
    description:
      "Transcribe MP3s, videos, and voice memos to text instantly. No limits, totally free, and runs securely in your browser.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Audio & Video Transcriber",
    description:
      "Convert audio and video files to text instantly. Runs 100% locally in your browser.",
    images: ["/og-image.png"],
  },
};

export default function TranscribePage() {
  return <MediaToTextClient />;
}
