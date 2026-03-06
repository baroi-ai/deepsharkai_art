import { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

// ✅ 1. Import Query stuff for SEO Prefetching
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { getToolsPaginated } from "@/app/actions/content-actions";

// ✅ 2. Optimized Dynamic Import (Lazy Load Client)
const ToolsPageClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading Tools Library...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Tools Directory | Explore Video, Audio & Image Generators",
  description:
    "Discover our complete collection of generative AI tools. From video synthesis and voice cloning to image generation and face swapping. Find the perfect AI tool for your project.",
  keywords: [
    "ai tools directory",
    "generative ai tools",
    "video synthesis",
    "voice cloning",
    "deepfake software",
    "ai content creation",
    "text to video",
    "face swap ai",
  ],
  openGraph: {
    title: "Explore the Best AI Tools for Creators",
    description:
      "Access a curated list of powerful AI tools for video, audio, and image generation.",
    type: "website",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/dashboard/tools",
  },
};

// ✅ 3. Make component Async for Server Actions
export default async function ToolsPage() {
  const queryClient = new QueryClient();

  // ✅ 4. Prefetch Data on Server (SEO Magic)
  // This ensures Google bots see the actual tools, not just a loading spinner.
  await queryClient.prefetchQuery({
    queryKey: ["tools-page", 1, ""], // Matches the default state in client.tsx
    queryFn: () => getToolsPaginated(1, ""),
  });

  return (
    // ✅ 5. Hydrate the Client State
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ToolsPageClient />
    </HydrationBoundary>
  );
}
