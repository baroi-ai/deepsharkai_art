import { Metadata } from "next";
import DashboardPageClient from "./client";

// ✅ THE MAGIC BULLET: Tells Next.js to render the dashboard dynamically
// and stops the useSearchParams build crash instantly.
export const dynamic = "force-dynamic";

// Keep this so Google still indexes the page description
export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Dashboard | Explore Top Tools & Models - DeepShark AI",
  description:
    "Your central hub for generative AI. Discover the latest AI tools, browse top models like Flux and Luma, and manage your creative projects.",
  keywords: [
    "ai dashboard",
    "deepshark ai tools",
    "generative ai hub",
    "best ai models",
    "ai content creation platform",
  ],
  openGraph: {
    title: "DeepShark AI Dashboard - Explore & Create",
    description:
      "Access the world's best AI tools for video, image, and audio generation in one place.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/dashboard",
  },
};

export default function DashboardPage() {
  // Let the client component handle 100% of the fetching and caching.
  // No server 'await' = no blocking!
  return <DashboardPageClient />;
}
