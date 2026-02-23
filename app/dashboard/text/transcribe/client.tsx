"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ScanText,
  AlertTriangle,
  CheckCircle,
  Copy,
  FileVideo,
  XCircle,
  Sparkles,
  Cpu,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

// --- SAFETY LIMITS ---
const MAX_FILE_SIZE_MB = 200;
const MAX_DURATION_SEC = 60;

export default function MediaToTextPage() {
  // --- STATE ---
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"video" | "audio" | null>(null);

  const [transcript, setTranscript] = useState<{
    text: string;
    chunks?: any[];
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- WORKER LIFECYCLE ---
  // ✅ Only terminate the worker when the user leaves the page entirely
  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  // ✅ Cleanup media memory when mediaSrc changes
  useEffect(() => {
    return () => {
      if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    };
  }, [mediaSrc]);

  // ✅ SOFT RESET: Clears data but KEEPS the worker/model alive
  const resetResults = () => {
    setTranscript(null);
    setProgress("");
    setIsProcessing(false);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    setMediaSrc(null);
    resetResults();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- HANDLERS ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");

    if (!isAudio && !isVideo) {
      toast.error("Please upload a valid audio or video file.");
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_FILE_SIZE_MB) {
      toast.error(
        `File too large (${fileSizeMB.toFixed(
          1,
        )}MB). Limit is ${MAX_FILE_SIZE_MB}MB.`,
      );
      return;
    }

    // Cleanup previous media if exists
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);

    resetResults(); // Reset UI, but keep AI warm
    const url = URL.createObjectURL(file);

    // Dynamically create the right element to check duration
    const mediaElement = isAudio
      ? document.createElement("audio")
      : document.createElement("video");

    mediaElement.preload = "metadata";

    mediaElement.onloadedmetadata = () => {
      if (mediaElement.duration > MAX_DURATION_SEC) {
        toast.error(
          `Media too long (${mediaElement.duration.toFixed(
            0,
          )}s). Limit is ${MAX_DURATION_SEC}s.`,
        );
        URL.revokeObjectURL(url); // Clean up rejected file
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        // Valid Media -> Set State
        setMediaFile(file);
        setMediaSrc(url);
        setMediaType(isAudio ? "audio" : "video");
      }
    };

    mediaElement.onerror = () => {
      toast.error("Invalid media file.");
      URL.revokeObjectURL(url);
    };

    mediaElement.src = url;
  };

  const handleTranscribe = async () => {
    if (!mediaFile) return;

    setIsProcessing(true);
    setProgress("Initializing...");

    try {
      // 1. Extract Audio (Works for BOTH Video and Audio files natively!)
      setProgress("Extracting audio...");
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const arrayBuffer = await mediaFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const rawAudio = audioBuffer.getChannelData(0);

      // 2. Initialize Worker (Only if it doesn't exist)
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("./transcribe.worker.ts", import.meta.url),
          { type: "module" },
        );

        workerRef.current.onmessage = (e) => {
          const { status, result, error, message } = e.data;

          if (status === "downloading") {
            setProgress(message || "Downloading AI...");
          }

          if (status === "processing") {
            setProgress("Transcribing...");
          }

          if (status === "success") {
            setTranscript(result);
            setIsProcessing(false);
            setProgress("Done!");
            toast.success("Transcription complete!");
          }

          if (status === "error") {
            console.error(error);
            setIsProcessing(false);
            toast.error("AI Error: " + error);
          }
        };
      }

      // 3. Send to Worker
      workerRef.current.postMessage({ audio: rawAudio });
    } catch (err) {
      console.error(err);
      toast.error("Failed to process media file.");
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!transcript?.text) return;
    const textToCopy = transcript.text;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => toast.success("Copied to clipboard!"))
        .catch(() => fallbackCopy(textToCopy));
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy text.");
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* 1. MAIN CONTENT AREA */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 pb-40 flex flex-col justify-start min-h-[60vh]">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
          {/* EMPTY STATE */}
          {!mediaFile && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-20 max-w-md w-full">
              <div className="flex gap-4 mb-6 opacity-30">
                <ScanText className="h-16 w-16" />
              </div>
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Media to Transcribe
              </h1>
              <p className="text-gray-500 mb-6">
                Extract Text from Video or Audio locally (Max 60s).
              </p>

              <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2 mb-6">
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-teal-300">
                    <Cpu className="h-5 w-5" />
                    <p className="text-sm font-medium">Running Locally</p>
                  </div>
                  <p className="text-xs text-teal-200/70 leading-relaxed">
                    100% Private. Runs entirely on your device using
                    Whisper-Tiny (75 MB). No data leaves your browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* MEDIA PREVIEW CARD */}
          {mediaSrc && (
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
              <div className="relative group rounded-xl overflow-hidden border border-gray-700 bg-black/50 shadow-2xl flex flex-col items-center justify-center min-h-[200px]">
                {/* Conditionally render Audio or Video player */}
                {mediaType === "video" ? (
                  <video
                    src={mediaSrc}
                    controls
                    className="w-full max-h-[40vh] object-contain"
                  />
                ) : (
                  <div className="w-full py-10 px-6 flex flex-col items-center gap-6">
                    <ScanText className="h-20 w-20 text-teal-500 opacity-80" />
                    <audio
                      src={mediaSrc}
                      controls
                      className="w-full max-w-sm"
                    />
                  </div>
                )}

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={clearMedia}
                  disabled={isProcessing}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mt-3 px-2">
                {mediaType === "video" ? (
                  <FileVideo className="h-4 w-4 text-cyan-500" />
                ) : (
                  <ScanText className="h-4 w-4 text-teal-500" />
                )}
                <span className="text-xs text-gray-400 truncate max-w-[200px]">
                  {mediaFile?.name}
                </span>
                <span className="text-xs text-gray-600 ml-auto font-medium">
                  {((mediaFile?.size || 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
              </div>
            </div>
          )}

          {/* TRANSCRIPT RESULTS */}
          {transcript && (
            <div className="w-full bg-slate-900 border border-white/10 rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 shadow-xl">
              <div className="bg-slate-800/50 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-teal-400" />
                  <span className="text-sm font-medium text-gray-200">
                    Result
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 bg-slate-950 px-2 py-1 rounded-full border border-white/5">
                  Whisper-Tiny
                </span>
              </div>

              <div className="p-6 max-h-[500px] overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
                {transcript.chunks && transcript.chunks.length > 0 ? (
                  transcript.chunks.map((chunk: any, i: number) => (
                    <div key={i} className="flex gap-4 group">
                      <span className="text-xs text-teal-500/70 font-mono pt-1 select-none shrink-0 w-12 text-right">
                        {chunk.timestamp[0].toFixed(1)}s
                      </span>
                      <p className="text-gray-300 text-sm leading-relaxed group-hover:text-white transition-colors">
                        {chunk.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {transcript.text}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* WARNING ALERT */}
          {isProcessing && !transcript && (
            <div className="flex items-center gap-3 bg-yellow-950/30 border border-yellow-800/50 p-4 rounded-lg max-w-md animate-pulse">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="text-sm text-yellow-200/80">
                <p className="font-semibold text-yellow-500">
                  Processing locally
                </p>
                <p className="text-xs">Your device is doing the work.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM CONTROL BAR */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent z-10">
        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-3">
          {/* Upload Button */}
          <div className="shrink-0 relative">
            <Input
              ref={fileInputRef}
              id="media-upload-input"
              type="file"
              accept="video/*,audio/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isProcessing}
            />
            <Label
              htmlFor="media-upload-input"
              className={buttonVariants({
                variant: "outline",
                size: "icon",
                className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${
                  mediaSrc ? "border-cyan-500 text-cyan-500" : ""
                }`,
              })}
            >
              <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
            </Label>
          </div>

          {/* Status / Prompt Bar */}
          <div className="grow relative flex items-center">
            <Textarea
              disabled={true}
              value={
                isProcessing
                  ? `${progress}`
                  : transcript
                  ? "Ready."
                  : mediaFile
                  ? "Start."
                  : "Upload"
              }
              className="grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-[54px] cursor-not-allowed select-none focus:ring-0"
              rows={1}
            />

            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {/* ACTION BUTTON */}
              {transcript ? (
                <Button
                  onClick={handleCopy}
                  className="h-9 px-4 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs shadow-lg gap-2"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Copy</span>
                </Button>
              ) : (
                <Button
                  onClick={handleTranscribe}
                  disabled={!mediaFile || isProcessing}
                  className={`h-9 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                    !mediaFile || isProcessing
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"
                  }`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden md:inline font-semibold">
                        Free
                      </span>
                      <span className="md:hidden font-semibold">Free</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
