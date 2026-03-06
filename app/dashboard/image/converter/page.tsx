import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const ImageConverterPage = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Image Converter...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free Image Converter & Compressor | 100% Private",
  description:
    "Convert images between WEBP, JPEG, PNG, AVIF, GIF, and BMP. Compress file sizes instantly. Runs 100% locally in your browser for total privacy.",
  keywords: [
    "image converter",
    "image compressor",
    "webp to jpg",
    "png to jpeg",
    "avif converter",
    "local image compression",
    "free image tool",
    "private image converter",
  ],
  openGraph: {
    title: "Free Image Converter & Compressor",
    description:
      "Convert and compress images locally in your browser. 100% private.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ImageConverterPage />;
}
