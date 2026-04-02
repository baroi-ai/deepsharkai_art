"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Coins,
  Loader2,
  Download,
  UploadCloud,
  Layers,
  XCircle,
  Paintbrush,
  Eraser,
  Trash2,
  Check,
  X,
  Wand2,
  RotateCcw,
  Pencil,
  Combine,
  ImageIcon,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

fal.config({ proxyUrl: "/api/fal/proxy" });

// ─── Config ───────────────────────────────────────────────────────────────────
const layerOptions = Array.from({ length: 10 }, (_, i) => ({
  id: (i + 1).toString(),
  name: `${i + 1} Layer${i > 0 ? "s" : ""}`,
  value: i + 1,
}));

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  originalUrl?: string;
}

// ─── Layer Editor Modal ───────────────────────────────────────────────────────
interface LayerEditorProps {
  layerSrc: string;
  layerIndex: number;
  jobId: string;
  onClose: () => void;
  onApply: (newSrc: string, layerIndex: number) => void;
}

const LayerEditor: React.FC<LayerEditorProps> = ({
  layerSrc,
  layerIndex,
  onClose,
  onApply,
}) => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [drawingTool, setDrawingTool] = useState<"brush" | "eraser">("brush");
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnMask, setHasDrawnMask] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultSrc, setResultSrc] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // ── Key fix: size and position canvas EXACTLY over the rendered <img> ──
  const syncCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const imgRect = img.getBoundingClientRect();
    const parentRect = canvas.parentElement!.getBoundingClientRect();

    // Position canvas over image (not the full container)
    canvas.style.left = `${imgRect.left - parentRect.left}px`;
    canvas.style.top = `${imgRect.top - parentRect.top}px`;
    canvas.style.width = `${imgRect.width}px`;
    canvas.style.height = `${imgRect.height}px`;

    // Internal resolution = rendered pixel size → 1:1 mapping, no offset
    if (
      canvas.width !== Math.round(imgRect.width) ||
      canvas.height !== Math.round(imgRect.height)
    ) {
      canvas.width = Math.round(imgRect.width);
      canvas.height = Math.round(imgRect.height);
      // Re-apply context settings after resize
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctxRef.current = ctx;
      }
    }
    if (ctxRef.current) {
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.globalCompositeOperation =
        drawingTool === "eraser" ? "destination-out" : "source-over";
      ctxRef.current.strokeStyle =
        drawingTool === "brush" ? "rgba(239,68,68,0.6)" : "rgba(0,0,0,1)";
    }
  }, [brushSize, drawingTool]);

  // Sync when image loads and on window resize
  const handleImgLoad = () => syncCanvas();

  useEffect(() => {
    window.addEventListener("resize", syncCanvas);
    return () => window.removeEventListener("resize", syncCanvas);
  }, [syncCanvas]);

  // Update brush settings without full reinit
  useEffect(() => {
    if (!ctxRef.current) return;
    ctxRef.current.lineWidth = brushSize;
    ctxRef.current.globalCompositeOperation =
      drawingTool === "eraser" ? "destination-out" : "source-over";
    ctxRef.current.strokeStyle =
      drawingTool === "brush" ? "rgba(239,68,68,0.6)" : "rgba(0,0,0,1)";
  }, [drawingTool, brushSize]);

  // ── Coords relative to canvas internal resolution ──
  const getCoords = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    // Scale from CSS px → internal canvas px
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * sx,
      y: (clientY - rect.top) * sy,
    };
  };

  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!ctxRef.current) return;
    e.preventDefault();
    setIsDrawing(true);
    setHasDrawnMask(true);
    const { x, y } = getCoords(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };

  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing || !ctxRef.current) return;
    e.preventDefault();
    const { x, y } = getCoords(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
  };

  const stopDrawing = () => {
    ctxRef.current?.closePath();
    setIsDrawing(false);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawnMask(false);
    }
  };

  // Build white-on-black mask at natural image resolution
  const getMaskDataURL = async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !hasDrawnMask) return null;

    const nw = img.naturalWidth || img.clientWidth;
    const nh = img.naturalHeight || img.clientHeight;
    const tmp = document.createElement("canvas");
    tmp.width = nw;
    tmp.height = nh;
    const tCtx = tmp.getContext("2d")!;

    // Scale painted mask to natural size
    tCtx.drawImage(canvas, 0, 0, nw, nh);
    tCtx.globalCompositeOperation = "source-in";
    tCtx.fillStyle = "#FFF";
    tCtx.fillRect(0, 0, nw, nh);
    tCtx.globalCompositeOperation = "destination-over";
    tCtx.fillStyle = "#000";
    tCtx.fillRect(0, 0, nw, nh);

    return tmp.toDataURL("image/png");
  };

  const blobToDataURL = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleEdit = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!prompt.trim())
      return toast.error("Enter a prompt to edit this layer.");
    setIsLoading(true);
    toast.info("Editing layer… (Cost: 10 coins)");
    try {
      // Convert layer image → base64 (avoids fal.storage proxy issues)
      const imageDataUrl = layerSrc.startsWith("data:")
        ? layerSrc
        : await blobToDataURL(await (await fetch(layerSrc)).blob());

      const maskDataUrl = hasDrawnMask ? await getMaskDataURL() : null;

      const response = await fetch("/api/fal/inpainting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            prompt,
            image_url: imageDataUrl,
            mask_url: maskDataUrl,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(
          response.status === 402
            ? "Insufficient coins!"
            : data.error || "Edit failed",
        );
        throw new Error(data.error);
      }

      setResultSrc(data.imageUrl);
      clearMask();
      toast.success("Layer edited!");
    } catch (err: any) {
      console.error("Layer edit error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!resultSrc) return;
    onApply(resultSrc, layerIndex);
    onClose();
    toast.success(`Layer ${layerIndex + 1} updated!`);
  };

  const handleDiscard = () => {
    setResultSrc(null);
    clearMask();
    setPrompt("");
  };

  const displaySrc = resultSrc || layerSrc;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-3xl bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-200"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: "90vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                <Pencil className="w-3 h-3 text-teal-400" />
              </div>
              <span className="text-sm font-semibold text-gray-200">
                Edit Layer {layerIndex + 1}
              </span>
              {resultSrc && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Edited
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-h-0">
            {/*
              Container uses position:relative so canvas can be
              absolutely positioned exactly over the <img>.
            */}
            <div
              className="relative rounded-xl overflow-hidden border border-gray-800 bg-black/40 flex items-center justify-center"
              style={{ minHeight: 220, maxHeight: "45vh" }}
            >
              {/* Checkerboard */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    "repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)",
                  backgroundSize: "16px 16px",
                }}
              />

              {/* Image — canvas will be pinned exactly over this element */}
              <img
                ref={imageRef}
                src={displaySrc}
                alt={`Layer ${layerIndex + 1}`}
                crossOrigin="anonymous"
                onLoad={handleImgLoad}
                className="relative z-10 select-none block"
                style={{
                  maxHeight: "45vh",
                  maxWidth: "100%",
                  width: "auto",
                  objectFit: "contain",
                }}
                draggable={false}
              />

              {/* Canvas — absolutely positioned by syncCanvas() over the image */}
              {!resultSrc && (
                <canvas
                  ref={canvasRef}
                  className="absolute z-20 touch-none"
                  style={{
                    cursor: drawingTool === "brush" ? "crosshair" : "cell",
                  }}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              )}

              {/* Hint */}
              {!hasDrawnMask && !resultSrc && (
                <div className="absolute bottom-3 left-3 z-30 bg-black/60 backdrop-blur text-gray-400 text-[10px] px-2.5 py-1.5 rounded-lg border border-gray-700 pointer-events-none">
                  Paint over the area to edit · leave blank to edit entire layer
                </div>
              )}

              {/* Loading overlay */}
              {isLoading && (
                <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-xl">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  <p className="text-white text-xs font-medium animate-pulse">
                    Editing layer…
                  </p>
                </div>
              )}
            </div>

            {/* Tools row */}
            {!resultSrc && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex bg-gray-900 rounded-lg p-0.5 border border-gray-800">
                  <button
                    onClick={() => setDrawingTool("brush")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      drawingTool === "brush"
                        ? "bg-red-500/20 text-red-300 border border-red-500/30"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Paintbrush className="w-3.5 h-3.5" /> Brush
                  </button>
                  <button
                    onClick={() => setDrawingTool("eraser")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      drawingTool === "eraser"
                        ? "bg-gray-700 text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Eraser className="w-3.5 h-3.5" /> Eraser
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-1 min-w-[120px] max-w-[200px]">
                  <span className="text-[10px] text-gray-500 uppercase font-bold w-8 shrink-0">
                    Size
                  </span>
                  <Slider
                    value={[brushSize]}
                    onValueChange={([v]) => setBrushSize(v)}
                    min={5}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-[10px] font-mono text-cyan-400/80 w-6 text-right shrink-0">
                    {brushSize}
                  </span>
                </div>

                {hasDrawnMask && (
                  <button
                    onClick={clearMask}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear
                  </button>
                )}
              </div>
            )}

            {/* Result actions */}
            {resultSrc && (
              <div className="flex items-center gap-2 justify-center">
                <button
                  onClick={handleDiscard}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-gray-400 border border-gray-700 hover:bg-gray-800 hover:text-gray-200 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Try again
                </button>
                <button
                  onClick={handleApply}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-teal-500/90 hover:bg-teal-400 text-white shadow-lg shadow-teal-500/20 transition-all"
                >
                  <Check className="w-3.5 h-3.5" /> Apply to layer
                </button>
              </div>
            )}
          </div>

          {/* Prompt bar */}
          {!resultSrc && (
            <div className="px-4 py-3 border-t border-gray-800 shrink-0">
              <div className="flex items-center gap-2 bg-gray-900/60 border border-gray-800 rounded-xl px-3 py-2">
                <Wand2 className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoading) handleEdit();
                  }}
                  placeholder="Describe the edit for this layer…"
                  className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleEdit}
                  disabled={isLoading || !prompt.trim()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    isLoading || !prompt.trim()
                      ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                      : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span>10</span>
                      <Coins className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5 px-1">
                {hasDrawnMask
                  ? "Painted area will be inpainted · rest stays intact"
                  : "No mask painted — entire layer will be edited"}
              </p>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
    </>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const ImageDecomposerPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [numLayers, setNumLayers] = useState("4");

  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [editingLayer, setEditingLayer] = useState<{
    src: string;
    index: number;
    jobId: string;
  } | null>(null);

  const calculatedCost = useMemo(() => Number(numLayers) * 5, [numLayers]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size cannot exceed 10MB.");
        return;
      }
      setSourceImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setActiveJobs([]);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    setSourceImageFile(null);
    setImagePreviewUrl(null);
    setActiveJobs([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!sourceImageFile) {
      toast.error("Please upload an image to Extract Layers.");
      return;
    }
    setIsLoading(true);
    toast.info(`Extracting layers... (Cost: ${calculatedCost} coins)`);
    const newJobId = `job-${Date.now()}`;
    setActiveJobs([
      {
        id: newJobId,
        status: "processing",
        urls: [],
        originalUrl: imagePreviewUrl || "",
      },
    ]);
    try {
      // ── Use base64 data URL directly — avoids fal.storage.upload hanging ──
      const imageDataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(sourceImageFile);
      });

      const response = await fetch("/api/fal/layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            image_url: imageDataUrl,
            num_layers: Number(numLayers),
            cost: calculatedCost,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(
          response.status === 402
            ? "Insufficient coins! Please recharge."
            : data.error || "Extraction failed",
        );
        throw new Error(data.error);
      }
      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === newJobId
            ? { ...job, status: "completed", urls: data.layers }
            : job,
        ),
      );
      toast.success("Extraction complete!");
    } catch (error: any) {
      console.error("Failed:", error);
      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === newJobId ? { ...job, status: "failed" } : job,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, fileName: string) => {
    setDownloadingIndex(fileName);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed.");
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleLayerApply = (newSrc: string, layerIndex: number) => {
    setActiveJobs((prev) =>
      prev.map((job) => {
        if (job.status !== "completed") return job;
        const newUrls = [...job.urls];
        newUrls[layerIndex] = newSrc;
        return { ...job, urls: newUrls };
      }),
    );
  };

  const [recomposeResult, setRecomposeResult] = useState<string | null>(null);
  const [isRecomposing, setIsRecomposing] = useState(false);

  const handleRecompose = async (urls: string[]) => {
    if (urls.length === 0) return;
    setIsRecomposing(true);
    setRecomposeResult(null);
    toast.info("Composing layers…");
    try {
      // Load all layer images
      const images = await Promise.all(
        urls.map(
          (src) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new window.Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = src;
            }),
        ),
      );

      // Canvas size = first layer's natural size
      const w = images[0].naturalWidth;
      const h = images[0].naturalHeight;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // Draw each layer in order (bottom → top)
      for (const img of images) {
        ctx.drawImage(img, 0, 0, w, h);
      }

      const dataUrl = canvas.toDataURL("image/png");
      setRecomposeResult(dataUrl);
      toast.success("Layers composed!");
    } catch (err) {
      console.error("Recompose error:", err);
      toast.error("Failed to compose layers.");
    } finally {
      setIsRecomposing(false);
    }
  };

  const handleRecomposeDownload = () => {
    if (!recomposeResult) return;
    const link = document.createElement("a");
    link.href = recomposeResult;
    link.download = `recomposed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const isGenerateDisabled = useMemo(
    () => isLoading || !sourceImageFile,
    [isLoading, sourceImageFile],
  );

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col pt-10 min-h-[60vh]">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* Empty state */}
          {activeJobs.length === 0 && !imagePreviewUrl && (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-600 mt-20">
              <Layers className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                AI Image Layer Extractor
              </h1>
              <p className="text-gray-500 max-w-md">
                Upload an image to split it into transparent layers — then edit
                each layer with AI.
              </p>
            </div>
          )}

          {/* Preview before extract */}
          {activeJobs.length === 0 && imagePreviewUrl && (
            <div className="animate-in fade-in duration-500 relative group w-fit h-auto mb-10">
              <img
                src={imagePreviewUrl}
                alt="Source"
                className="max-h-[60vh] max-w-full w-auto object-contain rounded-lg shadow-2xl"
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

          {/* Results */}
          {activeJobs.length > 0 && (
            <div className="w-full flex justify-center mb-24">
              {activeJobs.flatMap((job) => {
                if (job.status === "processing") {
                  return (
                    <div
                      key={job.id}
                      className="w-full max-w-lg aspect-[4/3] rounded-lg border border-dashed border-gray-700 bg-gray-800/50 flex flex-col items-center justify-center"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-500/70 mb-4" />
                      <p className="text-gray-400 text-sm animate-pulse">
                        Analyzing layers...
                      </p>
                    </div>
                  );
                }

                if (job.status === "completed") {
                  return (
                    <div key={job.id} className="flex flex-col gap-4 w-full">
                      {/* ── Recompose bar ── */}
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-gray-500">
                          {job.urls.length} layer
                          {job.urls.length !== 1 ? "s" : ""} extracted
                        </span>
                        <button
                          onClick={() => handleRecompose(job.urls)}
                          disabled={isRecomposing}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                            isRecomposing
                              ? "bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed"
                              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 active:scale-95"
                          }`}
                        >
                          {isRecomposing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Combine className="w-3.5 h-3.5" />
                          )}
                          {isRecomposing ? "Composing…" : "Recompose All"}
                        </button>
                      </div>

                      {/* ── Recompose result ── */}
                      {recomposeResult && (
                        <div className="relative rounded-xl overflow-hidden border border-cyan-500/30 bg-black/40 shadow-lg shadow-cyan-500/10 animate-in fade-in zoom-in-95 duration-200">
                          <img
                            src={recomposeResult}
                            alt="Recomposed"
                            className="w-full max-h-[50vh] object-contain block"
                          />
                          {/* overlay actions */}
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur px-2.5 py-1 rounded-md border border-cyan-500/30 text-[10px] font-semibold text-cyan-400 pointer-events-none">
                            Recomposed
                          </div>
                          <div className="absolute top-3 right-3 flex items-center gap-2">
                            <button
                              onClick={handleRecomposeDownload}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/90 backdrop-blur border border-gray-700 text-xs font-semibold text-gray-200 hover:border-cyan-500/50 hover:text-cyan-400 active:scale-95 transition-all shadow-lg"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </button>
                            <button
                              onClick={() => setRecomposeResult(null)}
                              className="p-1.5 rounded-lg bg-gray-900/90 backdrop-blur border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── Layer grid ── */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* Original */}
                        <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-800/50 aspect-video">
                          <img
                            src={job.originalUrl}
                            className="w-full h-full object-contain p-2"
                            alt="Original"
                          />
                          <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 text-[10px] rounded text-white">
                            Original
                          </div>
                        </div>

                        {/* Extracted layers */}
                        {job.urls.map((imgSrc, index) => {
                          const fileKey = `${job.id}-layer-${index}`;
                          const isDownloading = downloadingIndex === fileKey;
                          return (
                            <div
                              key={`${job.id}-${index}`}
                              className="relative rounded-lg overflow-hidden border border-gray-700 aspect-video"
                            >
                              {/* Checkerboard bg */}
                              <div
                                className="absolute inset-0"
                                style={{
                                  backgroundImage:
                                    "repeating-conic-gradient(#1a1a2e 0% 25%, #16213e 0% 50%)",
                                  backgroundSize: "12px 12px",
                                }}
                              />

                              {/* Layer image */}
                              <div className="absolute inset-0 p-2 z-10">
                                <Image
                                  src={imgSrc}
                                  alt={`Layer ${index + 1}`}
                                  fill
                                  className="object-contain"
                                  unoptimized={true}
                                />
                              </div>

                              {/* Layer badge */}
                              <div className="absolute top-2 left-2 bg-teal-900/80 px-2 py-1 text-[10px] rounded text-teal-200 border border-teal-700/50 z-20 pointer-events-none">
                                Layer {index + 1}
                              </div>

                              {/* ── Action bar: ALWAYS VISIBLE (works on mobile too) ── */}
                              <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-1 px-2 py-1.5 bg-gradient-to-t from-black/75 via-black/40 to-transparent">
                                <button
                                  onClick={() =>
                                    setEditingLayer({
                                      src: imgSrc,
                                      index,
                                      jobId: job.id,
                                    })
                                  }
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur border border-white/10 text-[10px] font-semibold text-gray-200 hover:border-cyan-500/60 hover:text-cyan-400 active:scale-95 transition-all"
                                >
                                  <Wand2 className="w-3 h-3" /> Edit
                                </button>

                                <button
                                  onClick={() =>
                                    handleDownload(imgSrc, `${fileKey}.png`)
                                  }
                                  disabled={isDownloading}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur border border-white/10 text-[10px] font-semibold text-gray-200 hover:border-white/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                  {isDownloading ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Download className="w-3 h-3" />
                                  )}
                                  {isDownloading ? "..." : "Save"}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                if (job.status === "failed") {
                  return (
                    <div
                      key={job.id}
                      className="w-full max-w-lg aspect-video rounded-lg border border-dashed border-red-500/50 bg-red-900/20 flex flex-col items-center justify-center text-red-400 p-4 text-center"
                    >
                      <XCircle className="h-8 w-8 mb-2" />
                      <span className="text-xs font-medium">
                        Extraction Failed. Please try again.
                      </span>
                    </div>
                  );
                }
                return [];
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input Bar */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-4xl mx-auto mb-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <Select
              value={numLayers}
              onValueChange={setNumLayers}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-transparent border-none text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto text-xs pr-2">
                <SelectValue placeholder="Layers" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="top"
                className="bg-slate-950 border-white/10 text-gray-300"
              >
                {layerOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    <div className="flex items-center gap-2">
                      <Layers className="w-3 h-3 text-gray-400" />
                      <span>{opt.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-3">
          <div className="flex-shrink-0 relative">
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
                className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${imagePreviewUrl ? "border-cyan-500 text-cyan-500" : ""}`,
              })}
            >
              <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
            </Label>
          </div>

          <div className="flex-grow relative flex items-center">
            <Textarea
              id="prompt"
              placeholder="Upload an image to extract layers"
              value={
                imagePreviewUrl
                  ? "Image ready — click Extract to decompose into layers"
                  : ""
              }
              readOnly
              rows={1}
              className="flex-grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-[54px] cursor-not-allowed select-none focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              <Button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className={`h-10 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                  isGenerateDisabled
                    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-cyan-500/20"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs font-semibold whitespace-nowrap">
                      {calculatedCost}
                    </span>
                    <Coins className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {editingLayer && (
        <LayerEditor
          layerSrc={editingLayer.src}
          layerIndex={editingLayer.index}
          jobId={editingLayer.jobId}
          onClose={() => setEditingLayer(null)}
          onApply={handleLayerApply}
        />
      )}

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
    </div>
  );
};

export default ImageDecomposerPage;
