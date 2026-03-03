"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
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
  Image as ImageIcon,
  Loader2,
  RectangleHorizontal,
  Square,
  RectangleVertical,
  Download,
  UploadCloud,
  XCircle,
  Plus,
  Minus,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

// Auth & Client
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

// Shared Model Costs
import { getModelCost } from "@/lib/models";

// Configure Fal (Only used for file uploads via Proxy)
fal.config({
  proxyUrl: "/api/fal/proxy",
});

// --- Config & Data ---
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
  settingsConfig?: ModelSettingsConfig;
  supportsResolution?: boolean;
}

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  aspectRatio: string;
  numImages: number;
}

const availableModels: AvailableModel[] = [
  {
    id: "fal-ai/nano-banana-2",
    name: "Nano Banana 2",
    iconPath: "/icons/nano-banna.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_url" },
    supportsResolution: true,
  },
  {
    id: "fal-ai/bytedance/seedream/v5/lite/text-to-image",
    name: "Seedream V5 Lite",
    iconPath: "/icons/dreminia.webp",
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
    id: "fal-ai/flux-2/klein/9b",
    name: "Flux klein 9B",
    iconPath: "/icons/flux.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_urls" },
    settingsConfig: { negativePrompt: { paramNameBackend: "negative_prompt" } },
  },
  {
    id: "fal-ai/nano-banana-pro",
    name: "Nano Banana Pro",
    iconPath: "/icons/nano-banna.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_url" },
    supportsResolution: true,
  },
  {
    id: "xai/grok-imagine-image",
    name: "Grok Imagine",
    iconPath: "/icons/grok.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_url" },
  },
  {
    id: "fal-ai/gpt-image-1.5",
    name: "GPT Image 1.5",
    iconPath: "/icons/openai.webp",
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
    id: "fal-ai/z-image/turbo",
    name: "Z-Image Turbo",
    iconPath: "/icons/z-image.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_url" },
  },
  {
    id: "fal-ai/minimax/image-01",
    name: "Minimax Image 01",
    iconPath: "/icons/minimax.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_url" },
  },
  {
    id: "fal-ai/ideogram/v3",
    name: "Ideogram V3",
    iconPath: "/icons/ideogram.webp",
    supportsAspectRatio: true,
    supportsNumImages: {
      paramNameBackend: "num_images",
      min: 1,
      max: 4,
      default: 1,
    },
    supportsImageInput: { paramNameBackend: "image_url" },
  },
  {
    id: "fal-ai/recraft/v4/text-to-image",
    name: "Recraft V4",
    iconPath: "/icons/recraft.webp",
    supportsAspectRatio: true,
    supportsImageInput: { paramNameBackend: "image_url" },
  },
  {
    id: "fal-ai/luma-photon",
    name: "Luma Photon",
    iconPath: "/icons/luma.webp",
    supportsAspectRatio: true,
    supportsImageInput: { paramNameBackend: "image_url" },
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

const resolutionOptions = [
  { id: "1k", name: "1K", multiplier: 1 },
  { id: "2k", name: "2K", multiplier: 2 },
  { id: "4k", name: "4K", multiplier: 4 },
];

const defaultSettings = {
  prompt: "",
  model: availableModels[0].id,
  aspectRatio: aspectRatios[1].id,
  numImages: availableModels[0]?.supportsNumImages?.default ?? 1,
  resolution: "1k",
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
  const [resolution, setResolution] = useState(defaultSettings.resolution);

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

  // ✅ DYNAMIC ENDPOINT LOGIC: Detects if it's an edit right away
  const actualEndpoint = useMemo(() => {
    if (!currentModel) return "";
    let endpoint = currentModel.id;

    if (inputImages.length > 0) {
      if (endpoint.includes("flux")) endpoint += "/edit";
      else if (endpoint.includes("nano-banana")) endpoint += "/edit";
      else if (endpoint.includes("grok")) endpoint += "/edit";
      else if (endpoint.includes("ideogram")) endpoint += "/remix";
      else if (endpoint.includes("z-image")) endpoint += "/image-to-image";
      else if (endpoint.includes("luma-photon")) endpoint += "/modify";
      else if (endpoint.includes("minimax")) endpoint += "/subject-reference";
      else if (endpoint.includes("seedream"))
        endpoint = endpoint.replace("text-to-image", "edit");
      else if (endpoint.includes("recraft"))
        endpoint = endpoint.replace("text-to-image", "image-to-image");
      else if (endpoint.includes("gpt")) endpoint += "/edit";
    }
    return endpoint;
  }, [currentModel, inputImages.length]);

  // ✅ Dynamically limit Ideogram to 1 image, others to 4
  const maxAllowedImages = currentModel?.id.includes("ideogram") ? 1 : 4;

  // Cleanup effect for Blob URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      inputPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [inputPreviews]);

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

  // ✅ DYNAMIC COST: Now uses actualEndpoint instead of base model
  // ✅ DYNAMIC COST: Now uses actualEndpoint instead of base model
  const calculatedCost = useMemo(() => {
    if (!actualEndpoint) return 0;

    let baseCost = getModelCost(actualEndpoint);

    // ✅ Use if / else if to ensure only ONE multiplier is applied!
    if (actualEndpoint.includes("nano-banana-2")) {
      if (resolution === "2k")
        baseCost = Math.ceil(baseCost * 1.5); // 1.5x cost
      else if (resolution === "4k") baseCost = baseCost * 2; // 2x cost
    } else if (actualEndpoint.includes("nano-banana")) {
      // This will now only run for nano-banana-pro
      if (resolution === "2k" || resolution === "4k") {
        baseCost = baseCost * 2;
      }
    }

    const num = currentModel?.supportsNumImages ? Number(numImages) || 1 : 1;
    return baseCost * num;
  }, [actualEndpoint, currentModel, numImages, resolution]);

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

  // Handlers for custom + / - buttons
  const handleIncrement = () => {
    if (isLoading || !currentModel?.supportsNumImages) return;
    const { max } = currentModel.supportsNumImages;
    setNumImages((prev) => Math.min(Number(prev) + 1, max));
  };

  const handleDecrement = () => {
    if (isLoading || !currentModel?.supportsNumImages) return;
    const { min } = currentModel.supportsNumImages;
    setNumImages((prev) => Math.max(Number(prev) - 1, min));
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // ✅ Uses the dynamic limit!
    if (files.length + inputImages.length > maxAllowedImages) {
      toast.error(
        `Max ${maxAllowedImages} image${maxAllowedImages === 1 ? "" : "s"} allowed for this model.`,
      );
      e.target.value = "";
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    files.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (>10MB)`);
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    setInputImages((prev) => [...prev, ...newFiles]);
    setInputPreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(inputPreviews[index]);
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

    if (!prompt.trim() && inputImages.length === 0) {
      toast.error("A prompt or reference image is required.");
      return;
    }

    setIsLoading(true);
    toast.info(`Generating... (Cost: ${calculatedCost})`);

    const newJobId = `job-${Date.now()}`;
    const finalNumImages = Number(numImages) || 1;

    const newJob: GenerationJob = {
      id: newJobId,
      status: "processing",
      urls: [],
      aspectRatio: aspectRatio,
      numImages: finalNumImages,
    };
    setActiveJobs((prev) => [newJob, ...prev]);

    try {
      const endpoint = actualEndpoint;

      let input: any = {
        prompt: prompt,
        num_images: finalNumImages,
      };

      // 1. Upload Images to Fal Storage (via Proxy)
      const uploadedUrls = await Promise.all(
        inputImages.map((file) => fal.storage.upload(file)),
      );

      // --- INPUT PARAMETERS ---
      if (currentModel.supportsResolution) {
        input.aspect_ratio = aspectRatio;
        input.resolution = resolution.toUpperCase();
      } else if (endpoint.includes("minimax")) {
        input.aspect_ratio = aspectRatio;
      } else if (endpoint.includes("minimax") || endpoint.includes("grok")) {
        // ✅ Grok accepts "16:9" strings natively just like Minimax!
        input.aspect_ratio = aspectRatio;
      } else if (endpoint.includes("luma")) {
        input.aspect_ratio = aspectRatio;
        if (finalNumImages > 1) input.num_images = 1;

        // ✅ Simplify this! If they uploaded an image, send the strength.
        if (inputImages.length > 0) {
          input.strength = strength;
        }
      } else if (endpoint.includes("gpt")) {
        if (inputImages.length > 0) {
          input.image_size = "auto";
        } else {
          // ✅ If doing Text-to-Image, use the exact Enum strings GPT requires
          let sizeString = "1024x1024";
          if (aspectRatio === "16:9" || aspectRatio === "4:3")
            sizeString = "1536x1024";
          else if (aspectRatio === "9:16") sizeString = "1024x1536";
          input.image_size = sizeString;
        }
      } else if (
        endpoint.includes("flux") ||
        endpoint.includes("ideogram") ||
        endpoint.includes("seedream") ||
        endpoint.includes("z-image") ||
        endpoint.includes("recraft")
      ) {
        let sizeEnum = "square_hd";
        if (aspectRatio === "16:9") sizeEnum = "landscape_16_9";
        else if (aspectRatio === "9:16") sizeEnum = "portrait_16_9";
        else if (aspectRatio === "4:3") sizeEnum = "landscape_4_3";
        else if (aspectRatio === "1:1") sizeEnum = "square_hd";
        input.image_size = sizeEnum;
      } else {
        const [w, h] = (
          aspectRatios.find((r) => r.id === aspectRatio) || aspectRatios[1]
        ).value
          .split("x")
          .map(Number);
        input.image_size = { width: w, height: h };
      }

      // --- IMAGE INPUT MAPPING ---
      if (uploadedUrls.length > 0) {
        const key =
          currentModel.supportsImageInput?.paramNameBackend || "image_url";
        if (
          endpoint.includes("gpt") ||
          endpoint.includes("nano") ||
          (endpoint.includes("flux") && !endpoint.includes("flux-2"))
        ) {
          input.image_urls = uploadedUrls;
        } else if (endpoint.includes("flux-2")) {
          input.image_url = uploadedUrls[0];
        } else {
          input[key] = uploadedUrls[0];
        }
      }

      // 2. CALL CUSTOM API ROUTE
      const response = await fetch("/api/fal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: endpoint,
          input: input,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error("Insufficient coins! Please recharge.");
        } else {
          toast.error(data.error || "Generation failed");
        }
        throw new Error(data.error);
      }

      const generatedUrls = data.imageUrls;

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
      const msg = error.message || "Generation failed";

      if (msg !== "Insufficient coins! Please recharge.") {
        toast.error(msg);
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

  // ✅ Hide aspect ratio for Luma when an image is uploaded
  const showAspectRatioSelector = useMemo(() => {
    if (!currentModel?.supportsAspectRatio) return false;

    if (currentModel.id.includes("luma") && inputImages.length > 0) {
      return false;
    }

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
                    <Image
                      src={imgSrc}
                      alt={`Generated Image ${index + 1}`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      unoptimized={true}
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
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-4xl mx-auto mb-3">
          {/* Model Selector */}
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
                style={{ maxHeight: "300px" }}
                className="bg-slate-950 border-white/10 text-gray-300 overflow-y-auto overscroll-contain"
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

          {/* Resolution Selector (Nano Only) */}
          {currentModel?.supportsResolution && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Select
                value={resolution}
                onValueChange={setResolution}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-transparent border-none text-cyan-400 hover:text-cyan-300 focus:ring-0 p-0 h-auto text-xs pr-2 font-medium">
                  <SelectValue placeholder="Res" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="top"
                  className="bg-slate-950 border-white/10 text-gray-300"
                >
                  {resolutionOptions.map((res) => (
                    <SelectItem key={res.id} value={res.id}>
                      <span>{res.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
                  className="bg-slate-950 border-white/10 text-gray-300"
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

          {/* Custom Num Images Stepper */}
          {currentModel?.supportsNumImages && (
            <div className="flex items-center gap-2 text-gray-400">
              <label className="text-xs">Images:</label>

              <div className="flex items-center bg-transparent border border-gray-600 rounded overflow-hidden">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={
                    isLoading ||
                    Number(numImages) <= currentModel.supportsNumImages.min
                  }
                  className="px-2 py-1 bg-gray-800/30 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <span className="w-6 text-center text-xs text-gray-200 font-medium select-none">
                  {numImages}
                </span>

                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={
                    isLoading ||
                    Number(numImages) >= currentModel.supportsNumImages.max
                  }
                  className="px-2 py-1 bg-gray-800/30 hover:bg-gray-700 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Strength Slider (Luma Only) */}
        {currentModel?.id.includes("luma") && inputImages.length > 0 && (
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

        {/* Image Selection Tray */}
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

            {/* ✅ Updated to use dynamic limit */}
            {inputPreviews.length < maxAllowedImages && (
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

        {/* Prompt Bar */}
        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-2">
          {/* Upload Button */}
          {currentModel?.supportsImageInput && (
            <div className="flex-shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-image-upload-genpage"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                onChange={handleImageFileChange}
                className="hidden"
                // ✅ Disable the input if the limit is reached
                disabled={isLoading || inputPreviews.length >= maxAllowedImages}
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
                    // ✅ Apply the disabled styling if limit is reached
                    inputPreviews.length >= maxAllowedImages
                      ? "opacity-50 cursor-not-allowed pointer-events-none"
                      : ""
                  }`,
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
              maxLength={2000}
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

export default ImageGenerationPage;
