"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Download,
  UploadCloud,
  Images,
  XCircle,
  Wand2,
  RotateCw,
  Move3d,
  ZoomIn,
  Sparkles,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

// Auth & Client
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

fal.config({ proxyUrl: "/api/fal/proxy" });

// --- Types ---
interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  originalUrl?: string;
}

// --- Interactive 3D Cube & Sliders Component ---
const RotationController = ({
  pitch,
  setPitch,
  yaw,
  setYaw,
  zoom,
  setZoom,
}: {
  pitch: number;
  setPitch: (v: number) => void;
  yaw: number;
  setYaw: (v: number) => void;
  zoom: number;
  setZoom: (v: number) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startValues = useRef({ pitch: 0, yaw: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
    startValues.current = { pitch, yaw };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;

    // Sensitivity needs to be different for Pitch vs Yaw because scales differ
    // Yaw (Deg): -90 to 90
    // Pitch (Float): -1 to 1

    let newYaw = startValues.current.yaw + deltaX * 0.5;
    let newPitch = startValues.current.pitch + deltaY * 0.005; // Smaller step for decimal pitch

    // ✅ Clamp to Model Specs
    newYaw = Math.max(-90, Math.min(90, newYaw)); // Max 90 deg
    newPitch = Math.max(-1, Math.min(1, newPitch)); // Max 1 unit

    setYaw(Math.round(newYaw));
    setPitch(Number(newPitch.toFixed(2))); // Keep 2 decimal places for Tilt
  };

  const handleEnd = () => setIsDragging(false);

  // Mouse Events
  const onMouseDown = (e: React.MouseEvent) =>
    handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const onMouseUp = () => handleEnd();

  // Touch Events
  const onTouchStart = (e: React.TouchEvent) =>
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) =>
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchEnd = () => handleEnd();

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchend", onTouchEnd);
    } else {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onTouchEnd);
    }
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging]);

  return (
    <div className="w-full max-w-lg mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col items-center">
        {/* 3D Visualizer Area */}
        <div
          className="flex justify-center mb-6 perspective-1000 cursor-grab active:cursor-grabbing py-2"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          <div
            className="relative w-24 h-24 preserve-3d transition-transform duration-75 ease-linear will-change-transform"
            style={{
              // VISUAL LOGIC:
              // Pitch: Multiply by 90 to convert -1..1 range to degrees for CSS
              // Yaw: Already in degrees (-90..90)
              // Zoom: Divide by 10 to get sensible scale factor (0..10 -> 0..1 scale add)
              transform: `rotateX(${-pitch * 90}deg) rotateY(${yaw}deg) scale(${
                0.8 + (zoom / 10) * 0.4
              })`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Front Face */}
            <div
              className="absolute inset-0 bg-cyan-900/20 border-2 border-cyan-500/80 flex items-center justify-center text-lg font-bold text-cyan-400 backface-hidden select-none pointer-events-none shadow-[0_0_15px_rgba(6,182,212,0.2)]"
              style={{ transform: "translateZ(48px)" }}
            >
              Front
            </div>

            {/* Back Face */}
            <div
              className="absolute inset-0 bg-purple-900/20 border-2 border-purple-500/80 flex items-center justify-center text-lg font-bold text-purple-400 backface-hidden select-none pointer-events-none"
              style={{ transform: "rotateY(180deg) translateZ(48px)" }}
            >
              Back
            </div>

            {/* Sides */}
            <div
              className="absolute inset-0 bg-gray-800/40 border border-gray-600/50"
              style={{ transform: "rotateY(90deg) translateZ(48px)" }}
            ></div>
            <div
              className="absolute inset-0 bg-gray-800/40 border border-gray-600/50"
              style={{ transform: "rotateY(-90deg) translateZ(48px)" }}
            ></div>
            <div
              className="absolute inset-0 bg-gray-800/40 border border-gray-600/50"
              style={{ transform: "rotateX(90deg) translateZ(48px)" }}
            ></div>
            <div
              className="absolute inset-0 bg-gray-800/40 border border-gray-600/50"
              style={{ transform: "rotateX(-90deg) translateZ(48px)" }}
            ></div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6 text-gray-500 text-[10px] uppercase tracking-widest">
          <Move3d className="w-3 h-3" />
          <span>Drag Cube</span>
        </div>

        {/* Sliders Area - 1 Row, 3 Columns */}
        <div className="w-full px-2 select-none grid grid-cols-3 gap-4 md:gap-8">
          {/* 1. Rotation (Yaw) | Range: -90 to 90 */}
          <div className="space-y-2 text-center">
            <div className="flex flex-col items-center">
              <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Rotation
              </Label>
              <span className="text-cyan-400 font-mono font-bold text-xs">
                {yaw}°
              </span>
            </div>
            <Slider
              value={[yaw]}
              onValueChange={(v) => setYaw(v[0])}
              min={-90}
              max={90}
              step={1} // ✅ MODEL SPEC
              className="py-1 [&_.bg-primary]:bg-cyan-500 [&_[role=slider]]:border-cyan-500 [&_[role=slider]]:bg-black"
            />
          </div>

          {/* 2. Tilt (Pitch/Vertical) | Range: -1 to 1 */}
          <div className="space-y-2 text-center">
            <div className="flex flex-col items-center">
              <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Tilt
              </Label>
              <span className="text-cyan-400 font-mono font-bold text-xs">
                {pitch}
              </span>
            </div>
            <Slider
              value={[pitch]}
              onValueChange={(v) => setPitch(v[0])}
              min={-1}
              max={1}
              step={0.1} // ✅ MODEL SPEC
              className="py-1 [&_.bg-primary]:bg-cyan-500 [&_[role=slider]]:border-cyan-500 [&_[role=slider]]:bg-black"
            />
          </div>

          {/* 3. Zoom (Move Forward) | Range: 0 to 10 */}
          <div className="space-y-2 text-center">
            <div className="flex flex-col items-center">
              <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                Zoom
              </Label>
              <span className="text-cyan-400 font-mono font-bold text-xs">
                {zoom}
              </span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={(v) => setZoom(v[0])}
              min={0}
              max={10}
              step={0.5} // ✅ MODEL SPEC
              className="py-1 [&_.bg-primary]:bg-cyan-500 [&_[role=slider]]:border-cyan-500 [&_[role=slider]]:bg-black"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const ImageAngelChangerPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Angle & Zoom State (Matching Model Defaults)
  const [pitch, setPitch] = useState(0); // Default 0
  const [yaw, setYaw] = useState(0); // Default 0
  const [zoom, setZoom] = useState(0); // Default 0

  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Handlers ---

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) return toast.error("Max size 10MB");
      setSourceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      setActiveJobs([]);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    setSourceImageFile(null);
    setImagePreviewUrl(null);
    setActiveJobs([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPitch(0);
    setYaw(0);
    setZoom(0);
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!sourceImageFile) return toast.error("Please upload an image.");

    setIsLoading(true);
    toast.info(`Transforming... (Cost: 2 coins)`);

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
      const imageUrl = await fal.storage.upload(sourceImageFile);

      // ✅ Connecting to correct backend route with correct typed folder name
      const response = await fetch("/api/fal/chnage-angel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            image_url: imageUrl,
            pitch: pitch,
            yaw: yaw,
            zoom: zoom,
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

      setActiveJobs([
        {
          id: newJobId,
          status: "completed",
          urls: [generatedUrl],
          originalUrl: imagePreviewUrl || "",
        },
      ]);
      toast.success("Angle changed!");
    } catch (error: any) {
      console.error(error);
      setActiveJobs([{ id: newJobId, status: "failed", urls: [] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `angle-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* 1. SCROLLABLE AREA */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col items-center">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* Empty State */}
          {!imagePreviewUrl && activeJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-20">
              <Images className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Image Angle Changer
              </h1>
              <p className="text-gray-500 max-w-md">
                Upload an image below to rotate it in 3D space.
              </p>
            </div>
          )}

          {/* Uploaded Image (TOP) */}
          {imagePreviewUrl && activeJobs.length === 0 && (
            <div className="relative group w-fit h-auto rounded-lg shadow-2xl mt-4 border border-gray-800">
              <img
                src={imagePreviewUrl}
                alt="Source"
                className="max-h-[50vh] object-contain rounded-lg"
              />
              {/* Close Button: Permanently Visible */}
              <Button
                variant="destructive"
                size="icon"
                onClick={clearImage}
                className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-md"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
          )}

          {/* Results (TOP) */}
          {activeJobs.map((job) => (
            <div
              key={job.id}
              className="relative rounded-lg overflow-hidden shadow-2xl border border-gray-700 bg-gray-900 w-fit mt-4"
            >
              {job.status === "processing" ? (
                <div className="flex flex-col items-center justify-center h-[300px] w-[300px]">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-4" />
                  <p className="text-gray-400">Rotating...</p>
                </div>
              ) : job.status === "failed" ? (
                <div className="p-10 text-center text-red-400">
                  Failed to rotate.
                </div>
              ) : (
                job.urls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} className="max-h-[60vh] object-contain" />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(url)}
                      className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          ))}

          {/* ✅ CONTROLLER (BOTTOM of preview area) */}
          {imagePreviewUrl && (
            <RotationController
              pitch={pitch}
              setPitch={setPitch}
              yaw={yaw}
              setYaw={setYaw}
              zoom={zoom}
              setZoom={setZoom}
            />
          )}
        </div>
      </div>

      {/* 2. BOTTOM CONTROL BAR (Old Style) */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        <div className="max-w-4xl mx-auto">
          {/* Input Bar */}
          <div className="relative w-full p-1 rounded-xl flex items-start gap-2">
            {/* Upload Button */}
            <div className="flex-shrink-0 relative">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <Label
                onClick={() => fileInputRef.current?.click()}
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

            {/* Prompt Box & Generate Button Container */}
            <div className="flex-grow relative flex items-center">
              <Textarea
                disabled={true}
                value="Upload"
                className="flex-grow bg-transparent border border-gray-700 focus:border-cyan-500 focus:ring-0 rounded-lg resize-none text-sm md:text-base text-gray-400 placeholder-gray-500 pl-3 pr-24 md:pr-32 py-3 min-h-[50px] max-h-[56px] leading-tight cursor-default"
                rows={1}
              />

              {/* Generate Button (Inside Prompt Box) */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !imagePreviewUrl}
                  className={`h-9 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                    isLoading || !imagePreviewUrl
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-br from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-600"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden md:inline font-semibold">
                        Generate (2 Coins)
                      </span>
                      <span className="md:hidden font-semibold">Go</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
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

export default ImageAngelChangerPage;
