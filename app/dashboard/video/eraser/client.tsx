"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Eraser,
  Undo,
  Cpu,
  Sparkles,
} from "lucide-react";

// ✅ FIXED: Added missing VideoInfo interface
interface VideoInfo {
  name: string;
  duration: number;
  width: number;
  height: number;
  size: number;
}

const MAX_FILE_SIZE_MB = 100;
const MAX_DURATION_SEC = 60;

export default function VideoWatermarkRemoverPage() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [outputVideoUrl, setOutputVideoUrl] = useState<string | null>(null);

  const [status, setStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [progressText, setProgressText] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);

  const [brushSize, setBrushSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  const revokeUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File size cannot exceed ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    revokeUrl(videoPreviewUrl);
    revokeUrl(outputVideoUrl);

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.src = url;

    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration > MAX_DURATION_SEC) {
        toast.error(
          `Video is too long! Max allowed duration is ${MAX_DURATION_SEC} seconds.`,
        );
        URL.revokeObjectURL(url);
        return;
      }

      setVideoFile(file);
      setVideoPreviewUrl(url);
      setOutputVideoUrl(null);
      setStatus("idle");
      setProgressPercent(0);
      setHistory([]);
      setVideoInfo({
        name: file.name,
        duration: tempVideo.duration,
        width: tempVideo.videoWidth,
        height: tempVideo.videoHeight,
        size: file.size,
      });

      if (canvasRef.current) {
        canvasRef.current.width = tempVideo.videoWidth;
        canvasRef.current.height = tempVideo.videoHeight;
      }
    };
  };

  const clearVideo = () => {
    revokeUrl(videoPreviewUrl);
    revokeUrl(outputVideoUrl);
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setOutputVideoUrl(null);
    setVideoInfo(null);
    setStatus("idle");
    setHistory([]);
    workerRef.current?.terminate();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- DRAWING LOGIC ---
  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || status === "processing") return;
    setIsDragging(true);
    const pos = getPointerPos(e);
    lastPosRef.current = pos;

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = "#ef4444";
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !canvasRef.current || !lastPosRef.current) return;
    const currentPos = getPointerPos(e);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#ef4444";

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    if (isDragging && canvasRef.current) {
      setIsDragging(false);
      lastPosRef.current = null;
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        const snapshot = ctx.getImageData(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height,
        );
        setHistory((prev) => [...prev, snapshot].slice(-10));
      }
    }
  };

  const handleUndo = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || history.length === 0) return;

    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);

    if (newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };

  // --- PROCESS VIDEO ---
  const handleProcess = async () => {
    if (!videoFile || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");
    const imgData = ctx?.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
    const hasDrawn = imgData?.data.some(
      (alpha, index) => index % 4 === 3 && alpha > 0,
    );

    if (!hasDrawn) return toast.error("Please draw over the watermark first!");

    setStatus("processing");
    setProgressPercent(0);
    setProgressText("Extracting mask...");

    const maskBitmap = await createImageBitmap(canvasRef.current);

    workerRef.current?.terminate();
    workerRef.current = new Worker(
      new URL("./video-eraser.worker.ts", import.meta.url),
    );

    workerRef.current.onmessage = (e) => {
      const { cmd, data, percent, text } = e.data;

      if (cmd === "progress") {
        setProgressPercent(data?.percent ?? percent ?? 0);
        setProgressText(data?.text ?? text ?? "Processing...");
      } else if (cmd === "success") {
        const blob = new Blob([data], { type: "video/mp4" });
        setOutputVideoUrl(URL.createObjectURL(blob));
        setStatus("completed");
        toast.success("Watermark Erased!");
        workerRef.current?.terminate();
      } else if (cmd === "error") {
        setStatus("failed");
        toast.error("Error: " + data);
        workerRef.current?.terminate();
      }
    };

    workerRef.current.postMessage({ file: videoFile, maskBitmap }, [
      maskBitmap,
    ]);
  };

  const handleDownload = () => {
    if (!outputVideoUrl) return;
    const link = document.createElement("a");
    link.href = outputVideoUrl;
    link.download = `Erased_Video.mp4`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] text-gray-300">
      <div className="grow no-sidebar-swipe overflow-hidden relative flex items-center justify-center">
        <div className="w-full h-full overflow-auto flex flex-col items-center justify-center p-6">
          {/* EMPTY UI */}
          {status === "idle" && !videoPreviewUrl && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-10 max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
              <Eraser className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                AI Video Eraser
              </h1>
              <p className="text-gray-500 mb-6">
                Upload a video and paint over watermarks or objects to remove
                them seamlessly.
              </p>

              <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full">
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-teal-300">
                    <Cpu className="h-5 w-5" />
                    <p className="text-sm font-medium">Running Locally</p>
                  </div>
                  <p className="text-xs text-teal-200/70 leading-relaxed">
                    Uses OpenCV Inpainting natively in your browser. No server
                    uploads.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* EDITOR UI */}
          {(status === "idle" || status === "failed") &&
            videoPreviewUrl &&
            videoInfo && (
              <div className="animate-in fade-in duration-500 relative w-full flex justify-center items-center h-full">
                <div
                  className="relative shadow-2xl rounded-lg overflow-hidden border border-white/10 bg-black"
                  style={{
                    aspectRatio: `${videoInfo.width} / ${videoInfo.height}`,
                    maxHeight: "60vh",
                    maxWidth: "100%",
                    height: "100%",
                  }}
                >
                  <video
                    ref={videoRef}
                    src={videoPreviewUrl}
                    className="absolute inset-0 w-full h-full block pointer-events-none"
                    loop
                    muted
                    autoPlay
                    playsInline
                  />

                  {/* Drawing Overlay */}
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute inset-0 w-full h-full touch-none cursor-crosshair z-10 opacity-60"
                  />

                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearVideo}
                    className="absolute top-3 right-3 h-10 w-10 rounded-full shadow-2xl z-50 border-2 border-white/20 bg-red-600 hover:bg-red-500 hover:scale-105 transition-all"
                  >
                    <XCircle className="h-6 w-6 text-white" />
                  </Button>
                </div>
              </div>
            )}

          {/* PROCESSING UI */}
          {status === "processing" && (
            <div className="flex flex-col items-center justify-center p-10 bg-slate-900/60 rounded-2xl border border-white/5 w-full max-w-sm">
              <Loader2 className="h-12 w-12 animate-spin text-teal-500 mb-4" />
              <p className="text-base font-semibold text-white mb-1">
                Erasing Watermark...
              </p>
              <p className="text-xs text-teal-400 text-center">
                {progressText}
              </p>
              <div className="w-full h-1 bg-gray-800 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* COMPLETED UI */}
          {status === "completed" && outputVideoUrl && (
            <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center gap-4 w-full max-w-4xl">
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" /> Erase Complete
              </h2>
              <video
                src={outputVideoUrl}
                className="max-h-[60vh] max-w-full rounded-xl shadow-2xl border border-white/10"
                controls
                autoPlay
                loop
              />
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent z-10">
        <div className="flex flex-col items-center max-w-3xl mx-auto gap-3">
          {/* Editing Toolbar */}
          {(status === "idle" || status === "failed") && videoPreviewUrl && (
            <div className="flex items-center justify-between w-full bg-gray-900/60 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-lg">
              <div className="flex items-center gap-3 w-48 px-2">
                <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
                  Brush
                </span>
                <Slider
                  value={[brushSize]}
                  min={5}
                  max={80}
                  step={1}
                  onValueChange={(v) => setBrushSize(v[0])}
                  className="[&_.bg-primary]:bg-red-500!" // ✅ FIXED: Tailwind v4 syntax
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="text-gray-300 hover:text-white"
              >
                <Undo className="w-4 h-4 mr-2" /> Undo
              </Button>
            </div>
          )}

          <div className="flex items-center gap-3 w-full">
            <div className="shrink-0">
              <Input
                ref={fileInputRef}
                id="video-upload-main"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mkv,.mov"
                onChange={handleFileChange}
                className="hidden"
                disabled={status === "processing"}
              />
              <Label
                htmlFor="video-upload-main"
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: `cursor-pointer h-12 w-12 flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${
                    videoPreviewUrl
                      ? "border-cyan-500/60 text-cyan-600"
                      : "text-gray-500"
                  } ${status === "processing" ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`,
                })}
              >
                <UploadCloud className="h-5 w-5" />
              </Label>
            </div>

            <div className="grow relative flex items-center">
              {/* ✅ FIXED: flex-grow is now grow */}
              <Textarea
                disabled
                value={
                  !videoPreviewUrl
                    ? "Upload video..."
                    : status === "processing"
                      ? progressText
                      : status === "completed"
                        ? "✓ Done!"
                        : "Draw over watermark to erase"
                }
                className="grow bg-gray-900/30 border border-gray-800 rounded-xl resize-none text-sm text-gray-400 pl-4 pr-28 py-3.5 self-center h-12 cursor-not-allowed select-none"
                rows={1}
              />

              {status === "processing" && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-linear-to-r from-cyan-500 to-teal-500 rounded-xl transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              )}

              <div className="absolute right-1.5 top-1/2 transform -translate-y-1/2 flex items-center">
                {status === "completed" && (
                  <Button
                    onClick={handleDownload}
                    className="h-9 px-6 rounded-full bg-linear-to-r from-cyan-500 to-teal-500 text-black font-bold text-xs shadow-lg"
                  >
                    <Download className="w-4 h-4 mr-2" /> Save
                  </Button>
                )}

                {status === "processing" && (
                  <Loader2 className="h-5 w-5 animate-spin text-teal-500 mr-2" />
                )}

                {(status === "idle" || status === "failed") && (
                  <Button
                    onClick={handleProcess}
                    disabled={!videoFile}
                    className={`h-9 px-4 rounded-full text-xs font-semibold shadow-lg ${
                      !videoFile
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-linear-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white"
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5 mr-1.5" /> Erase Free
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
