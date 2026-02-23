import { Metadata } from "next";
import PricingPageClient from "./client"; // Import your client component

export const metadata: Metadata = {
  title: "Pricing & Credits | DeepShark AI",
  description:
    "Simple, transparent pricing for DeepShark AI. Purchase credits for high-quality AI image and video generation. subscriptions and pay-as-you-go.",
  keywords: [
    "deepshark ai pricing",
    "buy ai credits",
    "ai video generator cost",
    "text to video pricing",
    "pay as you go ai",
    "deepshark credits",
    "ai image generation cost",
  ],
  // ✅ INDEXING: Essential for a pricing page
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Pricing & Credits - DeepShark AI",
    description:
      "Pay as you go. subscriptions. Start generating AI content today.",
    type: "website",
    url: "https://deepsharkai.art/pricing",
    siteName: "DeepShark AI",
  },
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
