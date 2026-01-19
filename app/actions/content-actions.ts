"use server";

import { db } from "../db"; // Check your db path
import { aiModels, aiTools, carousels } from "../db/schema"; 
import { eq, desc, asc, like, or, sql } from "drizzle-orm";

export async function getDashboardContent() {
  try {
    // 1. Fetch Slides (Carousels)
    const slidesData = await db
      .select()
      .from(carousels)
      .where(eq(carousels.isActive, true))
      .orderBy(asc(carousels.order)); // Maintain slide order

    // 2. Fetch Tools
    const toolsData = await db
      .select()
      .from(aiTools)
      .orderBy(desc(aiTools.id));

    // 3. Fetch Models
    const modelsData = await db
      .select()
      .from(aiModels)
      .orderBy(desc(aiModels.id));

    return {
      slides: slidesData,
      tools: toolsData,
      models: modelsData,
    };
  } catch (error) {
    console.error("Failed to fetch dashboard content:", error);
    return { slides: [], tools: [], models: [] };
  }
}

// --- 2. NEW PAGINATION FUNCTION (For Tools Page) ---
const PAGE_SIZE = 12; // Number of tools per page

export async function getToolsPaginated(page: number = 1, search: string = "") {
  try {
    const offset = (page - 1) * PAGE_SIZE;

    // Build Search Filter
    // If search exists, filter by name/description/badge. 
    // If empty, pass undefined (Drizzle ignores it, showing all tools).
    const searchFilter = search
      ? or(
          like(aiTools.name, `%${search}%`),
          like(aiTools.description, `%${search}%`),
          like(aiTools.badge, `%${search}%`)
        )
      : undefined;

    // 1. Fetch Tools
    const tools = await db
      .select()
      .from(aiTools)
      .where(searchFilter)
      .limit(PAGE_SIZE)
      .offset(offset)
      .orderBy(desc(aiTools.id));

    // 2. Get Total Count (for pagination math)
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiTools)
      .where(searchFilter);

    const totalItems = Number(countResult.count);
    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    return {
      tools,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
      },
    };
  } catch (error) {
    console.error("Error fetching tools:", error);
    return { tools: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } };
  }
}

const PAGE_SIZES = 12; // Number of 
// --- 3. NEW PAGINATION FUNCTION (For Models Page) ---
export async function getModelsPaginated(page: number = 1, search: string = "") {
  try {
    const offset = (page - 1) * PAGE_SIZES;

    // Build Search Filter
    const searchFilter = search
      ? or(
          like(aiModels.name, `%${search}%`),
          like(aiModels.description, `%${search}%`),
          like(aiModels.type, `%${search}%`),
          like(aiModels.badge, `%${search}%`)
        )
      : undefined;

    // 1. Fetch Models
    const models = await db
      .select()
      .from(aiModels)
      .where(searchFilter)
      .limit(PAGE_SIZES)
      .offset(offset)
      .orderBy(desc(aiModels.id));

    // 2. Get Total Count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiModels)
      .where(searchFilter);

    const totalItems = Number(countResult.count);
    const totalPages = Math.ceil(totalItems / PAGE_SIZES);

    return {
      models,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
      },
    };
  } catch (error) {
    console.error("Error fetching models:", error);
    return { models: [], pagination: { currentPage: 1, totalPages: 1, totalItems: 0 } };
  }
}