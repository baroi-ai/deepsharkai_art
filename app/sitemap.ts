import { MetadataRoute } from "next";
import toolsData from "@/app/data/ai_tools.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://deepsharkai.art";

  // 1. Define Static Routes
  const staticRoutes = [
    "",
    "/dashboard",
    "/dashboard/tools",
    "/dashboard/models",
    "/dashboard/billing",
    "/contact",
    "/privacy",
    "/terms",
  ];

  // 2. Combine all links from JSON files
  const dynamicLinks = [...toolsData.map((t: any) => t.link)];

  // 3. Create a UNIQUE set of all paths
  // This automatically removes duplicates like the double "angel"
  const allUniquePaths = Array.from(
    new Set([...staticRoutes, ...dynamicLinks]),
  );

  // 4. Filter out dead links and map to sitemap format
  return allUniquePaths
    .filter(
      (path) =>
        path !== "/dashboard/image-generation" &&
        path !== "/dashboard/coming-soon",
    ) // Remove dead links
    .map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency:
        path === "" || path.startsWith("/dashboard") ? "daily" : "weekly",
      priority: path === "" ? 1 : path.startsWith("/dashboard") ? 0.8 : 0.6,
    }));
}
