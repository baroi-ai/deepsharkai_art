import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ Load the Magic Eraser Client Component
const MagicEraserClient = dynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-red-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Magic Eraser...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free AI Magic Eraser | Remove Objects from Photos | DeepShark AI",
  description:
    "Remove unwanted objects, people, text, or defects from your photos instantly. 100% Free forever AI Magic Eraser tool. No sign-up required for basic use.",
  keywords: [
    "magic eraser",
    "remove objects from photo",
    "ai object remover",
    "cleanup pictures",
    "remove people from photo",
    "free magic eraser",
    "deepshark ai tools",
    "inpainting online",
  ],
  authors: [{ name: "DeepShark AI" }],
  openGraph: {
    title: "Free AI Magic Eraser - Remove Anything Instantly",
    description:
      "Upload your photo and paint over unwanted objects to remove them like magic. Free forever.",
    type: "website",
    url: "/dashboard/image/magic-eraser",
    images: [
      {
        url: "/og-magic-eraser.png", // Ensure this image exists or use a generic one
        width: 1200,
        height: 630,
        alt: "DeepShark AI Magic Eraser Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI Magic Eraser | DeepShark AI",
    description: "Remove objects, text, and people from photos for free.",
  },
  alternates: {
    canonical: "/dashboard/image/magic-eraser",
  },
};

export default function MagicEraserPage() {
  return <MagicEraserClient />;
}
