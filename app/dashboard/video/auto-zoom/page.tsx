import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const AutoZoomClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Auto Zoom Editor...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free AI Video Auto Zoom | Add Dynamic Zoom Cuts",
  description:
    "Automatically add dynamic zoom cuts and camera movements to your videos using AI. Save time editing. Runs 100% locally in your browser.",
  keywords: [
    "auto zoom video",
    "video zoom effect",
    "ai video editor",
    "dynamic zoom cuts",
    "browser video editor",
  ],
  openGraph: {
    title: "Free AI Video Auto Zoom",
    description:
      "Automatically add dynamic zoom cuts and camera movements to your videos using AI. No login required.",
    images: ["/og-image.png"], // Update if you have a specific OG image
    type: "website",
  },
};

export default function AutoZoomPage() {
  return <AutoZoomClient />;
}
