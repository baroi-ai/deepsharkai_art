import { Metadata } from "next";
// ✅ 1. Rename import to avoid the TypeScript naming conflict
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ 2. THE MAGIC BULLET: Skip static rendering to fix the useSearchParams error
export const dynamic = "force-dynamic";

// ✅ Optimized Dynamic Import
const MyGenerationsPageClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading History...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "My Assets | Generated Content",
  description: "View and manage your history of Generated images.",
  // ⛔️ CRITICAL: This tells Google "Do NOT list this page in search results"
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyGenerationsPage() {
  return <MyGenerationsPageClient />;
}
