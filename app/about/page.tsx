import { Metadata } from "next";
import AboutContent from "@/components/about-content"; // We'll create this component below

export const metadata: Metadata = {
  // Focus the title on your USP and brand identity
  title: "About DeepShark AI | The Ultimate AI Image Studio",
  description:
    "Discover the mission behind DeepShark AI. We are redefining the creative workflow by giving everyone access to elite AI models to extract image layers, upscale to 4K, and edit flawlessly—with fair, pay-as-you-go pricing.",
  keywords: [
    "About DeepShark AI",
    "AI Image Studio Mission",
    "Image Decomposer tool",
    "Pay-as-you-go AI",
    "Extract image layers",
    "Private AI generation",
  ],
  openGraph: {
    type: "website",
    url: "https://deepsharkai.art/about",
    title: "Our Story | DeepShark AI Image Studio",
    description:
      "Learn how DeepShark AI is changing the game with our signature Image Decomposer, elite 4K upscaling, and a commitment to accessible, privacy-focused AI.",
    images: [
      {
        url: "https://deepsharkai.art/og-image-about.png",
        width: 1200,
        height: 630,
        alt: "About DeepShark AI - Mission and Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Story | DeepShark AI Image Studio",
    description:
      "Redefining the creative workflow with elite AI models to extract layers, upscale, and edit. Read our mission.",
    images: ["https://deepsharkai.art/og-image-about.png"],
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
