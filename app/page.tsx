import { Metadata } from "next";
import LandingPage from "@/components/landing-page";

export const metadata: Metadata = {
  // Front-load the USP right in the title for Google Search
  title: "DeepShark AI | Extract Layer, Edit & Upscale Images",
  description:
    "The ultimate AI Image Studio. Extract image layers, edit, and upscale to 4K using elite AI models. Turn flat images into editable 3D layers instantly.",
  keywords: [
    // 🚀 Added the Blue Ocean keywords!
    "Image Decomposer",
    "Extract Image Layers",
    "Split Image into Layers",
    "AI Background Remover",
    "Magic Eraser",
    "AI Image Generator",
    "Upscale Image 4K",
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
    title: "DeepShark AI • Layer, Edit & Upscale",
    description:
      "Extract image layers, edit, and upscale 4K using elite AI models. The ultimate AI studio for creators.",
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
    title: "DeepShark AI • Layer, Edit & Upscale",
    description:
      "Extract image layers, edit, and upscale 4K using elite AI models. Turn flat images into layers instantly.",
    images: ["https://deepsharkai.art/og-image.png"],
  },
};

export default function Page() {
  return <LandingPage />;
}
