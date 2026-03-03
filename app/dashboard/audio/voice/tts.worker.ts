import { KokoroTTS } from "kokoro-js";

let tts: any = null;

self.onmessage = async (event) => {
  const { type, text, voice } = event.data;

  // 🌟 INITIALIZE THE AI MODEL
  if (type === "init") {
    try {
      self.postMessage({ status: "loading", message: "Loading AI Engine..." });

      const model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";
      tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: "q8", // Keeps the download small!
        device: "wasm", // Runs smoothly in all browsers
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

      // Generate the raw audio data
      const audio = await tts.generate(text, {
        voice: voice || "af_heart",
      });

      // Instantly convert it to a playable file
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
