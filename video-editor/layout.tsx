// Place at: app/video-editor/layout.tsx
//
// ✅ This layout intentionally does NOT import or extend the dashboard layout.
// It gives the video editor its own full-screen shell with a minimal built-in navbar.
//
// HOW IT WORKS IN NEXT.JS APP ROUTER:
// - Put this page at  app/video-editor/page.tsx  (outside of app/dashboard/)
// - This layout.tsx sits alongside it at  app/video-editor/layout.tsx
// - Next.js will nest it inside your ROOT app/layout.tsx (which has <html><body>)
//   but will NOT apply the dashboard layout — because it's a sibling route, not a child.
// - Result: full screen, no sidebar, no dashboard navbar.

import type { Metadata } from "next";
import Link from "next/link";

export default function VideoEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* ── Minimal standalone navbar ── */}

      {/* ── Editor fills remaining height ── */}
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
    </div>
  );
}
