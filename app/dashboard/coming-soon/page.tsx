import { Metadata } from "next";
// ✅ 1. Rename import to avoid the TypeScript naming conflict
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ 2. THE MAGIC BULLET
export const dynamic = "force-dynamic";

// ✅ Use nextDynamic here
const ComingSoonPage = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Coming Soon | Feature In Progress",
  description: "We are working hard to bring you this new feature. Stay tuned!",
  // ⛔️ CRITICAL: Prevents Google from indexing "Coming Soon" pages
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <ComingSoonPage />;
}
