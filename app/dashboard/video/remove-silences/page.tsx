import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const SilenceRemoverClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Silence Remover...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free Video Silence Remover | Auto-Cut Pauses",
  description:
    "Automatically detect and remove dead air, silences, and long pauses from your videos. Fast, private, and runs entirely in your browser.",
  keywords: [
    "remove silence from video",
    "auto cut video",
    "jump cut generator",
    "dead air remover",
    "video pause cutter",
  ],
  openGraph: {
    title: "Free Video Silence Remover",
    description:
      "Automatically detect and remove dead air, silences, and long pauses from your videos.",
    images: ["/og-image.png"], // Update if you have a specific OG image
    type: "website",
  },
};

export default function SilenceRemoverPage() {
  return <SilenceRemoverClient />;
}
