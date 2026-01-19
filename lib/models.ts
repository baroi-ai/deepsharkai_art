// File: lib/models.ts

export const MODEL_COSTS: Record<string, number> = {
  // Image Models
  "fal-ai/gpt-image-1.5": 2,      // Standard generation
  "fal-ai/gpt-image-1.5/edit": 3, // Edit operations often cost more
  "seedream-v4": 3,
  "flux-dev": 7,                  // High quality, higher cost
  "recraft-v3": 4,
  "minimax-image-01": 1,
  "ideogram-v3": 8,
  "luma-photon": 2,

  // Future Video Models (Placeholders)
  "fal-ai/luma-dream-machine": 50,
  "fal-ai/kling-video": 45,

  // Future Voice Models (Placeholders)
  "fal-ai/wills-voice": 10,
};

export function getModelCost(modelId: string): number {
  return MODEL_COSTS[modelId] || 0; // Default to 0 or 1 if unknown
}