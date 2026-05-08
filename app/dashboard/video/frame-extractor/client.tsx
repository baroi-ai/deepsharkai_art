"use client";

import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sparkles,
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Frame,
  Film,
  Camera,
  Settings2,
  Cpu, // ✅ Imported Cpu Icon
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
} from "@/components/ui/dialog";

// --- Types ---
interface ExtractedFrame {
  id: string;
  label: string;
  url: string;
}

const FrameExtractorPage = () => {
  // State
  const [sourceVideoFile, setSourceVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // Device Detection

  // Mode Switch State
  const [extractionMode, setExtractionMode] = useState<"auto" | "custom">(
    "auto",
  );
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const customVideoRef = useRef<HTMLVideoElement>(null);

  // --- Effect: Detect Mobile ---
  useEffect(() => {
    const checkMobile = () => {
      const userAgent =
        typeof window.navigator === "undefined" ? "" : navigator.userAgent;
      const mobile = Boolean(
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        ) || window.innerWidth < 768,
      );
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // --- Handlers ---

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // LIMIT 1: File Size (100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size cannot exceed 100MB (Browser Limit).");
        return;
      }
      setSourceVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      setExtractedFrames([]);
      e.target.value = "";
    }
  };

  const clearVideo = () => {
    setSourceVideoFile(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoPreviewUrl(null);
    setExtractedFrames([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Zero-Cost Client-Side Capture
  const captureFrame = (video: HTMLVideoElement): string => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  // --- Logic: Auto Extract ---
  const handleAutoExtract = async () => {
    if (!sourceVideoFile || !videoRef.current) return;

    setIsLoading(true);
    toast.info("Extracting frames on device...");

    const video = videoRef.current;

    // Safety check for duration
    if (isNaN(video.duration)) {
      toast.error("Video not loaded yet.");
      setIsLoading(false);
      return;
    }

    try {
      const frames: ExtractedFrame[] = [];
      const duration = video.duration;

      // First
      video.currentTime = 0.1;
      await new Promise((r) => (video.onseeked = r));
      frames.push({
        id: "first",
        label: "First Frame",
        url: captureFrame(video),
      });

      // Mid
      video.currentTime = duration / 2;
      await new Promise((r) => (video.onseeked = r));
      frames.push({
        id: "mid",
        label: "Middle Frame",
        url: captureFrame(video),
      });

      // Last
      video.currentTime = Math.max(0, duration - 0.1);
      await new Promise((r) => (video.onseeked = r));
      frames.push({
        id: "last",
        label: "Last Frame",
        url: captureFrame(video),
      });

      setExtractedFrames(frames);
      toast.success("Frames extracted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to extract frames.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Logic: Custom Extract ---
  const openCustomExtractor = () => {
    if (!sourceVideoFile) {
      toast.error("Please upload a video first.");
      return;
    }
    setIsCustomModalOpen(true);
  };

  const handleCustomCapture = () => {
    if (!customVideoRef.current) return;
    const video = customVideoRef.current;
    const currentTime = video.currentTime;
    const frameUrl = captureFrame(video);
    const label = `Time: ${currentTime.toFixed(2)}s`;

    setExtractedFrames((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label, url: frameUrl },
    ]);
    toast.success("Frame Captured!");
  };

  // Main Button Handler
  const handleGenerateClick = () => {
    if (extractionMode === "auto") {
      handleAutoExtract();
    } else {
      openCustomExtractor();
    }
  };

  const handleDownload = (imageUrl: string, label: string) => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `frame-${label
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* Hidden Video for Auto-Logic & Validation */}
      {videoPreviewUrl && (
        <video
          ref={videoRef}
          src={videoPreviewUrl}
          className="hidden"
          crossOrigin="anonymous"
          preload="metadata"
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            // LIMIT 2: Dynamic Duration Check
            const timeLimit = isMobile ? 300 : 600; // 5 mins Mobile, 10 mins Desktop

            if (video.duration > timeLimit) {
              const limitText = isMobile ? "5 minutes" : "10 minutes";
              toast.error(`Video exceeds ${limitText} limit on this device.`);
              clearVideo();
              return;
            }
            video.currentTime = 0;
          }}
          onError={() => {
            toast.error("Error loading video format.");
            clearVideo();
          }}
        />
      )}

      {/* 1. MAIN PREVIEW AREA */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 pb-40 flex flex-col justify-start min-h-[60vh]">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* Empty State */}
          {extractedFrames.length === 0 && !videoPreviewUrl && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-20 max-w-md w-full">
              <Frame className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Video Frame Extractor
              </h1>
              <p className="text-gray-500 mb-6">
                Upload a video to extract frames.
              </p>

              {/* ✅ ADDED: Teal Info Box */}
              <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-teal-300">
                    <Cpu className="h-5 w-5" />
                    <p className="text-sm font-medium">Running Locally</p>
                  </div>
                  <p className="text-xs text-teal-200/70 leading-relaxed">
                    100% Private. Runs entirely on your device using browser
                    acceleration. No images leave your browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Video Preview (Before Extraction) */}
          {extractedFrames.length === 0 && videoPreviewUrl && (
            <div className="animate-in fade-in duration-500 relative group w-fit h-auto mt-10">
              <video
                src={videoPreviewUrl}
                controls
                className="max-h-[50vh] max-w-full w-auto rounded-lg shadow-2xl border border-gray-700"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={clearVideo}
                className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Results Grid */}
          {extractedFrames.length > 0 && (
            <div className="w-full mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-400">
                  Extracted Frames ({extractedFrames.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExtractedFrames([])}
                  className="text-red-400 hover:text-red-300"
                >
                  Clear Results
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {extractedFrames.map((frame) => (
                  <div
                    key={frame.id}
                    className="flex flex-col gap-2 animate-in fade-in zoom-in duration-500"
                  >
                    <div className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-900/50 py-1 rounded">
                      {frame.label}
                    </div>
                    <div className="relative group w-full aspect-video rounded-lg overflow-hidden border border-gray-700 bg-black/50">
                      <img
                        src={frame.url}
                        alt={frame.label}
                        className="w-full h-full object-contain"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownload(frame.url, frame.label)}
                        className="absolute bottom-2 right-2 z-10 h-8 w-8 rounded-full bg-black/60 text-white border border-white/20 hover:bg-black/80"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM CONTROL BAR */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-2">
          {/* SWITCH ROW */}
          <div className="flex items-center justify-center gap-3 px-2 mb-1">
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${
                extractionMode === "auto" ? "text-teal-400" : "text-gray-600"
              }`}
            >
              Auto
            </span>
            <Switch
              checked={extractionMode === "custom"}
              onCheckedChange={(c: boolean) =>
                setExtractionMode(c ? "custom" : "auto")
              }
              // Switch color matches Teal theme
              className="bg-gray-700 data-[state=checked]:bg-cyan-500 border-2 border-transparent"
            />
            <span
              className={`text-[10px] uppercase font-bold tracking-wider ${
                extractionMode === "custom" ? "text-teal-400" : "text-gray-600"
              }`}
            >
              Custom
            </span>
          </div>

          {/* Input Bar */}
          <div className="w-full p-1 rounded-xl flex items-start gap-3">
            {/* Upload Button */}
            <div className="flex-shrink-0 relative">
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
                disabled={isLoading}
              />
              <Label
                onClick={() => fileInputRef.current?.click()}
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${
                    videoPreviewUrl ? "border-cyan-500 text-cyan-500" : ""
                  }`,
                })}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>

            {/* Prompt Box Container */}
            <div className="flex-grow relative flex items-center">
              <Textarea
                disabled={true}
                value={
                  isMobile
                    ? "Upload"
                    : extractionMode === "auto"
                      ? "Extracts Frames"
                      : "Select Frames"
                }
                className="flex-grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-[54px] cursor-not-allowed select-none"
                rows={1}
              />

              {/* Generate Button */}
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                <Button
                  onClick={handleGenerateClick}
                  disabled={isLoading || !videoPreviewUrl}
                  // Unified Teal Gradient
                  className={`h-9 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                    isLoading || !videoPreviewUrl
                      ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {extractionMode === "auto" ? (
                        <Sparkles className="w-4 h-4" />
                      ) : (
                        <Settings2 className="w-4 h-4" />
                      )}
                      <span className="hidden md:inline font-semibold">
                        {extractionMode === "auto" ? "Extract" : "Customize"}
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

      {/* --- CUSTOM EXTRACTION MODAL --- */}
      <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
        <DialogContent className="border-white/10 bg-slate-900 text-gray-200 max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Frame className="w-5 h-5 text-teal-500" />
              Custom Frame Extractor
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Play the video to the desired moment and click "Capture Frame".
            </DialogDescription>
          </DialogHeader>

          {/* Video Player in Modal */}
          <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-gray-800">
            {videoPreviewUrl && (
              <video
                ref={customVideoRef}
                src={videoPreviewUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <DialogFooter className="flex items-center justify-between gap-4 mt-4">
            <div className="flex-grow text-xs text-gray-500">
              {extractedFrames.length} frames captured in this session.
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setIsCustomModalOpen(false)}
              >
                Done
              </Button>
              <Button
                onClick={handleCustomCapture}
                className="bg-teal-600 hover:bg-teal-500 text-white gap-2"
              >
                <Camera className="w-4 h-4" />
                Capture Frame
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FrameExtractorPage;
