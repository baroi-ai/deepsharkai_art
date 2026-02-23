import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// ✅ Optimized Dynamic Import
const MyGenerationsPageClient = dynamic(() => import("./client"), {
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
