import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ Load the Image Relight Client Component dynamically
const ImageRelightClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-cyan-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Image Relight Studio...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free AI Image Relight | Cinematic Studio Lighting | DeepShark AI",
  description:
    "Add professional studio lighting, change light colors, or match reference lighting to your photos instantly with our 100% Free AI Image Relight tool.",
  keywords: [
    "image relight",
    "ai lighting",
    "add light to photo",
    "cinematic lighting ai",
    "ic-light online",
    "image relighting tool",
    "deepshark ai tools",
    "change photo lighting",
  ],
  authors: [{ name: "DeepShark AI" }],
  openGraph: {
    title: "Free AI Image Relight - Add Cinematic Lighting Instantly",
    description:
      "Upload your photo and apply custom studio lighting, dim backgrounds, and change light colors like magic. Free forever.",
    type: "website",
    url: "/dashboard/image/relight",
    images: [
      {
        url: "/og-image.png", // Ensure you add this OG image to your public folder later!
        width: 1200,
        height: 630,
        alt: "DeepShark AI Image Relight Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Image Relight | DeepShark AI",
    description: "Add professional studio lighting to your photos for free.",
  },
  alternates: {
    canonical: "/dashboard/image/relight",
  },
};

export default function ImageRelightPage() {
  return <ImageRelightClient />;
}