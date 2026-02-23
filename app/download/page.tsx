import { Metadata } from "next";
import DownloadPageClient from "./client"; // Import your renamed client component

export const metadata: Metadata = {
  title: "Download DeepShark AI App | iOS & Android",
  description:
    "Take your creativity on the go. Download the official DeepShark AI mobile app for iPhone and Android. Generate art, video, and audio anywhere.",
  keywords: [
    "download deepshark ai",
    "deepshark mobile app",
    "ai art generator app",
    "ios ai tools",
    "android ai app",
    "mobile video generator",
  ],
  openGraph: {
    title: "Get DeepShark AI on Mobile",
    description:
      "Creativity in your pocket. Download for iOS and Android today.",
    type: "website",
    // images: ["/og-download.jpg"], // Optional: Add a promotional image of the app
  },
  alternates: {
    canonical: "/download",
  },
  // ✅ ENABLE INDEXING (You want people to find your app!)
  robots: {
    index: true,
    follow: true,
  },
};

export default function DownloadPage() {
  return <DownloadPageClient />;
}
