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
import { getModelsPaginated } from "@/app/actions/content-actions";

// ✅ 2. Optimized Dynamic Import (Lazy Load Client)
const ModelsPageClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">
          Loading AI Models...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "AI Models Library | Browse Flux, Luma, & Stable Diffusion",
  description:
    "Explore the engine room of AI creation. Browse a curated list of the world's best open-source and proprietary AI models for video, image, and audio generation.",
  keywords: [
    "ai models list",
    "flux model",
    "stable diffusion models",
    "luma dream machine",
    "kling ai",
    "runway gen-3",
    "ai model directory",
  ],
  openGraph: {
    title: "Browse the Best AI Models",
    description:
      "Explore top-tier AI models for every creative task. From Flux to Luma.",
    type: "website",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/dashboard/models",
  },
};

// ✅ 3. Make component Async for Server Actions
export default async function ModelsPage() {
  const queryClient = new QueryClient();

  // ✅ 4. Prefetch Data on Server (SEO Magic)
  // This fetches the first page of models so search engines see content, not just a spinner.
  await queryClient.prefetchQuery({
    queryKey: ["models-page", 1, ""], // Matches the default state in client.tsx
    queryFn: () => getModelsPaginated(1, ""),
  });

  return (
    // ✅ 5. Hydrate the Client State
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ModelsPageClient />
    </HydrationBoundary>
  );
}
