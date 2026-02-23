import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ Optimized Dynamic Import
const ImageGenerationPage = dynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Image Generator...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Image Generator | Create Art with Flux & Recraft",
  description:
    "Generate stunning AI art instantly. Support for Flux Dev, Recraft V3, and DALL-E style models. Create realistic photos, anime, and 3D renders from text.",
  keywords: [
    "ai image generator",
    "text to image",
    "flux dev",
    "recraft v3",
    "free ai art",
    "stable diffusion alternative",
    "ai photo generator",
  ],
  openGraph: {
    title: "Free AI Image Generator - Text to Image",
    description:
      "Create amazing images with the best AI models like Flux and Recraft.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ImageGenerationPage />;
}
