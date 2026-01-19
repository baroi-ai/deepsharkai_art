"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Loader2,
  UploadCloud,
  XCircle,
  Sparkles,
  Video,
  RectangleHorizontal,
  RectangleVertical,
  Clock,
} from "lucide-react";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";

// --- Type Definitions ---
interface DurationParam {
  apiName: string;
  unit: string;
  label: string;
  allowedValues: number[];
  defaultValue: number;
  cost_per_extra_unit?: number;
}

interface ModelParams {
  prompt?: boolean;
  supports_aspect_ratio?: boolean;
  image?: { apiName: string };
  duration?: DurationParam;
  prompt_optimizer?: boolean;
}

interface VideoModelConfig {
  id: string;
  name: string;
  iconPath: string;
  params: ModelParams;
  fixedPayload?: Record<string, any>;
  cost: number;
  costUnit?: string;
}

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  url: string | null;
}

// --- Configuration Data ---
const availableVideoModels: VideoModelConfig[] = [
  {
    id: "google/veo-2",
    name: "Google Veo 2",
    iconPath: "/icons/google.png",
    cost: 220,
    costUnit: "for 5s",
    params: {
      supports_aspect_ratio: true,
      image: { apiName: "image" },
      duration: {
        apiName: "duration",
        unit: "s",
        label: "Duration",
        allowedValues: [5, 6, 7, 8],
        defaultValue: 5,
        cost_per_extra_unit: 44,
      },
    },
  },
  {
    id: "minimax/video-01",
    name: "Minimax Video-01",
    iconPath: "/icons/minimax.png",
    cost: 44,
    costUnit: "per video",
    params: {
      image: { apiName: "image" },
      supports_aspect_ratio: false,
      prompt_optimizer: true,
    },
  },
  {
    id: "minimax/video-01-director",
    name: "Minimax Video-01 Director",
    iconPath: "/icons/minimax.png",
    cost: 44,
    costUnit: "per video",
    params: {
      supports_aspect_ratio: false,
      image: { apiName: "first_frame_image" },
      prompt_optimizer: true,
    },
  },
  {
    id: "kwaivgi/kling-v2.1",
    name: "Kling V2.1",
    iconPath: "/icons/kling.png",
    cost: 123,
    costUnit: "for 5s",
    params: {
      supports_aspect_ratio: true,
      image: { apiName: "start_image" },
      duration: {
        apiName: "video_duration",
        unit: "s",
        label: "Duration",
        allowedValues: [5, 10],
        defaultValue: 5,
        cost_per_extra_unit: 25,
      },
    },
  },
  {
    id: "tencent/hunyuan-video",
    name: "Hunyuan Video",
    iconPath: "/icons/hunyuan.png",
    cost: 35,
    costUnit: "per video",
    params: { image: { apiName: "image" }, supports_aspect_ratio: true },
  },
  {
    id: "luma/ray-flash-2",
    name: "Luma Ray 2",
    iconPath: "/icons/luma.png",
    cost: 44,
    costUnit: "for 5s/9s",
    params: {
      image: { apiName: "image" },
      supports_aspect_ratio: true,
      duration: {
        apiName: "duration_secs",
        unit: "s",
        label: "Duration",
        allowedValues: [5, 9],
        defaultValue: 5,
      },
    },
  },
  {
    id: "wavespeedai/wan-2.1-t2v-720p",
    name: "Wan 2.1",
    iconPath: "/icons/wan.png",
    cost: 35,
    costUnit: "per video",
    params: { image: { apiName: "image" }, supports_aspect_ratio: true },
  },
  {
    id: "pixverse/pixverse-v4",
    name: "Pixverse V4.5",
    iconPath: "/icons/pixverser.png",
    cost: 35,
    costUnit: "for 5s/8s",
    params: {
      supports_aspect_ratio: true,
      image: { apiName: "image_path" },
      duration: {
        apiName: "duration",
        unit: "s",
        label: "Duration",
        allowedValues: [5, 8],
        defaultValue: 5,
      },
    },
  },
];

const standardAspectRatios = [
  { id: "16:9", name: "16:9", IconComponent: RectangleHorizontal },
  { id: "9:16", name: "9:16", IconComponent: RectangleVertical },
];

const initialDefaultModel = availableVideoModels[0];
const defaultVideoSettings = {
  prompt: "",
  model: initialDefaultModel.id,
  aspectRatio: initialDefaultModel.params.supports_aspect_ratio
    ? standardAspectRatios[0].id
    : "16:9",
  duration: initialDefaultModel.params.duration?.defaultValue,
};

const VideoGenerationPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [prompt, setPrompt] = useState(defaultVideoSettings.prompt);
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(
    defaultVideoSettings.model
  );
  const [aspectRatio, setAspectRatio] = useState(
    defaultVideoSettings.aspectRatio
  );
  const [duration, setDuration] = useState<number | undefined>(
    defaultVideoSettings.duration
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentModel = useMemo(
    () => availableVideoModels.find((m) => m.id === selectedModel),
    [selectedModel]
  );

  useEffect(() => {
    if (!currentModel) return;
    setDuration(currentModel.params.duration?.defaultValue);
    if (!currentModel.params.image) clearImage();
    setActiveJob(null);
  }, [currentModel]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setActiveJob(null);
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File exceeds 10MB.");
        clearImage();
        return;
      }
      setSourceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      clearImage();
    }
  };

  const clearImage = () => {
    setSourceImageFile(null);
    setImagePreviewUrl(null);
    setActiveJob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const calculateCost = useCallback(() => {
    if (!currentModel) return 0;
    let totalCost = currentModel.cost;
    if (currentModel.params.duration && duration !== undefined) {
      const { defaultValue, cost_per_extra_unit } =
        currentModel.params.duration;
      if (cost_per_extra_unit && duration > defaultValue) {
        totalCost += (duration - defaultValue) * cost_per_extra_unit;
      }
    }
    return Math.max(1, Math.round(totalCost));
  }, [currentModel, duration]);

  const estimatedCost = calculateCost();

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (isGenerateDisabled) return;

    setIsLoading(true);
    setActiveJob({ id: "temp-id", status: "processing", url: null });
    toast.success(
      "Video generation started! This may take a few minutes (Demo)."
    );

    setTimeout(() => {
      const dummyJobId = `job-${Date.now()}`;
      const newJob: GenerationJob = {
        id: dummyJobId,
        status: "completed",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      };

      setActiveJob(newJob);
      setIsLoading(false);
      toast.success("Your video is ready!");
    }, 4000);
  };

  const isGenerateDisabled = useMemo(() => {
    if (isLoading || !currentModel) return true;
    const hasSufficientInput =
      prompt.trim() || (!!currentModel.params.image && sourceImageFile);
    return !hasSufficientInput;
  }, [isLoading, prompt, sourceImageFile, currentModel]);

  const showImageUpload = !!currentModel?.params.image;

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="flex-grow overflow-y-auto p-6 flex flex-col items-center justify-center relative">
        {(isLoading || activeJob?.status === "processing") && (
          <div className="flex flex-col items-center text-muted-foreground text-center">
            <Loader2 className="h-10 w-10 animate-spin mb-4 text-cyan-500" />
            <p>Generating your video sequence...</p>
            <p className="text-sm">(This can take a few minutes)</p>
          </div>
        )}

        {!activeJob && !isLoading && (
          <div className="text-center text-gray-600">
            <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h1 className="text-xl font-semibold mb-2 text-gray-400">
              AI Video Generation
            </h1>
            <p className="text-sm">Generated video will appear here</p>
          </div>
        )}

        {activeJob?.status === "completed" && activeJob.url && (
          <div
            className="w-full max-w-3xl rounded-lg overflow-hidden border border-gray-700 bg-black shadow-lg"
            style={{
              aspectRatio:
                currentModel?.params.supports_aspect_ratio && aspectRatio
                  ? aspectRatio.replace(":", "/")
                  : "16 / 9",
            }}
          >
            <video
              key={activeJob.url}
              controls
              loop
              autoPlay
              muted
              className="w-full h-full object-contain"
              preload="metadata"
            >
              <source src={activeJob.url} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {activeJob?.status === "failed" && (
          <div className="text-center text-red-400">
            <XCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h1 className="text-xl font-semibold mb-2 text-red-300">
              Generation Failed
            </h1>
            <p className="text-sm">
              Please try again. Your credits have been refunded.
            </p>
          </div>
        )}
      </div>

      <div className="w-full px-4 pb-4 pt-2">
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-xl mx-auto mb-3 px-2">
          <div className="flex items-center">
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-transparent border-none text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto text-xs pr-2">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="top"
                align="center"
                className=" bg-slate-950 border-white/10 text-gray-300"
              >
                {availableVideoModels.map((model) => (
                  <SelectItem
                    key={model.id}
                    value={model.id}
                    className="focus:bg-gray-700 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={model.iconPath}
                        alt={`${model.name} logo`}
                        className="w-4 h-4 object-contain flex-shrink-0"
                      />
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {currentModel?.params.supports_aspect_ratio && (
            <div className="flex items-center">
              <Select
                value={aspectRatio}
                onValueChange={setAspectRatio}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-transparent border-none text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto text-xs pr-2">
                  <SelectValue placeholder="Ratio" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="top"
                  align="center"
                  className=" text-gray-300"
                >
                  {standardAspectRatios.map((ratio) => (
                    <SelectItem
                      key={ratio.id}
                      value={ratio.id}
                      className="focus:bg-gray-700 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <ratio.IconComponent className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{ratio.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {currentModel?.params.duration && (
            <div className="flex items-center">
              <Clock className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 mr-1" />
              <Select
                value={duration?.toString()}
                onValueChange={(value) => setDuration(Number(value))}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-transparent border-none shadow-none text-gray-300 hover:text-white focus:ring-0 h-8 px-3 rounded-lg text-xs">
                  <SelectValue
                    placeholder={
                      currentModel.params.duration.label || "Duration"
                    }
                  />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="top"
                  align="center"
                  className=" bg-slate-950 border-white/10 text-gray-300"
                >
                  {currentModel.params.duration.allowedValues.map((val) => (
                    <SelectItem
                      key={val}
                      value={val.toString()}
                      className="focus:bg-gray-700 text-xs"
                    >
                      {val}
                      {currentModel.params.duration?.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <div
          className={`relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-2 ${
            showImageUpload && sourceImageFile
              ? "items-stretch"
              : "items-center"
          }`}
        >
          {showImageUpload && (
            <div className="flex-shrink-0 relative">
              <Input
                ref={fileInputRef}
                id="source-image-upload-video"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageChange}
                className="hidden"
                disabled={isLoading}
              />
              {!imagePreviewUrl ? (
                <Label
                  htmlFor="source-image-upload-video"
                  className={buttonVariants({
                    variant: "outline",
                    size: "icon",
                    className:
                      "cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-gray-800/50 rounded-lg",
                  })}
                >
                  <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
                </Label>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="h-12 w-12 md:h-14 md:w-14 rounded-lg border border-gray-700 object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearImage}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-gray-700/80 backdrop-blur-sm text-gray-300 hover:bg-red-600 hover:text-white z-10"
                    aria-label="Remove image"
                    disabled={isLoading}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="flex-grow relative flex items-center">
            <Textarea
              id="prompt-video-main"
              placeholder={
                showImageUpload && sourceImageFile
                  ? "Optional: Describe animation..."
                  : "Text Prompt"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={1}
              className="flex-grow bg-transparent border border-gray-700 focus:border-cyan-500 focus:ring-0 rounded-lg resize-none text-base text-gray-200 placeholder-gray-500 pl-4 pr-[7.5rem] md:pr-36 py-2.5 self-center min-h-[54px]"
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
                className={`h-10 px-4 rounded-full flex items-center justify-center gap-1.5 text-white text-xs transition-all ${
                  isGenerateDisabled
                    ? "cursor-not-allowed opacity-60 bg-gray-600"
                    : "bg-gradient-to-br from-cyan-600 to-teal-500 hover:from-cyan-700 hover:to-teal-700 shadow-lg"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span className="text-xs font-medium whitespace-nowrap">
                      <span className="hidden md:inline">
                        {/* ✅ FIXED: Always show credits if cost > 0 */}
                        {estimatedCost > 0
                          ? `${estimatedCost} Credits`
                          : "Generate"}
                      </span>
                      <span className="md:hidden">
                        {estimatedCost > 0 ? `${estimatedCost}` : "Go"}
                      </span>
                    </span>
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

export default VideoGenerationPage;
