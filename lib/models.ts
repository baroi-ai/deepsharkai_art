// File: lib/models.ts

export const MODEL_COSTS: Record<string, number> = {
  // Image Models
  "fal-ai/nano-banana-2": 10,
  "fal-ai/flux-2/klein/9b": 2,
  "fal-ai/nano-banana-pro": 15,
  "xai/grok-imagine-image": 3,
  "fal-ai/gpt-image-1.5": 7, // Standard generation
  "fal-ai/z-image/turbo": 1, // Fast but lower quality
  "fal-ai/minimax/image-01": 2, // Basic image generation
  "fal-ai/bytedance/seedream/v5/lite/text-to-image": 4,
  "fal-ai/ideogram/v3": 7,
  "fal-ai/recraft/v4/text-to-image": 5,
  "fal-ai/luma-photon": 3,
  // Edit Models
  "fal-ai/nano-banana-2/edit": 10,
  "fal-ai/flux-2/klein/9b/edit": 3,
  "fal-ai/nano-banana-pro/edit": 15,
  "xai/grok-imagine-image/edit": 3,
  "fal-ai/gpt-image-1.5/edit": 10,
  "fal-ai/z-image/turbo/image-to-image": 2,
  "fal-ai/minimax/image-01/subject-reference": 2,
  "fal-ai/bytedance/seedream/v5/lite/edit": 5,
  "fal-ai/ideogram/v3/remix": 7,
  "fal-ai/luma-photon/modify": 3,
};

export function getModelCost(modelId: string): number {
  return MODEL_COSTS[modelId] || 5; // Default to 0 or 1 if unknown
}
