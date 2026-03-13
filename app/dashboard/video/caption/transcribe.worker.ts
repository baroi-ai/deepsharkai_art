import {
  pipeline,
  env,
  AutomaticSpeechRecognitionPipeline,
} from "@xenova/transformers";

// 1. "Nuclear" Polyfill
const ctx = self as unknown as { process: { env: Record<string, string> } };
if (!ctx.process) ctx.process = { env: {} };

// 2. Configuration
env.useBrowserCache = true;
env.allowLocalModels = false;

// 3. Define Interfaces for Type Safety
interface ProgressUpdate {
  status: "progress" | "done" | "initiate" | "downloading";
  file?: string;
  progress?: number;
}

interface WorkerMessage {
  status: "downloading" | "processing" | "success" | "error";
  message?: string;
  percent?: number;
  result?: any; // The raw output from the pipeline
  error?: string;
}

class TranscriptionSingleton {
  private static instance: AutomaticSpeechRecognitionPipeline | null = null;
  private static model_id = "Xenova/whisper-base";

  static async getInstance(
    progressCallback: (msg: WorkerMessage) => void,
  ): Promise<AutomaticSpeechRecognitionPipeline> {
    if (!this.instance) {
      this.instance = (await pipeline(
        "automatic-speech-recognition",
        this.model_id,
        {
          quantized: true,
          progress_callback: (data: ProgressUpdate) => {
            if (data.status === "progress") {
              const p = data.progress ? Math.round(data.progress) : 0;
              progressCallback({
                status: "downloading",
                message:
                  data.file === "config.json"
                    ? "Checking Cache..."
                    : `Downloading ${p}%`,
                percent: p,
              });
            }
            if (data.status === "done") {
              progressCallback({
                status: "downloading",
                message: "Model Ready!",
                percent: 100,
              });
            }
          },
        },
      )) as AutomaticSpeechRecognitionPipeline;
    }
    return this.instance;
  }
}

// 4. Strongly Typed message handler
self.onmessage = async (event: MessageEvent<{ audio: Float32Array }>) => {
  const { audio } = event.data;

  try {
    const transcriber = await TranscriptionSingleton.getInstance(
      (msg: WorkerMessage) => {
        self.postMessage(msg);
      },
    );

    self.postMessage({
      status: "processing",
      message: "Transcribing Audio...",
    });

    const output = await transcriber(audio, {
      chunk_length_s: 30,
      stride_length_s: 5,
      language: "english",
      task: "transcribe",
      return_timestamps: "word", // Changed to 'word' for better captioning
    });

    self.postMessage({ status: "success", result: output });
  } catch (e: unknown) {
    console.error("Worker Error:", e);

    let errorMsg = e instanceof Error ? e.message : String(e);
    if (errorMsg.includes("Cache")) {
      errorMsg = "Storage Full or Private Mode. Cannot save model.";
    }

    self.postMessage({ status: "error", error: errorMsg });
  }
};
