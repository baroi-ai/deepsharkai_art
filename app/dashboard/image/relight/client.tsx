"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Coins,
  Lightbulb,
  Image as ImageIcon,
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

type LightingMode = "manual" | "reference";

// --- Interactive Director Light Controls ---
const DirectorLightController = ({
  lightingMode,
  setLightingMode,
  lightColor,
  setLightColor,
  intensity,
  setIntensity,
  ambientDim,
  setAmbientDim,
  lightX,
  setLightX,
  lightY,
  setLightY,
  imagePreviewUrl,
  referencePreviewUrl,
  onReferenceUpload,
  onClearReference,
  refInputRef,
}: {
  lightingMode: LightingMode;
  setLightingMode: (m: LightingMode) => void;
  lightColor: string;
  setLightColor: (v: string) => void;
  intensity: number;
  setIntensity: (v: number) => void;
  ambientDim: number;
  setAmbientDim: (v: number) => void;
  lightX: number;
  setLightX: (v: number) => void;
  lightY: number;
  setLightY: (v: number) => void;
  imagePreviewUrl?: string | null;
  referencePreviewUrl: string | null;
  onReferenceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearReference: () => void;
  refInputRef: React.RefObject<HTMLInputElement | null>;
}) => {
  const sphereRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- Math for Dragging on a Rectangular Image Aspect Ratio ---
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !sphereRef.current) return;

    const rect = sphereRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;

    const maxX = rect.width / 2;
    const maxY = rect.height / 2;

    dx = Math.max(-maxX, Math.min(maxX, dx));
    dy = Math.max(-maxY, Math.min(maxY, dy));

    setLightX(Math.round((dx / maxX) * 100));
    setLightY(Math.round((dy / maxY) * 100));
  };

  return (
    <div className="w-full max-w-lg mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 bg-gray-900/40 p-5 rounded-xl border border-gray-800">
      <div className="flex flex-col items-center">
        <div className="no-sidebar-swipe flex items-center justify-center gap-2 mb-4 text-gray-500 text-[10px] uppercase tracking-widest">
          <Lightbulb className="w-3 h-3 text-cyan-500" />
          <span>Lighting Source</span>
        </div>

        {/* --- Mode Toggle (Manual vs Reference) --- */}
        <div className="flex bg-black/50 p-1 rounded-lg mb-6 border border-gray-800 w-full max-w-sm">
          <button
            onClick={() => setLightingMode("manual")}
            className={`flex-1 text-xs py-2 rounded-md transition-all font-semibold ${
              lightingMode === "manual"
                ? "bg-gray-800 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Manual Setup
          </button>
          <button
            onClick={() => setLightingMode("reference")}
            className={`flex-1 text-xs py-2 rounded-md transition-all font-semibold ${
              lightingMode === "reference"
                ? "bg-gray-800 text-cyan-400 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Reference Image
          </button>
        </div>

        {/* ========================================= */}
        {/* MANUAL LIGHTING UI              */}
        {/* ========================================= */}
        {lightingMode === "manual" && (
          <>
            <div className="w-full flex flex-col items-center mb-6 animate-in fade-in zoom-in-95 duration-200">
              <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-4">
                Light Direction
              </Label>
              <div
                ref={sphereRef}
                onPointerDown={(e: React.PointerEvent<HTMLDivElement>) => {
                  setIsDragging(true);
                  handlePointerMove(e);
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={(e: React.PointerEvent<HTMLDivElement>) => {
                  setIsDragging(false);
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                className="relative w-fit max-w-xs border-2 border-gray-600 bg-black cursor-crosshair touch-none shadow-inner group flex items-center justify-center overflow-hidden rounded-md"
              >
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="w-full h-auto object-contain opacity-50 select-none pointer-events-none block"
                  />
                )}
                <div className="absolute w-full h-px bg-cyan-500/30 pointer-events-none" />
                <div className="absolute h-full w-px bg-cyan-500/30 pointer-events-none" />
                <div
                  className="absolute w-6 h-6 rounded-full pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                  style={{
                    backgroundColor: lightColor,
                    left: `${(lightX + 100) / 2}%`,
                    top: `${(lightY + 100) / 2}%`,
                    boxShadow: `0 0 20px ${lightColor}, 0 0 40px ${lightColor}80`,
                    scale: isDragging ? 1.2 : 1,
                  }}
                />
              </div>
            </div>

            <div className="no-sidebar-swipe w-full px-2 select-none grid grid-cols-2 gap-4 md:gap-8 bg-black/30 p-4 rounded-lg border border-gray-800 mb-6 animate-in fade-in">
              <div className="space-y-2 text-center">
                <div className="flex flex-col items-center">
                  <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    Horizontal (X)
                  </Label>
                  <span className="text-cyan-400 font-mono font-bold text-xs">
                    {lightX}
                  </span>
                </div>
                <Slider
                  value={[lightX]}
                  onValueChange={(v: number[]) => setLightX(v[0])}
                  min={-100}
                  max={100}
                  step={1}
                  className="py-1 **:[[role=slider]]:border-cyan-500 **:[[role=slider]]:bg-black"
                />
              </div>
              <div className="space-y-2 text-center">
                <div className="flex flex-col items-center">
                  <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    Vertical (Y)
                  </Label>
                  <span className="text-cyan-400 font-mono font-bold text-xs">
                    {lightY}
                  </span>
                </div>
                <Slider
                  value={[lightY]}
                  onValueChange={(v: number[]) => setLightY(v[0])}
                  min={-100}
                  max={100}
                  step={1}
                  className="py-1 **:[[role=slider]]:border-cyan-500 **:[[role=slider]]:bg-black"
                />
              </div>
            </div>

            <div className="no-sidebar-swipe w-full px-2 select-none grid grid-cols-3 gap-4 md:gap-8 bg-black/30 p-4 rounded-lg border border-gray-800 animate-in fade-in">
              <div className="space-y-2 text-center">
                <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  Color
                </Label>
                <div className="flex justify-center mt-2">
                  <Input
                    type="color"
                    value={lightColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLightColor(e.target.value)
                    }
                    className="h-8 w-16 p-0 border-gray-700 bg-black cursor-pointer rounded"
                  />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <div className="flex flex-col items-center">
                  <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    Brightness
                  </Label>
                  <span className="text-cyan-400 font-mono font-bold text-xs">
                    {intensity}%
                  </span>
                </div>
                <Slider
                  value={[intensity]}
                  onValueChange={(v: number[]) => setIntensity(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="py-1 **:[[role=slider]]:border-cyan-500 **:[[role=slider]]:bg-black"
                />
              </div>
              <div className="space-y-2 text-center">
                <div className="flex flex-col items-center">
                  <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    Dim BG
                  </Label>
                  <span className="text-cyan-400 font-mono font-bold text-xs">
                    {ambientDim}%
                  </span>
                </div>
                <Slider
                  value={[ambientDim]}
                  onValueChange={(v: number[]) => setAmbientDim(v[0])}
                  min={0}
                  max={100}
                  step={1}
                  className="py-1 **:[[role=slider]]:border-cyan-500 **:[[role=slider]]:bg-black"
                />
              </div>
            </div>
          </>
        )}

        {/* ========================================= */}
        {/* REFERENCE IMAGE UI                */}
        {/* ========================================= */}
        {lightingMode === "reference" && (
          <div className="w-full flex flex-col items-center mb-2 animate-in fade-in zoom-in-95 duration-200">
            <Label className="text-gray-400 font-bold uppercase tracking-wider text-[10px] mb-4 text-center">
              Upload Lighting Reference
            </Label>

            <Input
              ref={refInputRef}
              type="file"
              accept="image/*"
              onChange={onReferenceUpload}
              className="hidden"
            />

            {!referencePreviewUrl ? (
              <div
                onClick={() => refInputRef.current?.click()}
                className="w-full max-w-sm h-48 border-2 border-dashed border-gray-700 hover:border-cyan-500 bg-black/40 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors group"
              >
                <div className="bg-gray-800 p-4 rounded-full group-hover:bg-cyan-500/20 transition-colors mb-3">
                  <ImageIcon className="w-6 h-6 text-gray-400 group-hover:text-cyan-400" />
                </div>
                <p className="text-sm text-gray-400 group-hover:text-cyan-300 font-medium">
                  Click to upload reference
                </p>
                <p className="text-[10px] text-gray-600 mt-1">
                  Extracts lighting and colors from this image
                </p>
              </div>
            ) : (
              <div className="relative w-fit max-w-sm rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                <img
                  src={referencePreviewUrl}
                  alt="Reference Lighting"
                  className="w-full max-h-48 object-cover"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end justify-center pb-3">
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Active Lighting Profile
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearReference();
                  }}
                  className="absolute top-2 right-2 rounded-full h-7 w-7 shadow-md"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

const ImageRelightPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // General State
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lighting Mode State
  const [lightingMode, setLightingMode] = useState<LightingMode>("manual");

  // Reference Image State
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(
    null,
  );
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(
    null,
  );
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Manual Director Light State
  const [lightColor, setLightColor] = useState("#06b6d4");
  const [intensity, setIntensity] = useState(80);
  const [ambientDim, setAmbientDim] = useState(40);
  const [lightX, setLightX] = useState(50);
  const [lightY, setLightY] = useState(-20);

  // Job State
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

  const handleReferenceFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) return toast.error("Max size 10MB");
      setReferenceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReferencePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    setSourceImageFile(null);
    setImagePreviewUrl(null);
    setActiveJobs([]);
    clearReference(); // Clear reference when main image is cleared
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearReference = () => {
    setReferenceImageFile(null);
    setReferencePreviewUrl(null);
    if (refFileInputRef.current) refFileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!sourceImageFile) return toast.error("Please upload a main image.");
    if (lightingMode === "reference" && !referenceImageFile)
      return toast.error(
        "Please upload a reference image, or switch to Manual Setup.",
      );

    setIsLoading(true);
    toast.info(`Generating Relight... (Cost: 10 coins)`);

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
      // 1. Upload Main Image
      const imageUrl = await fal.storage.upload(sourceImageFile);

      // 2. Prepare Payload based on the active mode
      let payloadInput: any = { image_url: imageUrl };

      if (lightingMode === "reference" && referenceImageFile) {
        // Reference Mode Payload
        const refUrl = await fal.storage.upload(referenceImageFile);
        payloadInput = {
          ...payloadInput,
          mode: "reference",
          reference_image_url: refUrl,
          // Add any specific parameters your IC-Light backend needs for reference mode
        };
      } else {
        // Manual Mode Payload
        payloadInput = {
          ...payloadInput,
          mode: "manual",
          light_color: lightColor,
          intensity: intensity,
          ambient_dim: ambientDim,
          light_x: lightX,
          light_y: lightY,
        };
      }

      // 3. Call your API
      const response = await fetch("/api/fal/relight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: payloadInput }),
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
      toast.success("Lighting applied successfully!");
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
      link.download = `deepshark-relight-${Date.now()}.png`;
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
      <div className="grow overflow-y-auto p-4 md:p-6 flex flex-col items-center">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* Empty State */}
          {!imagePreviewUrl && activeJobs.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-20">
              <Lightbulb className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Image Relight Studio
              </h1>
              <p className="text-gray-500 max-w-md">
                Upload an image below to apply custom studio or reference
                lighting.
              </p>
            </div>
          )}

          {/* Uploaded Image */}
          {imagePreviewUrl && activeJobs.length === 0 && (
            <div className="relative group w-fit h-auto rounded-lg shadow-2xl mt-4 border border-gray-800">
              <img
                src={imagePreviewUrl}
                alt="Source"
                className="max-h-[50vh] object-contain rounded-lg"
              />
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

          {/* Results */}
          {activeJobs.map((job) => (
            <div
              key={job.id}
              className="relative rounded-lg overflow-hidden shadow-2xl border border-gray-700 bg-gray-900 w-fit mt-4"
            >
              {job.status === "processing" ? (
                <div className="flex flex-col items-center justify-center h-75 w-75">
                  <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-4" />
                  <p className="text-gray-400">Rendering lighting...</p>
                </div>
              ) : job.status === "failed" ? (
                <div className="p-10 text-center text-red-400">
                  Failed to relight image.
                </div>
              ) : (
                job.urls.map((url, i) => (
                  <div key={i} className="relative group">
                    <Image
                      src={url}
                      alt="Relit"
                      width={800}
                      height={600}
                      className="max-h-[60vh] object-contain w-auto h-auto"
                      unoptimized={true}
                    />
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

          {/* LIGHT CONTROLLER PANEL */}
          {imagePreviewUrl && (
            <DirectorLightController
              lightingMode={lightingMode}
              setLightingMode={setLightingMode}
              lightColor={lightColor}
              setLightColor={setLightColor}
              intensity={intensity}
              setIntensity={setIntensity}
              ambientDim={ambientDim}
              setAmbientDim={setAmbientDim}
              lightX={lightX}
              setLightX={setLightX}
              lightY={lightY}
              setLightY={setLightY}
              imagePreviewUrl={imagePreviewUrl}
              referencePreviewUrl={referencePreviewUrl}
              onReferenceUpload={handleReferenceFileChange}
              onClearReference={clearReference}
              refInputRef={refFileInputRef}
            />
          )}
        </div>
      </div>

      {/* 2. BOTTOM CONTROL BAR */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="relative w-full p-1 rounded-xl flex items-start gap-2">
            {/* Upload Button */}
            <div className="shrink-0 relative">
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

            {/* Prompt Box & Generate Button */}
            <div className="grow relative flex items-center">
              <Textarea
                disabled={true}
                value="Upload main image"
                className="grow bg-transparent border border-gray-700 focus:border-cyan-500 focus:ring-0 rounded-lg resize-none text-sm md:text-base text-gray-400 placeholder-gray-500 pl-3 pr-24 md:pr-32 py-3 min-h-12.5 max-h-14 leading-tight cursor-default"
                rows={1}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                <Button
                  onClick={handleGenerate}
                  disabled={
                    isLoading ||
                    !imagePreviewUrl ||
                    (lightingMode === "reference" && !referencePreviewUrl)
                  }
                  className={`h-9 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                    isLoading ||
                    !imagePreviewUrl ||
                    (lightingMode === "reference" && !referencePreviewUrl)
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-linear-to-br from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-600"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span className="whitespace-nowrap">10</span>
                      <Coins className="w-3.5 h-3.5" />
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

export default ImageRelightPage;
