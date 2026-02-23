import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ Optimized Dynamic Import
const ImageBgRemoverPage = dynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Background Remover...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title:
    "Free Forever AI Background Remover | Remove Image Backgrounds Instantly",
  description:
    "Remove backgrounds from images in seconds using AI. Upload your photo and get a transparent background automatically. High quality and easy to use.",
  keywords: [
    "background remover",
    "remove bg",
    "transparent background",
    "ai background removal",
    "free photo editor",
    "png maker",
    "free forever",
    "free background remover",
  ],
  openGraph: {
    title: "Free AI Background Remover",
    description: "Remove backgrounds from images instantly with AI.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ImageBgRemoverPage />;
}
