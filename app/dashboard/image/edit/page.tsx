import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ Optimized Dynamic Import
const ImageEditingPage = dynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Magic Editor...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Magic Image Editor | Inpaint & Edit Images with AI",
  description:
    "Upload an image, brush over any area, and describe what you want to change. Use AI to add objects, remove defects, or completely transform your photos instantly.",
  keywords: [
    "ai image editor",
    "ai inpainting",
    "magic edit",
    "photo editor",
    "replace object in photo",
    "generative fill",
    "ai photo manipulation",
  ],
  openGraph: {
    title: "AI Magic Image Editor - Edit Photos with Text",
    description:
      "Brush over an area and type to change it. The easiest way to edit photos using AI.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ImageEditingPage />;
}
