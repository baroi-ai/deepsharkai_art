"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
// ✅ Import Next Image
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
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Auth & Client
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

// Configure Fal
fal.config({
  proxyUrl: "/api/fal/proxy",
});

// --- Config ---
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

  // Dynamic Cost
  const calculatedCost = useMemo(() => {
    return Number(numLayers) * 5;
  }, [numLayers]);

  // Cleanup URLs
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
      // Use createObjectURL for preview
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
      toast.error("Please upload an image to decompose.");
      return;
    }

    setIsLoading(true);
    toast.info(`Decomposing... (Cost: ${calculatedCost} coins)`);

    const newJobId = `job-${Date.now()}`;

    const newJob: GenerationJob = {
      id: newJobId,
      status: "processing",
      urls: [],
      originalUrl: imagePreviewUrl || "",
    };

    setActiveJobs([newJob]);

    try {
      const imageUrl = await fal.storage.upload(sourceImageFile);

      const response = await fetch("/api/fal/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            image_url: imageUrl,
            num_layers: Number(numLayers),
            cost: calculatedCost,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error("Insufficient coins! Please recharge.");
        } else {
          toast.error(data.error || "Decomposition failed");
        }
        throw new Error(data.error);
      }

      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === newJobId
            ? { ...job, status: "completed", urls: data.layers }
            : job,
        ),
      );
      toast.success("Decomposition complete!");
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
    } catch (error) {
      toast.error("Download failed.");
    } finally {
      setDownloadingIndex(null);
    }
  };

  const isGenerateDisabled = useMemo(() => {
    if (isLoading) return true;
    return !sourceImageFile;
  }, [isLoading, sourceImageFile]);

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="flex-grow overflow-y-auto p-4 md:p-6 flex flex-col pt-10 min-h-[60vh]">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* STATE 1: Empty */}
          {activeJobs.length === 0 && !imagePreviewUrl && (
            <div className="flex-grow flex flex-col items-center justify-center text-center text-gray-600 mt-20">
              <Layers className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                AI Image Decomposer
              </h1>
              <p className="text-gray-500 max-w-md">
                Upload an image to split it into transparent layers.
              </p>
            </div>
          )}

          {/* STATE 2: Image Uploaded (Pre-generation) */}
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

          {/* STATE 3: Results */}
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
                    <div
                      key={job.id}
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full"
                    >
                      {/* Original */}
                      <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-800/50 aspect-video">
                        <img
                          src={job.originalUrl}
                          className="w-full h-full object-contain p-2"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 text-[10px] rounded text-white">
                          Original
                        </div>
                      </div>

                      {/* Extracted Layers */}
                      {job.urls.map((imgSrc, index) => {
                        const isDownloading =
                          downloadingIndex === `${job.id}-layer-${index}`;
                        return (
                          <div
                            key={`${job.id}-${index}`}
                            className="relative group rounded-lg overflow-hidden border border-gray-700 bg-[url('/transparent-grid.png')] bg-repeat aspect-video"
                          >
                            {/* ✅ Use Next/Image for Results */}
                            <div className="w-full h-full relative p-2">
                              <Image
                                src={imgSrc}
                                alt={`Layer ${index + 1}`}
                                fill
                                className="object-contain"
                                unoptimized={true} // Bypass Security Headers
                              />
                            </div>

                            <div className="absolute top-2 left-2 bg-teal-900/80 px-2 py-1 text-[10px] rounded text-teal-200 border border-teal-700/50 z-20">
                              Layer {index + 1}
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                handleDownload(
                                  imgSrc,
                                  `${job.id}-layer-${index}.png`,
                                )
                              }
                              disabled={isDownloading}
                              className="absolute bottom-2 right-2 z-20 h-8 w-8 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80"
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        );
                      })}
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
                        Decomposition Failed. Please try again.
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
          {/* Layer Selector */}
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
              placeholder="Decompose"
              value="Upload"
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
                    : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-cyan-500/20"
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

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
    </div>
  );
};

export default ImageDecomposerPage;
