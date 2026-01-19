"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Sparkles,
  Image as ImageIcon,
  Loader2,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  Download,
  UploadCloud,
  XCircle,
  Settings,
  Plus,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

// Auth & Client
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

// Shared Model Costs
import { getModelCost } from "@/lib/models";

// Configure Fal
fal.config({
  proxyUrl: "/api/fal/proxy",
});

// --- Types ---
interface ModelSettingsConfig {
  negativePrompt?: { paramNameBackend: string };
  condition?: (state: { inputImages: File[] }) => boolean;
}

interface AvailableModel {
  id: string;
  name: string;
  iconPath: string;
  supportsAspectRatio: boolean;
  supportsNumImages?: {
    paramNameBackend: string;
    min: number;
    max: number;
    default: number;
  };
  supportsImageInput?: { paramNameBackend: string };
  isPerMegapixel?: boolean;
  settingsConfig?: ModelSettingsConfig;
}

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  aspectRatio: string;
  numImages: number;
}

// --- Config ---
const availableModels: AvailableModel[] = [
  {
    id: "fal-ai/gpt-image-1.5",
    name: "GPT Image 1.5",
    iconPath: "/icons/openai.png",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_urls" },
  },
  {
    id: "seedream-v4",
    name: "Seedream V4",
    iconPath: "/icons/dreminia.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image" },
  },
  {
    id: "flux-dev",
    name: "Flux Dev",
    iconPath: "/icons/flux.png",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image" },
    settingsConfig: { negativePrompt: { paramNameBackend: "negative_prompt" } },
  },
  {
    id: "recraft-v3",
    name: "Recraft V3",
    iconPath: "/icons/recraft.png",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image" },
    settingsConfig: {
      negativePrompt: { paramNameBackend: "negative_prompt" },
      condition: ({ inputImages }) => inputImages.length > 0,
    },
  },
  {
    id: "luma-photon",
    name: "Luma Photon",
    iconPath: "/icons/luma.png",
    supportsAspectRatio: true,
    supportsImageInput: { paramNameBackend: "image" },
  },
];

const aspectRatios = [
  {
    id: "16:9",
    name: "16:9",
    value: "1536x1024",
    IconComponent: RectangleHorizontal,
  },
  { id: "1:1", name: "1:1", value: "1024x1024", IconComponent: Square },
  {
    id: "9:16",
    name: "9:16",
    value: "1024x1536",
    IconComponent: RectangleVertical,
  },
  {
    id: "4:3",
    name: "4:3",
    value: "1536x1024",
    IconComponent: RectangleHorizontal,
  },
];

const defaultSettings = {
  prompt: "",
  model: availableModels[0].id,
  aspectRatio: aspectRatios[1].id,
  numImages: availableModels[0]?.supportsNumImages?.default ?? 1,
};

const ImageGenerationPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultSettings.prompt);
  const [selectedModel, setSelectedModel] = useState(defaultSettings.model);
  const [aspectRatio, setAspectRatio] = useState(defaultSettings.aspectRatio);
  const [numImages, setNumImages] = useState<number | string>(
    defaultSettings.numImages,
  );

  // Multi-Image State
  const [inputImages, setInputImages] = useState<File[]>([]);
  const [inputPreviews, setInputPreviews] = useState<string[]>([]);

  const [negativePrompt, setNegativePrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [strength, setStrength] = useState<number>(0.8);
  const [downloadingIndex, setDownloadingIndex] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentModel = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [selectedModel],
  );

  useEffect(() => {
    if (!currentModel?.supportsImageInput) {
      setInputImages([]);
      setInputPreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    const newModelConfig = availableModels.find((m) => m.id === selectedModel);
    if (newModelConfig?.supportsNumImages) {
      const {
        min,
        max,
        default: defaultNum,
      } = newModelConfig.supportsNumImages;
      setNumImages((prevNum) => {
        const currentN = Number(prevNum);
        return isNaN(currentN) || currentN < min || currentN > max
          ? defaultNum
          : prevNum;
      });
    } else {
      setNumImages(1);
    }
  }, [selectedModel, currentModel]);

  const handleModelChange = (newModelId: string) => {
    setSelectedModel(newModelId);
    setNegativePrompt("");
  };

  const calculatedCost = useMemo(() => {
    if (!currentModel) return 0;
    let actualModelId = currentModel.id;
    if (currentModel.id === "fal-ai/gpt-image-1.5" && inputImages.length > 0) {
      actualModelId = "fal-ai/gpt-image-1.5/edit";
    }
    const baseCost = getModelCost(actualModelId);
    const num = currentModel.supportsNumImages ? Number(numImages) || 1 : 1;
    return baseCost * num;
  }, [currentModel, numImages, inputImages]);

  const handleNumImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    if (value === "" || /^\d+$/.test(value)) setNumImages(value);
  };

  const handleNumImagesBlur = () => {
    const modelConfig = currentModel?.supportsNumImages;
    if (!modelConfig) return;
    let currentN = Number(numImages);
    if (
      String(numImages).trim() === "" ||
      isNaN(currentN) ||
      currentN < modelConfig.min
    ) {
      currentN = modelConfig.default;
    } else if (currentN > modelConfig.max) {
      currentN = modelConfig.max;
    }
    setNumImages(currentN);
  };

  // --- Multi-Image Handler ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = inputImages.length;
    const remainingSlots = 4 - currentCount;

    if (remainingSlots <= 0) {
      toast.error("Max 4 images allowed.");
      e.target.value = "";
      return;
    }

    let filesToProcess = files;
    if (files.length > remainingSlots) {
      toast.warning(`Only added ${remainingSlots} images.`);
      filesToProcess = files.slice(0, remainingSlots);
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    const fileReaders = filesToProcess.map((file) => {
      return new Promise<void>((resolve) => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`Skipped ${file.name}: Max size 10MB`);
          resolve();
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          validFiles.push(file);
          newPreviews.push(reader.result as string);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(fileReaders).then(() => {
      if (validFiles.length > 0) {
        setInputImages((prev) => [...prev, ...validFiles]);
        setInputPreviews((prev) => [...prev, ...newPreviews]);
      }
      e.target.value = "";
    });
  };

  const removeImage = (index: number) => {
    setInputImages((prev) => prev.filter((_, i) => i !== index));
    setInputPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        100,
      )}px`;
    }
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!currentModel) return;

    if (
      !prompt.trim() &&
      !(currentModel.supportsImageInput && inputImages.length > 0)
    ) {
      toast.error("A prompt or reference image is required.");
      return;
    }

    setIsLoading(true);
    toast.info(`Generating...`);

    const newJobId = `job-${Date.now()}`;
    const finalNumImages = Number(numImages) || 1;
    const currentAspectRatio =
      aspectRatios.find((r) => r.id === aspectRatio) || aspectRatios[1];

    const newJob: GenerationJob = {
      id: newJobId,
      status: "processing",
      urls: [],
      aspectRatio: aspectRatio,
      numImages: finalNumImages,
    };
    setActiveJobs((prev) => [newJob, ...prev]);

    try {
      let endpoint = currentModel.id;
      let input: any = {
        prompt: prompt,
        num_images: finalNumImages,
      };

      const uploadedUrls = await Promise.all(
        inputImages.map((file) => fal.storage.upload(file)),
      );

      if (currentModel.id === "fal-ai/gpt-image-1.5") {
        input.image_size = currentAspectRatio.value;
        if (uploadedUrls.length > 0) {
          endpoint = "fal-ai/gpt-image-1.5/edit";
          input.image_urls = uploadedUrls;
        }
      } else if (currentModel.id === "luma-photon") {
        if (uploadedUrls.length > 0) input.image = uploadedUrls[0];
        input.aspect_ratio = aspectRatio;
      } else {
        if (uploadedUrls.length > 0) input.image_url = uploadedUrls[0];
        input.image_size = currentAspectRatio.value;
      }

      if (negativePrompt && currentModel.settingsConfig?.negativePrompt) {
        input[currentModel.settingsConfig.negativePrompt.paramNameBackend] =
          negativePrompt;
      }

      const result: any = await fal.subscribe(endpoint, {
        input: input,
        logs: true,
        onQueueUpdate: (update: any) => {
          if (update.status === "IN_PROGRESS") {
            console.log("Fal Log:", update.logs);
          }
        },
      });

      const generatedUrls = result.data.images.map((img: any) => img.url);

      setActiveJobs((prev) =>
        prev.map((job) =>
          job.id === newJobId
            ? { ...job, status: "completed", urls: generatedUrls }
            : job,
        ),
      );
      toast.success("Generation complete!");
    } catch (error: any) {
      console.error("Generation failed:", error);
      if (
        error.status === 402 ||
        error.message?.includes("Insufficient coins")
      ) {
        toast.error("Not enough coins! Please top up your wallet.");
      } else {
        toast.error(error.message || "Generation failed");
      }

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
      link.setAttribute("download", `image-${jobAndImageIndex}.png`);
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
    if (isLoading || !currentModel) return true;
    const hasSufficientInput =
      prompt.trim() ||
      (!!currentModel.supportsImageInput && inputImages.length > 0);
    return !hasSufficientInput;
  }, [isLoading, currentModel, prompt, inputImages]);

  const showAspectRatioSelector = useMemo(() => {
    if (!currentModel?.supportsAspectRatio) return false;
    if (
      (currentModel.id === "luma-photon" || currentModel.id.includes("edit")) &&
      inputImages.length > 0
    )
      return false;
    return true;
  }, [currentModel, inputImages]);

  const showSettingsButton = useMemo(() => {
    if (!currentModel?.settingsConfig) return false;
    if (currentModel.settingsConfig.condition)
      return currentModel.settingsConfig.condition({ inputImages });
    return true;
  }, [currentModel, inputImages]);

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="flex-grow overflow-y-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full max-w-7xl mx-auto">
          {activeJobs.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-full text-center text-gray-600 mt-20">
              <ImageIcon className="h-16 w-16 mb-4 opacity-50" />
              <h1 className="text-xl font-semibold mb-2 text-gray-400">
                AI Image Generation
              </h1>
              <p className="text-sm">
                Describe any image. Results will appear here.
              </p>
            </div>
          )}
          {activeJobs.flatMap((job) => {
            if (job.status === "processing") {
              return Array.from({ length: job.numImages }).map((_, i) => (
                <div
                  key={`${job.id}-${i}`}
                  className="rounded-lg border border-dashed border-gray-700 bg-gray-800/50 flex items-center justify-center"
                  style={{ aspectRatio: job.aspectRatio.replace(":", " / ") }}
                >
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500/70" />
                </div>
              ));
            }
            if (job.status === "completed") {
              return job.urls.map((imgSrc, index) => {
                const isDownloading = downloadingIndex === `${job.id}-${index}`;
                return (
                  <div
                    key={`${job.id}-${index}`}
                    className="rounded-lg overflow-hidden border border-gray-700 bg-gray-800 relative group"
                    style={{ aspectRatio: job.aspectRatio.replace(":", " / ") }}
                  >
                    <img
                      src={imgSrc}
                      alt={`Generated Image ${index + 1}`}
                      className="absolute top-0 left-0 w-full h-full object-contain"
                      loading="lazy"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        handleDownload(imgSrc, `${job.id.slice(0, 4)}-${index}`)
                      }
                      disabled={isDownloading}
                      className="absolute bottom-2 right-2 z-10 h-8 w-8 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              });
            }
            if (job.status === "failed") {
              return (
                <div
                  key={job.id}
                  className="rounded-lg border border-dashed border-red-500/50 bg-red-900/20 flex flex-col items-center justify-center text-red-400 p-4 text-center"
                  style={{ aspectRatio: job.aspectRatio.replace(":", " / ") }}
                >
                  <XCircle className="h-8 w-8 mb-2" />
                  <span className="text-xs font-medium">Generation Failed</span>
                </div>
              );
            }
            return [];
          })}
        </div>
      </div>

      <div className="w-full px-4 pb-4 pt-2 bg-transparent border-gray-800/50">
        {/* Top: Controls Row */}
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-4xl mx-auto mb-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <Select
              value={selectedModel}
              onValueChange={handleModelChange}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-transparent border-none text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto text-xs pr-2">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="top"
                className=" bg-slate-950 border-white/10 text-gray-300"
              >
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center gap-2">
                      <img
                        src={model.iconPath}
                        alt={`${model.name} logo`}
                        className="w-4 h-4 object-contain"
                      />
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showAspectRatioSelector && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Select
                value={aspectRatio}
                onValueChange={setAspectRatio}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-transparent border-none text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto text-xs pr-2">
                  <SelectValue placeholder="Aspect Ratio" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="top"
                  className=" bg-slate-950 border-white/10 text-gray-300"
                >
                  {aspectRatios.map((ratio) => (
                    <SelectItem key={ratio.id} value={ratio.id}>
                      <div className="flex items-center gap-2">
                        <ratio.IconComponent className="w-4 h-4 text-gray-400" />
                        <span>{ratio.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {currentModel?.supportsNumImages && (
            <div className="flex items-center gap-1 text-gray-400">
              <label htmlFor="numImagesInput" className="text-xs">
                Images:
              </label>
              <input
                id="numImagesInput"
                type="number"
                min={currentModel.supportsNumImages.min}
                max={currentModel.supportsNumImages.max}
                value={numImages}
                onChange={handleNumImagesChange}
                onBlur={handleNumImagesBlur}
                disabled={isLoading}
                className="w-12 bg-transparent border-gray-600 rounded px-1 py-0.5 text-center text-xs"
              />
            </div>
          )}
          {showSettingsButton && (
            <Button
              variant="ghost"
              onClick={() => setIsSettingsOpen(true)}
              disabled={isLoading}
              className="h-auto p-0 text-gray-400 hover:text-gray-200 focus:ring-0"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Strength Slider (Luma Only) */}
        {currentModel?.id === "luma-photon" && inputImages.length > 0 && (
          <div className="w-full max-w-sm mx-auto my-4 px-4">
            <Label
              htmlFor="strength"
              className="text-sm font-medium text-gray-400"
            >
              Strength: {strength.toFixed(2)}
            </Label>
            <div className="flex items-center gap-4">
              <Slider
                id="strength"
                min={0}
                max={1}
                step={0.05}
                value={[strength]}
                onValueChange={(value) => setStrength(value[0])}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* ✅ Middle: Image Selection Tray (Centered) */}
        {currentModel?.supportsImageInput && inputPreviews.length > 0 && (
          <div className="w-full max-w-4xl mx-auto flex justify-center items-center gap-2 mb-2 overflow-x-auto pb-2 scrollbar-none">
            {inputPreviews.map((src, idx) => (
              <div
                key={idx}
                className="relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border border-gray-700 group"
              >
                <img src={src} className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  onClick={() => removeImage(idx)}
                >
                  <XCircle className="w-5 h-5 text-white/80 hover:text-red-400" />
                </div>
              </div>
            ))}

            {/* Add More Button (if < 4) */}
            {inputPreviews.length < 4 && (
              <Button
                variant="outline"
                className="w-16 h-16 rounded-md border-dashed border-gray-700 bg-gray-800/30 hover:bg-gray-800 flex-shrink-0 flex items-center justify-center p-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-6 h-6 text-gray-500" />
              </Button>
            )}
          </div>
        )}

        {/* Bottom: Prompt Bar */}
        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-2">
          {/* Upload Button (Primary - ALWAYS VISIBLE) */}
          {currentModel?.supportsImageInput && (
            <div className="flex-shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-image-upload-genpage"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple // ✅ Multi-select enabled
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
                    inputPreviews.length > 0
                      ? "border-cyan-500 text-cyan-500"
                      : ""
                  } ${
                    inputPreviews.length >= 4
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`, // Visually disable if full
                })}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>
          )}

          <div className="flex-grow relative flex items-center">
            <Textarea
              ref={textareaRef}
              id="prompt"
              placeholder={
                currentModel?.supportsImageInput && inputImages.length > 0
                  ? "Describe..."
                  : "Prompt..."
              }
              value={prompt}
              onChange={handlePromptChange}
              rows={1}
              maxLength={2000} // ✅ 2000 Char Limit
              // ✅ Responsive Padding for Mobile Prompt Box (pr-16 on mobile, pr-32 on desktop)
              className="flex-grow bg-transparent border border-gray-700 focus:border-cyan-500 focus:ring-0 rounded-lg resize-none text-sm md:text-base text-gray-200 placeholder-gray-500 pl-3 pr-16 md:pr-32 py-3 min-h-[50px] max-h-[100px] overflow-y-auto leading-tight"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isGenerateDisabled) handleGenerate();
                }
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              <Button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className={`h-10 px-3 rounded-full flex items-center justify-center gap-1.5 text-white text-xs transition-all ${
                  isGenerateDisabled
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-br from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-600 shadow-lg"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {/* Mobile Optimized Text: Show Cost on mobile, Full text on desktop */}
                    <span className="text-xs font-medium whitespace-nowrap">
                      <span className="hidden md:inline">
                        {isAuthenticated
                          ? calculatedCost > 0
                            ? `${calculatedCost}`
                            : "Generate"
                          : "Generate"}{" "}
                      </span>
                      <span className="md:hidden">
                        {isAuthenticated
                          ? calculatedCost > 0
                            ? `${calculatedCost}`
                            : "Go"
                          : "Go"}
                      </span>
                    </span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-100">
              Advanced Settings
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Fine-tune your generation for the{" "}
              <strong>{currentModel?.name}</strong> model.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentModel?.settingsConfig?.negativePrompt && (
              <div className="grid gap-2">
                <Label htmlFor="negative-prompt" className="text-gray-300">
                  Negative Prompt
                </Label>
                <Textarea
                  id="negative-prompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="e.g., blurry, low quality, text, watermark"
                  className="bg-gray-900 border-gray-600 text-gray-200"
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                className="bg-gradient-to-br from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-600 shadow-lg"
              >
                Done
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
    </div>
  );
};

export default ImageGenerationPage;
