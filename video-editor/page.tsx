import { Metadata } from "next";
import VideoEditorWrapper from "./wrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Video Editor | DeepShark AI",
  description:
    "Edit, trim, compress and convert videos entirely in your browser.",
  robots: { index: false, follow: false },
};

// ✅ This page has its own layout — no dashboard navbar wrapping it.
// Place this file at: app/video-editor/page.tsx
// Add a matching layout.tsx in the same folder (see below).
export default function VideoEditorPage() {
  return <VideoEditorWrapper />;
}
