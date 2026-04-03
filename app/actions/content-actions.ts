"use server";

import toolsData from "@/app/data/ai_tools.json";
import slidesData from "@/app/data/carousels.json";
import modelsData from "@/app/data/ai_models.json";

const PAGE_SIZE_TOOLS = 10;
const PAGE_SIZE_MODELS = 12;

export async function getDashboardContent() {
  try {
    const formattedSlides = slidesData
      .filter((s: any) => s.is_active === true)
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        imageUrl: s.image_url,
        ctaText: s.cta_text,
        ctaLink: s.cta_link,
        order: s.order,
      }))
      .sort((a, b) => a.order - b.order);

    // .reverse() ensures the tool you just added to the bottom of the JSON shows up first
    const formattedTools = [...toolsData].reverse().map((t: any) => ({
      ...t,
      imageUrl: t.image_url,
    }));

    const formattedModels = [...modelsData].reverse();

    return {
      slides: formattedSlides,
      tools: formattedTools.slice(0, 18),
      models: formattedModels.slice(0, 8),
    };
  } catch (error) {
    console.error("Local fetch failed:", error);
    return { slides: [], tools: [], models: [] };
  }
}

export async function getToolsPaginated(page: number = 1, search: string = "") {
  try {
    const term = search.toLowerCase();

    // Reversing first so the "latest" logic applies to search results too
    const filtered = [...toolsData]
      .reverse()
      .filter(
        (tool: any) =>
          tool.name.toLowerCase().includes(term) ||
          tool.description.toLowerCase().includes(term) ||
          (tool.badge && tool.badge.toLowerCase().includes(term)),
      )
      .map((t: any) => ({
        ...t,
        imageUrl: t.image_url,
      }));

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE_TOOLS);
    const offset = (page - 1) * PAGE_SIZE_TOOLS;

    return {
      tools: filtered.slice(offset, offset + PAGE_SIZE_TOOLS),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
      },
    };
  } catch (error) {
    return {
      tools: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    };
  }
}

export async function getModelsPaginated(
  page: number = 1,
  search: string = "",
) {
  try {
    const term = search.toLowerCase();

    // Reverse models so newest IDs are on Page 1
    const filtered = [...modelsData]
      .reverse()
      .filter(
        (model: any) =>
          model.name.toLowerCase().includes(term) ||
          model.description.toLowerCase().includes(term),
      );

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / PAGE_SIZE_MODELS);
    const offset = (page - 1) * PAGE_SIZE_MODELS;

    return {
      models: filtered.slice(offset, offset + PAGE_SIZE_MODELS),
      pagination: { currentPage: page, totalPages, totalItems },
    };
  } catch (error) {
    return {
      models: [],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 0 },
    };
  }
}
