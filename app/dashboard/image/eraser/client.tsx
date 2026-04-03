"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Eraser,
  Undo,
  ZoomIn,
  ZoomOut,
  Coins,
  Cpu,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

const MagicEraserPage = () => {
  // --- State ---
  const [statusText, setStatusText] = useState("Upload");
  const [ready, setReady] = useState(false);

  // File & Preview
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);

  // Editor State
  const [brushSize, setBrushSize] = useState(30);
  const [isDragging, setIsDragging] = useState(false);

  // Zoom
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

  // Undo History
  const [history, setHistory] = useState<ImageData[]>([]);

  // --- MEMORY CLEANUP ---
  const revokeUrl = (url: string | null) => {
    if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  // --- WORKER SETUP ---
  // --- WORKER SETUP ---
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./magic-eraser.worker.ts", import.meta.url),
      { type: "module" }, // ✅ CRITICAL FIX: Add this object
    );

    workerRef.current.onmessage = (e) => {
      const { status, result, error } = e.data;

      if (status === "ready") {
        setReady(true);
      }

      if (status === "done") {
        const c = document.createElement("canvas");
        c.width = result.width;
        c.height = result.height;
        c.getContext("2d")!.putImageData(result, 0, 0);

        c.toBlob((b) => {
          if (!b) return;
          const url = URL.createObjectURL(b);

          revokeUrl(imagePreviewUrl);
          setImagePreviewUrl(url);

          const img = new Image();
          img.src = url;
          img.onload = () => {
            originalImageRef.current = img;
          };

          const ctx = canvasRef.current?.getContext("2d");
          ctx?.clearRect(
            0,
            0,
            canvasRef.current!.width,
            canvasRef.current!.height,
          );
          setHistory([]);

          setIsProcessing(false);
          toast.success("Object Removed!");
        }, "image/png");
      }

      if (status === "error") {
        console.error(error);
        toast.error("Error: " + error);
        setIsProcessing(false);
      }
    };

    workerRef.current.postMessage({ action: "preload" });

    return () => workerRef.current?.terminate();
  }, []);

  // --- IMAGE UPLOAD ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error("File size cannot exceed 15MB.");
        return;
      }
      revokeUrl(imagePreviewUrl);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);

      const img = new Image();
      img.src = url;
      img.onload = () => {
        originalImageRef.current = img;
        setImageDimensions({ w: img.width, h: img.height });

        if (containerRef.current) {
          const padding = window.innerWidth < 768 ? 20 : 40;
          const scale = Math.min(
            (containerRef.current.clientWidth - padding) / img.width,
            (containerRef.current.clientHeight - padding) / img.height,
            1,
          );
          setZoom(scale);
        }
      };

      setHistory([]);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    revokeUrl(imagePreviewUrl);
    setImagePreviewUrl(null);
    setHistory([]);
    setImageDimensions(null);
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
    if (!canvasRef.current || isProcessing) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }

    setIsDragging(true);
    const pos = getPointerPos(e);
    lastPosRef.current = pos;

    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !canvasRef.current || !lastPosRef.current) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const currentPos = getPointerPos(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    lastPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    if (isDragging) {
      setIsDragging(false);
      lastPosRef.current = null;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
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

  const handleGenerate = async () => {
    if (!originalImageRef.current || !canvasRef.current || !imagePreviewUrl)
      return;

    setIsProcessing(true);

    try {
      const imageRes = await fetch(imagePreviewUrl);
      const imageBlob = await imageRes.blob();
      const imageBitmap = await createImageBitmap(imageBlob);
      const maskBitmap = await createImageBitmap(canvasRef.current);

      workerRef.current?.postMessage(
        { action: "process", imageBitmap, maskBitmap },
        [imageBitmap, maskBitmap],
      );
    } catch (error: any) {
      console.error(error);
      toast.error("Failed: " + (error.message || "Unknown error"));
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!imagePreviewUrl) return;
    const link = document.createElement("a");
    link.href = imagePreviewUrl;
    link.setAttribute("download", "magic-erased.png");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="grow overflow-hidden  relative flex items-center justify-center">
        <div
          ref={containerRef}
          className="w-full h-full overflow-auto flex items-center justify-center p-2 md:p-8"
        >
          {!imagePreviewUrl && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 space-y-6 max-w-md">
              <div className="flex flex-col items-center justify-center">
                <Eraser className="h-20 w-20 mb-6 opacity-30" />
                <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                  Magic Eraser
                </h1>
                <p className="text-gray-500">
                  Upload and paint over objects to remove them.
                </p>
              </div>

              {/* ✅ ADDED: Teal Info Box */}
              <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1 text-center">
                  {/* Centered Heading with Icon */}
                  <div className="flex items-center justify-center gap-2 text-teal-300">
                    <Cpu className="h-5 w-5" />
                    <p className="text-sm font-medium">Running Locally</p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-teal-200/70 leading-relaxed">
                    100% Private. Runs entirely on your device using a 2MB
                    model. No images leave your browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <Loader2 className="h-12 w-12 animate-spin text-teal-500 mb-4" />
              <p className="text-white font-medium animate-pulse">
                Removing...
              </p>
            </div>
          )}

          {imagePreviewUrl && imageDimensions && (
            <div
              className="relative shadow-2xl overflow-hidden rounded-lg bg-[repeating-conic-gradient(#80808033_0%_25%,transparent_0%_50%)] bg-[length:20px_20px] transition-transform duration-75 ease-out"
              onWheel={(e) => {
                if (!e.ctrlKey && !isDragging) {
                  setZoom((z) =>
                    Math.max(0.1, z + (e.deltaY > 0 ? -0.1 : 0.1)),
                  );
                }
              }}
              style={{
                width: imageDimensions.w * zoom,
                height: imageDimensions.h * zoom,
              }}
            >
              <img
                src={imagePreviewUrl}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                alt="Editing"
              />

              <canvas
                ref={canvasRef}
                width={imageDimensions.w}
                height={imageDimensions.h}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 w-full h-full touch-none cursor-crosshair opacity-70 no-sidebar-swipe"
              />

              {/* Download Button (Top Left) */}
              <Button
                variant="secondary"
                size="icon"
                onClick={handleDownload}
                className="absolute top-2 left-2 h-8 w-8 rounded-full shadow-lg z-50 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-white"
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Close Button (Top Right) */}
              <Button
                variant="destructive"
                size="icon"
                onClick={clearImage}
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg z-50"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-4 pb-4 pt-2 bg-transparent z-10">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto mb-3 gap-3">
          {imagePreviewUrl && (
            <div className="flex flex-col md:flex-row items-center gap-2 bg-slate-900/90 backdrop-blur-md p-3 md:p-2 rounded-xl border border-white/10 shadow-xl w-full md:w-auto">
              {/* MOBILE LAYOUT */}
              <div className="flex md:hidden flex-col w-full">
                {/* Row 1: Slider */}
                <div className="flex flex-col w-full border-b border-white/10 pb-3 mb-3">
                  <span className="text-[10px] uppercase font-bold text-gray-500 mb-1 px-1 no-sidebar-swipe">
                    Brush: {brushSize}px
                  </span>
                  <Slider
                    value={[brushSize]}
                    min={5}
                    max={100}
                    step={1}
                    onValueChange={(v) => setBrushSize(v[0])}
                    className="[&_.bg-primary]:!bg-red-500 mt-2 no-sidebar-swipe"
                  />
                </div>

                {/* Row 2: Zoom + Undo Combined for Mobile */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
                      className="h-8 w-8"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-gray-500 w-8 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setZoom((z) => z + 0.1)}
                      className="h-8 w-8"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Undo Button moved here for mobile */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="h-8 w-8"
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* DESKTOP LAYOUT (Unchanged structure) */}
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 w-32 px-2">
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    Size
                  </span>
                  <Slider
                    value={[brushSize]}
                    min={5}
                    max={100}
                    step={1}
                    onValueChange={(v) => setBrushSize(v[0])}
                    className="[&_.bg-primary]:!bg-red-500"
                  />
                </div>

                <div className="w-px h-4 bg-white/10 mx-1"></div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-xs text-gray-500 w-8 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setZoom((z) => z + 0.1)}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </div>

                <div className="w-px h-4 bg-white/10 mx-1"></div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUndo}
                  disabled={history.length === 0}
                >
                  <Undo className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-3">
          <div className="shrink-0 relative">
            <Input
              ref={fileInputRef}
              id="source-image-upload-magic"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleImageFileChange}
              className="hidden"
              disabled={isProcessing}
            />
            <Label
              htmlFor="source-image-upload-magic"
              className={buttonVariants({
                variant: "outline",
                size: "icon",
                className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-red-500 hover:text-red-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${
                  imagePreviewUrl ? "border-red-500 text-red-500" : ""
                }`,
              })}
            >
              <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
            </Label>
          </div>

          <div className="grow relative flex items-center">
            <Textarea
              readOnly
              value={statusText}
              rows={1}
              className="grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-13.5 cursor-not-allowed select-none focus-visible:ring-0"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {imagePreviewUrl ? (
                <>
                  <Button
                    onClick={handleGenerate}
                    disabled={isProcessing}
                    className="h-10 px-4 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs shadow-lg"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Eraser className="w-4 h-4 mr-1.5" /> Erase
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  disabled
                  className="h-10 px-4 rounded-full bg-gray-700 text-gray-400"
                >
                  <Coins className="w-4 h-4 mr-1.5 text-teal-400" />
                  {ready ? "Free" : "Loading..."}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagicEraserPage;
