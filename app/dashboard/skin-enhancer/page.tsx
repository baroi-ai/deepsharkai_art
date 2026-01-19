"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
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
  Loader2,
  Download,
  UploadCloud,
  ScanFace,
  XCircle,
  Settings,
  Wand2,
  MoveHorizontal,
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

// Configure Fal
fal.config({
  proxyUrl: "/api/fal/proxy",
});

// --- Types ---
interface ModelSettingsConfig {
  negativePrompt?: { paramNameBackend: string };
  condition?: (state: { sourceImageFile: File | null }) => boolean;
}

interface AvailableModel {
  id: string;
  name: string;
  iconPath: string;
  supportsImageInput?: { paramNameBackend: string };
  isPerMegapixel?: boolean;
  settingsConfig?: ModelSettingsConfig;
}

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
  originalUrl?: string;
}

// --- Config ---
const availableModels: AvailableModel[] = [
  {
    id: "deepshark-realism",
    name: "Deepshark Realism",
    iconPath: "/logo.png",
    supportsImageInput: { paramNameBackend: "image" },
  },
  {
    id: "deepshark-face-enhancement",
    name: "Deepshark Face Enhancement",
    iconPath: "/logo.png",
    supportsImageInput: { paramNameBackend: "image" },
  },
  {
    id: "deepshark-retoucher",
    name: "Deepshark Retoucher",
    iconPath: "/logo.png",
    supportsImageInput: { paramNameBackend: "image_urls" },
  },
];

const defaultSettings = {
  prompt: "",
  model: availableModels[0].id,
};

// --- Helper Component: Before/After Slider ---
const CompareSlider = ({
  original,
  enhanced,
}: {
  original: string;
  enhanced: string;
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - left) / width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, pos)));
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-auto h-auto overflow-hidden select-none group cursor-col-resize rounded-lg touch-none"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      <img
        src={enhanced}
        alt="Enhanced"
        className="block max-h-[60vh] w-auto h-auto object-contain pointer-events-none"
        onLoad={() => {
          if (containerRef.current)
            setContainerWidth(containerRef.current.offsetWidth);
        }}
      />

      <div
        className="absolute inset-0 h-full overflow-hidden border-r-2 border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={original}
          alt="Original"
          className="absolute top-0 left-0 max-w-none h-full object-contain pointer-events-none"
          style={{ width: containerWidth ? `${containerWidth}px` : "100%" }}
        />
      </div>

      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] flex items-center justify-center"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="bg-white rounded-full p-1.5 shadow-lg">
          <MoveHorizontal className="w-4 h-4 text-black" />
        </div>
      </div>

      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded z-10 pointer-events-none uppercase tracking-wider">
        Before
      </div>
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded z-10 pointer-events-none uppercase tracking-wider">
        After
      </div>
    </div>
  );
};

const SkinEnhancerPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prompt, setPrompt] = useState(defaultSettings.prompt);
  const [selectedModel, setSelectedModel] = useState(defaultSettings.model);

  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [strength, setStrength] = useState<number>(0.6);
  const [downloadingIndex, setDownloadingIndex] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const currentModel = useMemo(
    () => availableModels.find((m) => m.id === selectedModel),
    [selectedModel],
  );

  useEffect(() => {
    if (!currentModel?.supportsImageInput) {
      setSourceImageFile(null);
      setImagePreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [selectedModel, currentModel]);

  const handleModelChange = (newModelId: string) => {
    setSelectedModel(newModelId);
    setNegativePrompt("");
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size cannot exceed 10MB.");
        return;
      }
      setSourceImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);

      // Reset jobs to clear the previous result view and show the new image preview
      setActiveJobs([]);

      // Reset input value to allow re-selecting same file if needed
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
    if (!currentModel) return;
    if (!sourceImageFile && currentModel.supportsImageInput) {
      toast.error("Please upload an image to enhance.");
      return;
    }

    setIsLoading(true);
    toast.info(`Enhancing... (Cost: 2 coins)`);

    const newJobId = `job-${Date.now()}`;

    const newJob: GenerationJob = {
      id: newJobId,
      status: "processing",
      urls: [],
      originalUrl: imagePreviewUrl || "",
    };

    // ✅ FIX: Override existing jobs instead of appending.
    // This prevents multiple sliders from stacking up.
    setActiveJobs([newJob]);

    try {
      let input: any = {
        prompt: "High quality, highly detailed, sharp",
        scale: 1,
        creativity: strength,
        strength: strength,
      };

      let imageUrl = null;
      if (sourceImageFile) {
        imageUrl = await fal.storage.upload(sourceImageFile);
      }

      if (currentModel.id === "luma-photon") {
        if (imageUrl) input.image = imageUrl;
      } else {
        if (
          currentModel.supportsImageInput?.paramNameBackend === "image_urls"
        ) {
          if (imageUrl) input.image_urls = [imageUrl];
        } else {
          if (imageUrl) input.image_url = imageUrl;
        }
      }

      if (negativePrompt && currentModel.settingsConfig?.negativePrompt) {
        input[currentModel.settingsConfig.negativePrompt.paramNameBackend] =
          negativePrompt;
      }

      const response = await fetch("/api/fal/skin-enhancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: currentModel.id,
          input: input,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error("Insufficient coins! Please recharge.");
        } else {
          toast.error(data.error || "Enhancement failed");
        }
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

  const isGenerateDisabled = useMemo(() => {
    if (isLoading || !currentModel) return true;
    const hasSufficientInput = !!(
      currentModel.supportsImageInput && sourceImageFile
    );
    return !hasSufficientInput;
  }, [isLoading, currentModel, sourceImageFile]);

  const showSettingsButton = useMemo(() => {
    if (!currentModel?.settingsConfig) return false;
    return true;
  }, [currentModel]);

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* 1. MAIN PREVIEW AREA */}
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
                Upload a face to get rid of ai plstic skin texture.
              </p>
            </div>
          )}

          {/* STATE 2: Image Uploaded (Pre-generation) */}
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
                        Enhancing skin details...
                      </p>
                    </div>
                  );
                }
                if (job.status === "completed") {
                  return job.urls.map((imgSrc, index) => {
                    const isDownloading =
                      downloadingIndex === `${job.id}-${index}`;
                    return (
                      <div
                        key={`${job.id}-${index}`}
                        className="relative group w-fit h-auto rounded-lg overflow-hidden shadow-2xl"
                      >
                        {job.originalUrl ? (
                          <CompareSlider
                            original={job.originalUrl}
                            enhanced={imgSrc}
                          />
                        ) : (
                          <img
                            src={imgSrc}
                            alt="Enhanced"
                            className="max-h-[60vh] w-auto object-contain"
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
                          disabled={isDownloading}
                          className="absolute bottom-4 right-4 z-20 h-10 w-10 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-black/80"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Download className="h-5 w-5" />
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
                      className="w-full max-w-lg aspect-video rounded-lg border border-dashed border-red-500/50 bg-red-900/20 flex flex-col items-center justify-center text-red-400 p-4 text-center"
                    >
                      <XCircle className="h-8 w-8 mb-2" />
                      <span className="text-xs font-medium">
                        Enhancement Failed
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

        {/* Input & Button Row */}
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
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={1}
              disabled={true}
              className="flex-grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-[54px] cursor-not-allowed select-none"
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
                    <Wand2 className="h-4 w-4" />
                    <span className="text-xs font-semibold whitespace-nowrap">
                      2 Coins
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

export default SkinEnhancerPage;
