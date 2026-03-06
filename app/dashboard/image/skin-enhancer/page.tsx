import { Metadata } from "next";
import SkinEnhancerClient from "./client";

// ✅ THE MAGIC BULLET: This tells Next.js NOT to pre-render this private dashboard page.
// It instantly fixes the useSearchParams error without needing Suspense or ssr: false!
export const dynamic = "force-dynamic";

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
