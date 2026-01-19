import { Metadata } from "next";
import LandingPage from "@/components/landing-page";

// ✅ SEO Updated: Matches your new "Image Suite" strategy
export const metadata: Metadata = {
  title: "DeepShark AI | Multi-Model AI Image Studio",
  description:
    "The ultimate AI Image Studio. Generate stunning 4K art, upscale blurry photos, and edit images instantly using the world's best AI models. Simple, fast, and privacy-focused.",
  keywords: [
    "AI Image Generator",
    "Upscale Image 4K",
    "AI Photo Editor",
    "Stable Diffusion",
    "Flux Pro",
    "DeepShark AI",
  ],
  icons: {
    icon: "/favicon.ico", // or '/icon.png' if you have a PNG
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://deepsharkai.art/",
    siteName: "DeepShark AI",
    title: "DeepShark AI • Generate, Upscale & Edit",
    description:
      "Create 4K art and fix blurry photos with the world's best AI models. One platform, infinite possibilities.",
    images: [
      {
        url: "https://deepsharkai.art/og-image.png", // Make sure you actually have this image in your public folder!
        width: 1200,
        height: 630,
        alt: "DeepShark AI Interface Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DeepShark AI • Generate, Upscale & Edit",
    description:
      "The ultimate AI Image Studio. Create 4K art & fix blurry photos instantly.",
    images: ["https://deepsharkai.art/og-image.png"],
  },
};

export default function Page() {
  return <LandingPage />;
}
