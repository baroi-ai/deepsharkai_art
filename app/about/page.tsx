import { Metadata } from "next";
import AboutContent from "@/components/about-content"; // We'll create this component below

export const metadata: Metadata = {
  title: "About DeepShark AI | Our Mission & Cloud-Based AI Tools",
  description:
    "Learn about DeepShark AI's mission to make powerful, cloud-based generative AI accessible to everyone. Discover our commitment to privacy, pay-as-you-go pricing, and cutting-edge tools for image, video, and voice creation.",
  openGraph: {
    type: "website",
    url: "https://deepsharkai.art/about",
    title: "About DeepShark AI | Our Mission & Cloud-Based AI Tools",
    description:
      "Learn about DeepShark AI's mission to make powerful, cloud-based generative AI accessible to everyone.",
    images: [{ url: "https://deepsharkai.art/og-image-about.png" }],
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
