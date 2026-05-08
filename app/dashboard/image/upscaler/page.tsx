import { Metadata } from "next";
// ✅ FIX: Rename the import to `nextDynamic` to avoid the naming conflict!
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ THE MAGIC BULLET (Leaves the Next.js route config perfectly intact)
export const dynamic = "force-dynamic";

// ✅ Use `nextDynamic` here instead
const ImageUpscalerPage = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Upscaler...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Image Upscaler | Enhance & Enlarge Photos to 4K",
  description:
    "Upscale low-resolution images instantly with AI. Enhance details, clarity, and resolution up to 4K without quality loss. Turn blurry photos into HD.",
  keywords: [
    "ai image upscaler",
    "photo enhancer",
    "image enlarger",
    "4k upscaling",
    "fix blurry images",
    "high resolution maker",
    "super resolution",
  ],
  openGraph: {
    title: "AI Image Upscaler - Enlarge Photos to 4K",
    description:
      "Turn low-res photos into high-definition masterpieces. AI-powered upscaling up to 4x resolution.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ImageUpscalerPage />;
}
