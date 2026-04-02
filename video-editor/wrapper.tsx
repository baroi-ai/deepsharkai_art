"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ ssr: false is allowed here because this is a Client Component
const VideoEditorClient = dynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Video Editor...
        </p>
      </div>
    </div>
  ),
  ssr: false,
});

export default function VideoEditorWrapper() {
  return <VideoEditorClient />;
}
