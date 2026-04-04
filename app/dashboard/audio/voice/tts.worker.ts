import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";

// 🌍 FORCE CDN LOADING (This stops the VPS from trying to bundle models)
env.allowLocalModels = false;
env.useBrowserCache = true;
// Points to the official Hugging Face mirror
env.remoteHost = "https://huggingface.co";
env.remotePathTemplate = "{model}/resolve/{revision}/{file}";

let tts: any = null;

self.onmessage = async (event) => {
  const { type, text, voice } = event.data;

  // 🌟 INITIALIZE THE AI MODEL
  if (type === "init") {
    try {
      // If already loaded, don't reload
      if (tts) {
        self.postMessage({ status: "ready" });
        return;
      }

      self.postMessage({
        status: "loading",
        message: "Fetching AI Model from CDN...",
      });

      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";

      // The model will now download directly to the user's browser cache
      tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: "q8",
        device: "wasm",
      });

      self.postMessage({ status: "ready" });
    } catch (error: any) {
      self.postMessage({ status: "error", error: error.message });
    }
  }

  // 🌟 GENERATE AUDIO
  if (type === "generate") {
    if (!tts) {
      self.postMessage({ status: "error", error: "Model not loaded yet." });
      return;
    }

    try {
      self.postMessage({
        status: "generating",
        message: "Synthesizing voice...",
      });

      const audio = await tts.generate(text, {
        voice: voice || "af_heart",
      });

      const wavBlob = audio.toBlob();

      self.postMessage({
        status: "complete",
        audioBlob: wavBlob,
      });
    } catch (error: any) {
      self.postMessage({ status: "error", error: error.message });
    }
  }
};
