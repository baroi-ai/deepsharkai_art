import { Metadata } from "next";
import LandingPage from "@/components/landing-page";

// ✅ THE MAGIC BULLET
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DeepShark AI | Relight, Layer & Upscale Images",
  description:
    "The ultimate AI Creative Studio. Relight photos with cinematic AI, extract image layers, generate motion, and upscale to 4K. Turn flat images into editable 3D layers instantly.",
  keywords: [
    "AI Image Relight",
    "Cinematic AI Lighting",
    "Image Decomposer",
    "Extract Image Layers",
    "Split Image into Layers",
    "Free motion generator",
    "AI Image Upscaler",
    "Upscale Image 4K",
    "free caption generator",
    "AI Background Remover",
    "Magic Eraser",
    "AI Photo Editor",
    "DeepShark AI",
  ],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://deepsharkai.art/",
    siteName: "DeepShark AI",
    title: "DeepShark AI • Relight, Layer & Upscale",
    description:
      "Relight photos, extract image layers, and upscale to 4K using elite AI models. The ultimate all-in-one AI studio for creators.",
    images: [
      {
        url: "https://deepsharkai.art/og-image.png",
        width: 1200,
        height: 630,
        alt: "DeepShark AI Interface Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeepShark AI • Relight, Layer & Upscale",
    description:
      "Relight photos with cinematic AI, extract image layers, and upscale to 4K. Turn flat images into professional assets instantly.",
    images: ["https://deepsharkai.art/og-image.png"],
  },
};

export default function Page() {
  return <LandingPage />;
}