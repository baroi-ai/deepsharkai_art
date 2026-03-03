import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ Optimized Dynamic Import
const ImageAngleChangerPage = dynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Angle Changer...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Image Angle Changer | Rotate Photos in 3D",
  description:
    "Change the camera angle of any image instantly using AI. Rotate objects, faces, or scenes in 3D space just by dragging a slider.",
  keywords: [
    "ai image rotator",
    "change photo angle",
    "3d image rotation",
    "ai perspective changer",
    "rotate face in photo",
    "change camera view",
  ],
  openGraph: {
    title: "AI Image Angle Changer",
    description: "Rotate any static image in 3D space with AI.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <ImageAngleChangerPage />;
}
