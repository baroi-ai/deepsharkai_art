"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Coins,
  Loader2,
  Download,
  UploadCloud,
  ScanFace,
  XCircle,
  MoveHorizontal,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

fal.config({
  proxyUrl: "/api/fal/proxy",
});

// --- Helper Component: Compare Slider ---
const CompareSlider = ({
  original,
  enhanced,
}: {
  original: string;
  enhanced: string;
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - left) / width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, pos)));
  };

  const isRemoteOriginal = original.startsWith("http");

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-auto h-auto select-none group cursor-col-resize rounded-lg overflow-hidden border border-gray-700 shadow-2xl bg-gray-900"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      <img
        src={original}
        alt="Reference"
        className="block max-h-[60vh] w-auto h-auto opacity-0 pointer-events-none"
      />

      <div className="absolute inset-0 w-full h-full">
        <Image
          src={enhanced}
          alt="Enhanced"
          fill
          className="object-contain"
          priority
          unoptimized={true}
        />
      </div>

      <div
        className="absolute inset-0 h-full overflow-hidden border-r-2 border-white/50 z-10"
        style={{ width: `${sliderPosition}%` }}
      >
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: containerRef.current
              ? containerRef.current.offsetWidth
              : "100%",
          }}
        >
          {isRemoteOriginal ? (
            <Image
              src={original}
              alt="Original"
              fill
              className="object-contain"
              priority
              unoptimized={true}
            />
          ) : (
            <img
              src={original}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}
        </div>
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center z-20"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="bg-white rounded-full p-1.5 shadow-lg border border-gray-300 transform transition-transform hover:scale-110">
          <MoveHorizontal className="w-4 h-4 text-black" />
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded z-30 pointer-events-none uppercase tracking-wider border border-white/10">
        Before
      </div>
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded z-30 pointer-events-none uppercase tracking-wider border border-white/10">
        After
      </div>
    </div>
  );
};

// --- Page Component ---
interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  originalUrl?: string;
}

const SkinEnhancerPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ NEW STATES: Strength and Features
  const [strength, setStrength] = useState<number>(0.35);
  const [features, setFeatures] = useState({
    freckles: false,
    acne: false,
    peachFuzz: true, // Default to true for realism
    lensFlare: false,
  });

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Cleanup
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
      toast.error("Please upload an image to enhance.");
      return;
    }

    setIsLoading(true);
    toast.info(`Enhancing... (Cost: 30 coins)`);

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

      const response = await fetch("/api/fal/skin-enhancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            image_url: imageUrl,
            strength: strength,
            features: features,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) toast.error("Insufficient coins!");
        else toast.error(data.error || "Enhancement failed");
        throw new Error(data.error);
      }

      const generatedUrl = data.imageUrl;

      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === newJobId
            ? { ...job, status: "completed", urls: [generatedUrl] }
            : job,
        ),
      );
      toast.success("Enhancement complete!");
    } catch (error: any) {
      console.error("Generation failed:", error);
      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === newJobId ? { ...job, status: "failed" } : job,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (imageUrl: string, jobAndImageIndex: string) => {
    setDownloadingIndex(jobAndImageIndex);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `enhanced-${jobAndImageIndex}.png`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Download failed.");
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col justify-center min-h-[60vh]">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* STATE 1: Empty */}
          {activeJobs.length === 0 && !imagePreviewUrl && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600">
              <ScanFace className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                AI Skin Enhancer
              </h1>
              <p className="text-gray-500 max-w-md">
                Upload a face to fix texture, add realism, and More.
              </p>
            </div>
          )}

          {/* STATE 2: Image Uploaded */}
          {activeJobs.length === 0 && imagePreviewUrl && (
            <div className="animate-in fade-in duration-500 relative group w-fit h-auto">
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

          {/* STATE 3: Results */}
          {activeJobs.length > 0 && (
            <div className="w-full flex justify-center">
              {activeJobs.flatMap((job) => {
                if (job.status === "processing") {
                  return (
                    <div
                      key={job.id}
                      className="w-full max-w-lg aspect-[4/3] rounded-lg border border-dashed border-gray-700 bg-gray-800/50 flex flex-col items-center justify-center"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-500/70 mb-4" />
                      <p className="text-gray-400 text-sm animate-pulse">
                        Enhancing...
                      </p>
                    </div>
                  );
                }
                if (job.status === "completed") {
                  return job.urls.map((imgSrc, index) => (
                    <div
                      key={`${job.id}-${index}`}
                      className="relative group w-fit h-auto rounded-lg overflow-hidden shadow-2xl flex justify-center"
                    >
                      {job.originalUrl ? (
                        <CompareSlider
                          original={job.originalUrl}
                          enhanced={imgSrc}
                        />
                      ) : (
                        <Image
                          src={imgSrc}
                          alt="Enhanced"
                          width={800}
                          height={600}
                          className="object-contain"
                          unoptimized={true}
                        />
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleDownload(
                            imgSrc,
                            `${job.id.slice(0, 4)}-${index}`,
                          )
                        }
                        disabled={downloadingIndex === `${job.id}-${index}`}
                        className="absolute bottom-4 right-4 z-40 h-10 w-10 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80"
                      >
                        {downloadingIndex === `${job.id}-${index}` ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  ));
                }
                if (job.status === "failed") {
                  return (
                    <div
                      key={job.id}
                      className="w-full max-w-lg aspect-video rounded-lg border border-dashed border-red-500/50 bg-red-900/20 flex flex-col items-center justify-center text-red-400 p-4 text-center"
                    >
                      <XCircle className="h-8 w-8 mb-2" />
                      <span className="text-xs font-medium">
                        Failed to enhance. Try again.
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

      {/* Input Bar & Settings Area */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-4xl mx-auto mb-4">
          {/* Strength Slider */}
          <div className="flex flex-col w-full md:w-1/2 gap-3">
            {/* ✅ We also make the header w-[85%] so the badge lines up perfectly with the edge of the slider */}
            <div className="flex justify-between items-center w-[85%]">
              <Label className="text-xs font-medium text-gray-400">
                Enhancement Strength
              </Label>
              {/* Changed badge color to teal to match the slider */}
              <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-1.5 py-0.5 rounded">
                {Math.round(strength * 100)}%
              </span>
            </div>
            <Slider
              min={0.1}
              max={0.7}
              step={0.05}
              value={[strength]}
              onValueChange={(v) => setStrength(v[0])}
              disabled={isLoading}
              // ✅ Reduced width to 85%, and added teal fill for the dragged range and thumb border
              className="w-[85%] [&_[data-radix-slider-range]]:!bg-teal-500 [&_[role=slider]]:border-teal-500"
            />
          </div>

          {/* Feature Toggles */}
          <div className="flex flex-col w-full md:w-1/2 gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFeature("peachFuzz")}
                disabled={isLoading}
                className={`h-7 px-3 text-[10px] rounded-full transition-colors ${
                  features.peachFuzz
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}
              >
                Peach Fuzz
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFeature("freckles")}
                disabled={isLoading}
                className={`h-7 px-3 text-[10px] rounded-full transition-colors ${
                  features.freckles
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}
              >
                Freckles
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFeature("acne")}
                disabled={isLoading}
                className={`h-7 px-3 text-[10px] rounded-full transition-colors ${
                  features.acne
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}
              >
                Subtle Acne
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleFeature("lensFlare")}
                disabled={isLoading}
                className={`h-7 px-3 text-[10px] rounded-full transition-colors ${
                  features.lensFlare
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                    : "bg-gray-800 border-gray-700 text-gray-400"
                }`}
              >
                Lens Flare
              </Button>
            </div>
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
                className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${
                  imagePreviewUrl ? "border-cyan-500 text-cyan-500" : ""
                }`,
              })}
            >
              <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
            </Label>
          </div>

          <div className="flex-grow relative flex items-center">
            <Textarea
              id="prompt"
              placeholder="Enhance"
              value=""
              readOnly
              rows={1}
              disabled={true}
              className="flex-grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 md:py-4 self-center min-h-[48px] md:min-h-[56px] cursor-not-allowed select-none"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !sourceImageFile}
                className="h-10 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span className="text-xs font-semibold whitespace-nowrap">
                      30
                    </span>
                    <Coins className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
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

export default SkinEnhancerPage;
