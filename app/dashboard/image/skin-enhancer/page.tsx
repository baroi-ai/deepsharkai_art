import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ FIX: Removed `ssr: false`.
// The `loading` component will still appear instantly while the code downloads.
const SkinEnhancerClient = dynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">Loading Editor...</p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Skin Enhancer & Face Retoucher | DeepShark AI",
  description:
    "Instantly enhance portrait photos and remove plastic/AI skin textures. Get professional, realistic skin details and high-quality face retouching in seconds.",
  keywords: [
    "ai skin enhancer",
    "remove plastic skin",
    "fix ai face",
    "realistic skin texture",
    "face retouch online",
    "ai photo enhancer",
    "deepshark ai tools",
  ],
  authors: [{ name: "DeepShark AI" }],
  openGraph: {
    title: "AI Skin Enhancer - Fix Plastic Skin Textures",
    description:
      "Upload your photo to instantly restore realistic skin details and remove the 'plastic' AI look.",
    type: "website",
    url: "/dashboard/image/skin-enhancer",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DeepShark AI Skin Enhancer Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Skin Enhancer | DeepShark AI",
    description: "Fix plastic AI skin and enhance facial details instantly.",
  },
  alternates: {
    canonical: "/dashboard/image/skin-enhancer",
  },
};

export default function SkinEnhancerPage() {
  return <SkinEnhancerClient />;
}
