import { pipeline, env, RawImage } from "@huggingface/transformers";

// Configuration
env.allowLocalModels = false;

// ✅ SMART CACHE FIX
// Default to false (Safe Mode)
env.useBrowserCache = false;

// Try to enable cache ONLY if the browser supports it
try {
  // 'caches' is the API that crashes some mobiles. We check if it exists first.
  if (typeof caches !== "undefined") {
    env.useBrowserCache = true;
  }
} catch (e) {
  // If checking throws a security error (common in Incognito), keep it false.
  console.warn("Cache API disabled due to browser restrictions.");
}

// ✅ FIXED: Swapped to the commercially-free Apache 2.0 model!
const MODEL_NAME = "Xenova/modnet";

let segmenter: any = null;

self.onmessage = async (event: MessageEvent) => {
  const { action, imageBlob } = event.data;

  // --- PRELOAD ---
  if (action === "preload") {
    try {
      if (!segmenter) {
        segmenter = await pipeline("image-segmentation", MODEL_NAME, {
          dtype: "q8",
          device: "wasm",
        });
      }
      self.postMessage({ status: "preload-complete" });
    } catch (e: any) {
      console.error("Preload Error:", e);
    }
    return;
  }

  // --- PROCESS ---
  if (action === "process" || imageBlob) {
    try {
      const blob = imageBlob || event.data.imageBlob;

      self.postMessage({
        status: "progress",
        key: "Loading AI...",
        percent: 10,
      });

      if (!segmenter) {
        segmenter = await pipeline("image-segmentation", MODEL_NAME, {
          dtype: "q8",
          device: "wasm",
          progress_callback: (data: any) => {
            if (data.status === "progress") {
              const percent = data.progress ? Math.round(data.progress) : 0;
              self.postMessage({
                status: "progress",
                key: "Downloading Model...",
                percent,
              });
            }
          },
        });
      }

      self.postMessage({
        status: "progress",
        key: "Analyzing...",
        percent: 50,
      });

      const image = await RawImage.fromBlob(blob);
      const output = await segmenter(image);

      self.postMessage({
        status: "progress",
        key: "Compositing...",
        percent: 80,
      });

      // ModNet output is handled perfectly by this logic
      const mask = Array.isArray(output)
        ? output[0].mask
        : output.mask || output;

      const canvas = new OffscreenCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      const originalBitmap = await createImageBitmap(blob);
      ctx.drawImage(originalBitmap, 0, 0);

      const pixelData = ctx.getImageData(0, 0, image.width, image.height);

      for (let i = 0; i < mask.data.length; i++) {
        pixelData.data[i * 4 + 3] = mask.data[i];
      }

      ctx.putImageData(pixelData, 0, 0);

      const resultBlob = await canvas.convertToBlob({ type: "image/png" });

      self.postMessage({ status: "success", blob: resultBlob });
    } catch (e: any) {
      console.error("Processing Error:", e);
      self.postMessage({ status: "error", error: e.message || String(e) });
    }
  }
};
