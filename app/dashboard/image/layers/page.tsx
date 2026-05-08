import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2, Layers } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import for the Decomposer Client
const ImageDecomposerClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin absolute opacity-20" />
          <Layers className="h-12 w-12 animate-pulse text-teal-400" />
        </div>
        <p className="text-gray-400 text-sm animate-pulse font-medium mt-2">
          Loading AI Decomposer Studio...
        </p>
      </div>
    </div>
  ),
});

// ✅ Aggressive SEO focusing on your Unique Selling Proposition (USP)
export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Layer Extractor | Split Any Photo Into 3D Layers",
  description:
    "The ultimate AI magic trick. Instantly extract backgrounds, subjects, and foregrounds. Turn any flat 2D image into editable, movable 3D layers in seconds.",
  keywords: [
    "image decomposer",
    "extract image layers",
    "split image into layers",
    "convert 2d to 3d layers",
    "ai background remover",
    "qwen layered image",
    "deepshark ai",
    "ai photo manipulation",
  ],
  openGraph: {
    title: "AI Layer Extractor - Split Photos into Layers",
    description:
      "Turn flat images into editable 3D layers instantly. Extract subjects and backgrounds with one click.",
    images: ["/og-image.png"], // Tip: If you make a specific GIF/Image for the decomposer, link it here!
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Layer Extractor | DeepShark AI",
    description:
      "Extract backgrounds, subjects, and foregrounds instantly into movable layers.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ImageDecomposerClient />;
}
