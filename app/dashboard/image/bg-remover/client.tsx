"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Download,
  UploadCloud,
  ImageOff,
  XCircle,
  Eraser,
  Brush,
  Undo,
  Coins,
  ZoomIn,
  ZoomOut,
  Cpu,
  Sparkles,
  Zap,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

// --- Types ---
type ToolType = "none" | "erase" | "restore";

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  originalUrl: string;
}

const ImageBgRemoverPage = () => {
  // --- State ---
  const [statusText, setStatusText] = useState("Upload");

  // File & Preview
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Job & AI State
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState("Processing...");

  // 🌟 NEW: Model Selector State
  const [aiModel, setAiModel] = useState<"briaai/RMBG-1.4" | "Xenova/modnet">(
    "briaai/RMBG-1.4",
  );

  // Editor / Canvas State
  const [tool, setTool] = useState<ToolType>("none");
  const [brushSize, setBrushSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Zoom State
  const [zoom, setZoom] = useState(1);
  const [imageDimensions, setImageDimensions] = useState<{
    w: number;
    h: number;
  } | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const progressRef = useRef<string>("Initializing...");

  // --- MEMORY MANAGEMENT HELPER ---
  const revokeUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  // --- Effects ---
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./bg-remover.worker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current.onmessage = (event) => {
      const { status, blob, error, percent, key } = event.data;

      if (status === "progress") {
        progressRef.current = `${key || "Processing..."} ${percent}%`;
        setProgressText(`${key || "Processing..."} ${percent}%`);
      } else if (status === "success") {
        const generatedUrl = URL.createObjectURL(blob);

        setActiveJob((prev) => {
          if (prev && prev.urls[0]) revokeUrl(prev.urls[0]);
          return { ...prev!, status: "completed", urls: [generatedUrl] };
        });

        setIsLoading(false);
        toast.success("Background Removed!");
      } else if (status === "error") {
        console.error(error);
        setActiveJob((prev) => (prev ? { ...prev, status: "failed" } : null));
        setIsLoading(false);
        toast.error("Failed to process image.");
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (activeJob?.status === "completed" && activeJob.urls[0]) {
      const timer = setTimeout(() => {
        initializeCanvas(activeJob.urls[0]);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeJob]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setProgressText((prev) => {
          if (prev !== progressRef.current) return progressRef.current;
          return prev;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // --- Toggle Logic ---
  const toggleTool = (selectedTool: ToolType) => {
    setTool((currentTool) =>
      currentTool === selectedTool ? "none" : selectedTool,
    );
  };

  // --- Logic ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size cannot exceed 15MB for browser processing.");
        return;
      }

      revokeUrl(imagePreviewUrl);
      if (activeJob?.urls[0]) revokeUrl(activeJob.urls[0]);

      setSourceImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);

      const img = new Image();
      img.src = url;
      originalImageRef.current = img;

      setActiveJob(null);
      setHistory([]);
      setTool("none");
      setZoom(1);
      setImageDimensions(null);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    revokeUrl(imagePreviewUrl);
    if (activeJob?.urls[0]) revokeUrl(activeJob.urls[0]);

    setSourceImageFile(null);
    setImagePreviewUrl(null);
    setActiveJob(null);
    setHistory([]);
    setZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!sourceImageFile || !imagePreviewUrl) {
      toast.error("Please upload an image.");
      return;
    }

    if (!workerRef.current) {
      toast.error("Worker not initialized. Please refresh.");
      return;
    }

    setIsLoading(true);
    progressRef.current = "Starting...";

    const newJobId = `job-${Date.now()}`;
    setActiveJob({
      id: newJobId,
      status: "processing",
      urls: [],
      originalUrl: imagePreviewUrl,
    });

    // 🌟 NEW: Pass the selected model to the worker
    workerRef.current.postMessage({
      imageBlob: sourceImageFile,
      modelName: aiModel,
    });
  };

  // --- Zoom Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -5 : 5;
      setBrushSize((prev) => Math.min(Math.max(prev + delta, 5), 100));
      return;
    }

    if (e.ctrlKey || !isDragging) {
      const scaleAmount = -e.deltaY * 0.001;
      setZoom((prev) => Math.min(Math.max(prev + scaleAmount, 0.1), 5));
    }
  };

  // --- Canvas Drawing Logic ---
  const initializeCanvas = (url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.src = url;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      setImageDimensions({ w: img.width, h: img.height });

      if (containerRef.current) {
        const containerW = containerRef.current.clientWidth - 40;
        const containerH = containerRef.current.clientHeight - 40;
        const scaleW = containerW / img.width;
        const scaleH = containerH / img.height;
        const initialZoom = Math.min(scaleW, scaleH, 1);
        setZoom(initialZoom);
      } else {
        setZoom(1);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
  };

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    setHistory((prev) => {
      const newHistory = [
        ...prev,
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      ];
      if (newHistory.length > 10) newHistory.shift();
      return newHistory;
    });
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
    }
  };

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

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (
      !isDragging ||
      tool === "none" ||
      !canvasRef.current ||
      !lastPosRef.current
    )
      return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const currentPos = getPointerPos(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (tool === "restore" && originalImageRef.current) {
      ctx.globalCompositeOperation = "source-over";
      const pattern = ctx.createPattern(originalImageRef.current, "no-repeat");
      if (pattern) ctx.strokeStyle = pattern;
    }

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === "none") return;
    setIsDragging(true);
    const pos = getPointerPos(e);
    lastPosRef.current = pos;

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && lastPosRef.current) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDragging) {
      setIsDragging(false);
      lastPosRef.current = null;
      saveHistory();
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bg-removed-edited.png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* 1. MAIN PREVIEW AREA */}
      <div className="grow overflow-hidden  relative flex items-center justify-center">
        <div
          ref={containerRef}
          className="w-full h-full overflow-auto flex items-center justify-center p-8"
        >
          {/* STATE 1: Empty */}
          {!activeJob && !imagePreviewUrl && (
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="flex flex-col items-center justify-center text-center text-gray-600">
                <ImageOff className="h-20 w-20 mb-6 opacity-30" />
                <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                  AI Background Remover
                </h1>
                <p className="text-gray-500 max-w-md">
                  Upload an image to remove background.
                </p>
              </div>
              <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-teal-300">
                    <Cpu className="h-5 w-5" />
                    <p className="text-sm font-medium">Running Locally</p>
                  </div>
                  <p className="text-xs text-teal-200/70 leading-relaxed">
                    100% Private. Runs entirely on your device. No images leave
                    your browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: Image Preview */}
          {!activeJob && imagePreviewUrl && (
            <div className="animate-in fade-in duration-500 relative group w-fit h-auto shadow-2xl">
              <img
                src={imagePreviewUrl}
                alt="Source"
                className="max-h-[60vh] max-w-full w-auto object-contain rounded-lg"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={clearImage}
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STATE 3: Processing */}
          {activeJob && activeJob.status === "processing" && (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 rounded-2xl border border-white/5">
              <Loader2 className="h-10 w-10 animate-spin text-teal-500 mb-4" />
              <p className="text-lg font-medium text-white mb-1">
                AI is working...
              </p>
              <p className="text-sm text-gray-500">{progressText}</p>
            </div>
          )}

          {/* STATE 4: Interactive Canvas (Result) */}
          {activeJob && activeJob.status === "completed" && (
            <div
              className="relative shadow-2xl overflow-hidden rounded-lg transition-transform duration-75 ease-out"
              onWheel={handleWheel}
              style={{
                width: imageDimensions ? imageDimensions.w * zoom : "auto",
                height: imageDimensions ? imageDimensions.h * zoom : "auto",
                // Checkered background makes transparency easy to see
                backgroundImage:
                  "repeating-conic-gradient(#1f2937 0% 25%, transparent 0% 50%)",
                backgroundSize: "20px 20px",
              }}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full touch-none cursor-crosshair block no-sidebar-swipe"
              />
            </div>
          )}

          {/* STATE 5: Failed */}
          {activeJob && activeJob.status === "failed" && (
            <div className="p-6 bg-red-900/20 border border-red-500/20 rounded-xl text-center">
              <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-200">Processing failed.</p>
              <Button
                variant="ghost"
                onClick={clearImage}
                className="mt-4 text-red-300 hover:text-red-100"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Input Bar & Toolbar */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent z-10">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto mb-3 gap-3">
          {/* Editor Toolbar */}
          {activeJob?.status === "completed" && (
            <div className="flex flex-col md:flex-row items-center gap-2 bg-slate-900/90 backdrop-blur-md p-3 md:p-2 rounded-xl border border-white/10 animate-in slide-in-from-bottom-2 fade-in shadow-xl w-full md:w-auto">
              {/* SLIDERS & BUTTONS (Omitted for brevity, kept exactly the same as your code) */}
              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                <div className="flex items-center gap-2">
                  <Button
                    variant={tool === "restore" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleTool("restore")}
                    className={`h-8 text-xs transition-all ${
                      tool === "restore"
                        ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md hover:from-teal-600 hover:to-cyan-600"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Brush className="w-3 h-3 mr-2" /> Restore
                  </Button>

                  <Button
                    variant={tool === "erase" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => toggleTool("erase")}
                    className={`h-8 text-xs transition-all ${
                      tool === "erase"
                        ? "bg-red-600 text-white shadow-md hover:bg-red-700"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Eraser className="w-3 h-3 mr-2" /> Erase
                  </Button>
                </div>

                <div className="hidden md:flex items-center gap-2 w-24 px-2">
                  <Slider
                    defaultValue={[30]}
                    max={100}
                    min={5}
                    step={1}
                    value={[brushSize]}
                    onValueChange={(vals) => setBrushSize(vals[0])}
                    className="h-4 [&_.bg-primary]:!bg-gradient-to-r [&_.bg-primary]:!from-cyan-500 [&_.bg-primary]:!to-teal-500"
                  />
                </div>

                <div className="hidden md:block w-px h-4 bg-white/10 mx-1"></div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
                  >
                    <ZoomOut className="w-3 h-3" />
                  </Button>
                  <span className="text-[10px] w-8 text-center text-gray-500 hidden sm:inline-block">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:text-white"
                    onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
                  >
                    <ZoomIn className="w-3 h-3" />
                  </Button>
                </div>

                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white"
                  onClick={handleUndo}
                  disabled={history.length <= 1}
                >
                  <Undo className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Input & Button Row Wrapper */}
        <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-2">
          {/* 🌟 NEW: Centered, Gradient Studio Model Selector */}
          {(!activeJob || activeJob.status === "failed") && (
            <div className="flex items-center gap-1 self-center bg-gray-900/60 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-lg z-20 mb-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiModel("briaai/RMBG-1.4")}
                className={`h-8 text-xs px-4 rounded-full transition-all duration-300 ${
                  aiModel === "briaai/RMBG-1.4"
                    ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold shadow-md hover:from-teal-600 hover:to-cyan-600"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles
                  className={`w-3.5 h-3.5 mr-1.5 ${
                    aiModel === "briaai/RMBG-1.4"
                      ? "text-black"
                      : "text-teal-400"
                  }`}
                />
                HD (150 MB)
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiModel("Xenova/modnet")}
                className={`h-8 text-xs px-4 rounded-full transition-all duration-300 ${
                  aiModel === "Xenova/modnet"
                    ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold shadow-md hover:from-teal-600 hover:to-cyan-600"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Zap
                  className={`w-3.5 h-3.5 mr-1.5 ${
                    aiModel === "Xenova/modnet" ? "text-black" : "text-teal-400"
                  }`}
                />
                Fast (25 MB)
              </Button>
            </div>
          )}

          {/* Actual Input Row */}
          <div className="p-1 rounded-xl flex items-start gap-3">
            <div className="shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-image-upload-genpage"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageFileChange}
                className="hidden"
                disabled={isLoading}
              />
              <Label
                htmlFor="source-image-upload-genpage"
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${
                    imagePreviewUrl ? "border-cyan-500 text-cyan-500" : ""
                  }`,
                })}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            <div className="grow relative flex items-center">
              <Textarea
                id="prompt"
                placeholder="Upload"
                value={statusText}
                onChange={(e) => setStatusText(e.target.value)}
                rows={1}
                disabled={true}
                className="grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-13.5 cursor-not-allowed select-none"
              />

              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                {activeJob?.status === "completed" && (
                  <Button
                    onClick={handleDownload}
                    className="h-10 px-4 rounded-full bg-teal-600 hover:bg-teal-500 text-white text-xs shadow-lg"
                  >
                    <Download className="w-4 h-4 mr-1.5" /> Save
                  </Button>
                )}

                {(!activeJob || activeJob.status !== "completed") && (
                  <Button
                    onClick={handleGenerate}
                    disabled={!sourceImageFile || isLoading}
                    className={`h-10 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                      !sourceImageFile || isLoading
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span className="text-xs font-semibold whitespace-nowrap">
                          Free
                        </span>
                        <Coins className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageBgRemoverPage;
