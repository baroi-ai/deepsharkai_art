import { MetadataRoute } from "next";
import toolsData from "@/app/data/ai_tools.json";
import modelsData from "@/app/data/ai_models.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://deepsharkai.art";

  // 1. Define your Static Routes
  const staticRoutes = [
    "",
    "/dashboard",
    "/dashboard/tools",
    "/dashboard/models",
    "/dashboard/billing",
    "/contact",
    "/privacy",
    "/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  // 2. Generate Dynamic Routes for Tools
  const toolRoutes = toolsData.map((tool: any) => ({
    url: `${baseUrl}${tool.link}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // 3. Generate Dynamic Routes for Models
  const modelRoutes = modelsData.map((model: any) => ({
    url: `${baseUrl}${model.link}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Combine everything
  return [...staticRoutes, ...toolRoutes, ...modelRoutes];
}
