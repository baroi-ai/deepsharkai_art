/* eslint-disable @typescript-eslint/no-explicit-any */
import { pipeline, env } from "@xenova/transformers";

// 1. "Nuclear" Polyfill (Prevents crash on process.env)
const ctx: any = self;
if (!ctx.process) {
  ctx.process = { env: {} };
}
if (!ctx.process.env) {
  ctx.process.env = {};
}

// 2. Configuration
// ✅ FORCE CACHE ON (Default to true for mobile persistence)
env.useBrowserCache = true;
env.allowLocalModels = false;

// Optional: specific check for private mode / restrictions
try {
  if (typeof caches === 'undefined') {
     console.warn("Cache API missing. Model will not be saved.");
     env.useBrowserCache = false;
  }
} catch (e) {
  // Ignore security errors, default to true is usually safer for standard mobile usage
}

class TranscriptionSingleton {
  static instance: any = null;
  static model_id = "Xenova/whisper-tiny"; // Fixed to 'tiny' for speed/size

  static async getInstance(progressCallback: any) {
    if (!this.instance) {
      this.instance = await pipeline("automatic-speech-recognition", this.model_id, {
        quantized: true, // Uses compressed model
        progress_callback: (data: any) => {
          // 📡 Status Updates
          if (data.status === "progress") {
            const p = data.progress ? Math.round(data.progress) : 0;
            // If p jumps 0->100, it's loading from cache.
            progressCallback({ 
                status: "downloading", 
                message: data.file === 'config.json' ? 'Checking Cache...' : `Downloading ${p}%`, 
                percent: p 
            });
          }
          if (data.status === "done") {
             progressCallback({ status: "downloading", message: "Model Ready!", percent: 100 });
          }
        },
      });
    }
    return this.instance;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { audio } = event.data;

  try {
    // 1. Load Model (with visual feedback)
    const transcriber = await TranscriptionSingleton.getInstance((msg: any) => {
      self.postMessage(msg);
    });

    // 2. Start Processing
    self.postMessage({ status: "processing", message: "Transcribing Audio..." });

    const output = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: "english",
      task: "transcribe",
      return_timestamps: true,
    });

    // 3. Success
    self.postMessage({ status: "success", result: output });

  } catch (e: any) {
    console.error("Worker Error:", e);
    
    let errorMsg = e.message || String(e);
    if (errorMsg.includes("Cache")) {
        errorMsg = "Storage Full or Private Mode. Cannot save model.";
    }

    self.postMessage({ status: "error", error: errorMsg });
  }
};