"use client";

import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Download,
  UploadCloud,
  ImagePlus,
  XCircle,
  Paintbrush,
  Eraser,
  Trash2,
  Coins,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

// Auth & Client
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

// Configure Fal Proxy
fal.config({
  proxyUrl: "/api/fal/proxy",
});

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
}

const ImageEditingPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isMounted, setIsMounted] = useState(false);

  // --- State ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  // Image State
  const [originalImagePreview, setOriginalImagePreview] = useState<
    string | null
  >(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(
    null,
  );
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);

  // Inpainting State
  const [isInpaintMode, setIsInpaintMode] = useState(false);
  const [drawingTool, setDrawingTool] = useState<"brush" | "eraser">("brush");
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnMask, setHasDrawnMask] = useState(false);

  // UI
  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const mainInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- Canvas Logic ---
  useEffect(() => {
    if (
      isInpaintMode &&
      canvasRef.current &&
      imageRef.current &&
      currentImagePreview
    ) {
      const canvas = canvasRef.current;
      const img = imageRef.current;

      setTimeout(() => {
        if (!img.clientWidth || !img.clientHeight) return;

        if (
          canvas.width !== img.clientWidth ||
          canvas.height !== img.clientHeight
        ) {
          canvas.width = img.clientWidth;
          canvas.height = img.clientHeight;
        }

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; // Visual Brush
          ctx.lineWidth = brushSize;
          ctxRef.current = ctx;
        }
      }, 50);
    }
  }, [isInpaintMode, currentImagePreview]);

  // Update Brush Settings
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.lineWidth = brushSize;
      if (drawingTool === "eraser") {
        ctxRef.current.globalCompositeOperation = "destination-out";
      } else {
        ctxRef.current.globalCompositeOperation = "source-over";
        ctxRef.current.strokeStyle = "rgba(255, 255, 255, 0.8)";
      }
    }
  }, [drawingTool, brushSize, isInpaintMode]);

  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!ctxRef.current || !canvasRef.current) return;
    setIsDrawing(true);
    setHasDrawnMask(true);
    const { offsetX, offsetY } = getCoordinates(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing || !ctxRef.current || !canvasRef.current) return;
    const { offsetX, offsetY } = getCoordinates(e);
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    if (!ctxRef.current) return;
    ctxRef.current.closePath();
    setIsDrawing(false);
  };

  const getCoordinates = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    };
  };

  const clearMask = () => {
    if (canvasRef.current && ctxRef.current) {
      ctxRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      setHasDrawnMask(false);
    }
  };

  const getMaskBlob = async (): Promise<Blob | null> => {
    if (!canvasRef.current || !imageRef.current || !hasDrawnMask) return null;

    const tempCanvas = document.createElement("canvas");
    const nw = imageRef.current.naturalWidth;
    const nh = imageRef.current.naturalHeight;
    tempCanvas.width = nw;
    tempCanvas.height = nh;

    const tCtx = tempCanvas.getContext("2d");
    if (!tCtx) return null;

    // Draw visual mask
    tCtx.drawImage(canvasRef.current, 0, 0, nw, nh);

    // Convert to Binary Mask (White = Edit, Black = Keep)
    tCtx.globalCompositeOperation = "source-in";
    tCtx.fillStyle = "#FFFFFF";
    tCtx.fillRect(0, 0, nw, nh);

    tCtx.globalCompositeOperation = "destination-over";
    tCtx.fillStyle = "#000000";
    tCtx.fillRect(0, 0, nw, nh);

    return new Promise((resolve) => tempCanvas.toBlob(resolve, "image/png"));
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024)
        return toast.error("Max file size 10MB");

      setMainImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setOriginalImagePreview(result);
        setCurrentImagePreview(result);
      };
      reader.readAsDataURL(file);
      e.target.value = "";

      setIsInpaintMode(false);
      setHasDrawnMask(false);
      setActiveJobs([]);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (currentImagePreview !== originalImagePreview) {
      setCurrentImagePreview(originalImagePreview);
      setIsInpaintMode(false);
      setHasDrawnMask(false);
      setActiveJobs([]);
      toast.info("Reverted to original image");
      return;
    }

    setMainImageFile(null);
    setOriginalImagePreview(null);
    setCurrentImagePreview(null);
    setIsInpaintMode(false);
    setHasDrawnMask(false);
    setActiveJobs([]);
    if (mainInputRef.current) mainInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!currentImagePreview) return toast.error("No image to edit.");
    if (isInpaintMode && !hasDrawnMask)
      return toast.error("Please paint the area to change.");
    if (!prompt) return toast.error("Please enter a prompt.");

    setIsLoading(true);
    toast.info("Generating... (Cost: 15 Coins)");

    const newJobId = `job-${Date.now()}`;

    try {
      // 1. Get Mask Blob
      let maskBlob: Blob | null = null;
      if (isInpaintMode && hasDrawnMask) {
        maskBlob = await getMaskBlob();
        if (!maskBlob) throw new Error("Failed to capture mask.");
      }

      setActiveJobs([{ id: newJobId, status: "processing", urls: [] }]);

      // 2. Handle Main Image Upload
      let mainUrl = "";

      if (currentImagePreview.startsWith("data:")) {
        // Upload initial file
        if (mainImageFile) {
          mainUrl = await fal.storage.upload(mainImageFile);
        } else {
          const res = await fetch(currentImagePreview);
          const blob = await res.blob();
          mainUrl = await fal.storage.upload(blob);
        }
      } else {
        // Re-uploading a remote/local result for the next edit
        // This ensures Fal can always access the latest version
        console.log("Uploading existing image for edit...");
        const response = await fetch(currentImagePreview);
        const blob = await response.blob();
        mainUrl = await fal.storage.upload(blob);
      }

      // 3. Upload Mask
      let maskUrl = null;
      if (maskBlob) {
        maskUrl = await fal.storage.upload(maskBlob);
      }

      // 4. Call API
      const response = await fetch("/api/fal/inpainting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            prompt: prompt,
            image_url: mainUrl,
            mask_url: maskUrl,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) toast.error("Insufficient coins!");
        else toast.error(data.error || "Generation failed");
        throw new Error(data.error);
      }

      const generatedUrl = data.imageUrl;

      setCurrentImagePreview(generatedUrl);
      setActiveJobs([]);
      setIsInpaintMode(false);
      setHasDrawnMask(false);
      setPrompt("");

      toast.success("Generation Complete!");
    } catch (error: any) {
      console.error(error);
      setActiveJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!currentImagePreview) return;
    try {
      const response = await fetch(currentImagePreview);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `edit-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed");
    }
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* 1. MAIN PREVIEW AREA */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col justify-center min-h-[60vh]">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {!currentImagePreview && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600">
              <ImagePlus className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Image Editor
              </h1>
              <p className="text-gray-500 max-w-md">
                Upload an image, brush over an area, and type.
              </p>
            </div>
          )}

          {currentImagePreview && activeJobs.length === 0 && (
            <div className="no-sidebar-swipe relative rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black/40 group w-fit h-auto animate-in fade-in duration-300">
              {/* Standard img for Canvas compatibility */}
              <img
                ref={imageRef}
                src={currentImagePreview}
                alt="Work"
                crossOrigin="anonymous" // Important for canvas
                className={`max-h-[65vh] max-w-full w-auto object-contain block ${
                  isInpaintMode ? "cursor-crosshair" : ""
                }`}
                draggable={false}
              />

              <canvas
                ref={canvasRef}
                className={`absolute inset-0 z-10 touch-none ${
                  isInpaintMode
                    ? "block cursor-crosshair"
                    : "hidden pointer-events-none"
                }`}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />

              {!hasDrawnMask && (
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-md pointer-events-none">
                  {isInpaintMode ? "Draw mask area" : "Ready to Edit"}
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/60 hover:bg-red-600/90 text-white z-20 shadow-lg border border-white/20"
              >
                {currentImagePreview !== originalImagePreview ? (
                  <Undo2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-6 w-6" />
                )}
              </Button>

              {!isInpaintMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-black/60 hover:bg-gray-700 text-white z-20 border border-white/20"
                >
                  <Download className="h-5 w-5" />
                </Button>
              )}
            </div>
          )}

          {activeJobs.length > 0 && (
            <div className="w-full max-w-lg aspect-[4/3] rounded-lg border border-dashed border-gray-700 bg-gray-800/50 flex flex-col items-center justify-center animate-pulse">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-4" />
              <p className="text-gray-400 font-medium">Generating Magic...</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM CONTROLS */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-4xl mx-auto mb-3">
          {currentImagePreview && !isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsInpaintMode(!isInpaintMode)}
              className={`h-auto p-0 gap-2 text-xs hover:bg-transparent ${
                isInpaintMode
                  ? "text-cyan-400 font-bold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Paintbrush className="w-4 h-4" />
              <span>{isInpaintMode ? "Done" : "Inpaint"}</span>
            </Button>
          )}

          {isInpaintMode && (
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-gray-700 animate-in fade-in slide-in-from-left-2">
              <div className="flex bg-gray-800 rounded-md p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawingTool("brush")}
                  className={`h-6 w-6 rounded-sm ${
                    drawingTool === "brush"
                      ? "bg-gray-600 text-white"
                      : "text-gray-400"
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDrawingTool("eraser")}
                  className={`h-6 w-6 rounded-sm ${
                    drawingTool === "eraser"
                      ? "bg-gray-600 text-white"
                      : "text-gray-400"
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-gray-500 uppercase font-bold">
                  Size
                </Label>
                <Slider
                  value={[brushSize]}
                  onValueChange={(v) => setBrushSize(v[0])}
                  min={5}
                  max={100}
                  step={5}
                  className="no-sidebar-swipe w-20"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearMask}
                className="text-gray-400 hover:text-red-400 h-auto p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-center gap-2 bg-transparent border border-gray-700 min-h-[54px]">
          {!currentImagePreview && (
            <div className="relative pl-2">
              <input
                ref={mainInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleMainImageChange}
              />
              <Button
                variant="ghost"
                className="h-10 w-10 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50"
                onClick={() => mainInputRef.current?.click()}
              >
                <UploadCloud className="h-6 w-6" />
              </Button>
            </div>
          )}

          <div className="relative flex-grow">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={"Describe"}
              className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm md:text-base text-gray-200 placeholder-gray-500 py-3 min-h-[50px] max-h-[80px] leading-tight pr-12"
              rows={1}
              maxLength={1000}
              disabled={isLoading || !currentImagePreview}
            />
            {prompt.length > 0 && (
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-600">
                {prompt.length}/1000
              </span>
            )}
          </div>

          <div className="pr-2">
            <Button
              onClick={handleGenerate}
              disabled={
                isLoading ||
                !currentImagePreview ||
                (isInpaintMode && !hasDrawnMask) ||
                !prompt
              }
              className={`h-9 px-4 rounded-full font-medium transition-all text-xs flex items-center gap-1.5 ${
                isLoading ||
                !currentImagePreview ||
                (isInpaintMode && !hasDrawnMask) ||
                !prompt
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="whitespace-nowrap">15</span>{" "}
                  <Coins className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
    </div>
  );
};

export default ImageEditingPage;
