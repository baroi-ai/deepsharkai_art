"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ImagePlus,
  Loader2,
  Download,
  UploadCloud,
  XCircle,
  Cpu,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// --- Helper for File Size Formatting ---
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

interface ConvertedImage {
  url: string;
  size: number;
  format: string;
  name: string;
}

// ✅ Added AVIF: The newest, most efficient web format natively supported by modern browsers!
const SUPPORTED_FORMATS = [
  { mime: "image/webp", label: "WEBP" },
  { mime: "image/jpeg", label: "JPEG" },
  { mime: "image/png", label: "PNG" },
  { mime: "image/avif", label: "AVIF" },
  { mime: "image/gif", label: "GIF" },
  { mime: "image/bmp", label: "BMP" },
];

const ImageConverterPage = () => {
  // State
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [convertedImage, setConvertedImage] = useState<ConvertedImage | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);

  // Conversion Settings
  const [targetFormat, setTargetFormat] = useState<string>("image/webp");
  const [quality, setQuality] = useState<number>(0.8);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Added AVIF to formats that support quality compression
  const supportsQuality =
    targetFormat === "image/jpeg" ||
    targetFormat === "image/webp" ||
    targetFormat === "image/avif";

  // Cleanup
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      if (convertedImage) URL.revokeObjectURL(convertedImage.url);
    };
  }, [imagePreviewUrl, convertedImage]);

  // --- Handlers ---
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // ✅ Strict 40MB limit to prevent browser/canvas crashing
      if (file.size > 40 * 1024 * 1024) {
        toast.error(
          "File size cannot exceed 40MB to ensure smooth local processing.",
        );
        return;
      }
      setSourceImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      setConvertedImage(null);
      e.target.value = "";
    }
  };

  const clearImage = () => {
    setSourceImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (convertedImage) URL.revokeObjectURL(convertedImage.url);
    setConvertedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- ZERO-COST CLIENT-SIDE CONVERSION LOGIC ---
  const handleConvert = () => {
    if (!sourceImageFile || !imagePreviewUrl) return;

    setIsLoading(true);
    toast.info("Converting on device...");

    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = imagePreviewUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      if (targetFormat === "image/jpeg" || targetFormat === "image/bmp") {
        ctx!.fillStyle = "#FFFFFF";
        ctx!.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx?.drawImage(img, 0, 0);

      let ext = targetFormat.split("/")[1];
      if (ext === "jpeg") ext = "jpg";

      const exportQuality = supportsQuality ? quality : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            toast.error(
              `Failed to convert. Your browser might not support ${ext.toUpperCase()} encoding.`,
            );
            setIsLoading(false);
            return;
          }

          const newUrl = URL.createObjectURL(blob);
          const baseName =
            sourceImageFile.name.substring(
              0,
              sourceImageFile.name.lastIndexOf("."),
            ) || "image";

          setConvertedImage({
            url: newUrl,
            size: blob.size,
            format: targetFormat,
            name: `${baseName}-converted.${ext}`,
          });

          toast.success("Conversion complete!");
          setIsLoading(false);
        },
        targetFormat,
        exportQuality,
      );
    };

    img.onerror = () => {
      toast.error("Failed to load image.");
      setIsLoading(false);
    };
  };

  const handleDownload = () => {
    if (!convertedImage) return;
    const link = document.createElement("a");
    link.href = convertedImage.url;
    link.download = convertedImage.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* 1. MAIN PREVIEW AREA */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 pb-40 flex flex-col justify-start min-h-[60vh]">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          {/* Empty State */}
          {!imagePreviewUrl && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-20 max-w-md w-full">
              <ImagePlus className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Converter & Compressor
              </h1>
              <p className="text-gray-500 mb-6">
                Change formats and compress file sizes.
              </p>

              <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-teal-300">
                    <Cpu className="h-5 w-5" />
                    <p className="text-sm font-medium">Running Locally</p>
                  </div>
                  <p className="text-xs text-teal-200/70 leading-relaxed">
                    100% Private. Runs entirely on your device using browser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Image Preview / Result State */}
          {imagePreviewUrl && (
            <div className="w-full max-w-4xl mt-10 flex flex-col items-center gap-6">
              <div className="relative group w-fit h-auto animate-in fade-in duration-500">
                <img
                  src={convertedImage ? convertedImage.url : imagePreviewUrl}
                  alt="Preview"
                  className="max-h-[50vh] max-w-full w-auto object-contain rounded-lg shadow-2xl border border-gray-700 bg-black/50"
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

              {/* Stats & Download Card */}
              {convertedImage && sourceImageFile && (
                <div className="w-full max-w-md bg-gray-900/80 border border-gray-700 rounded-xl p-4 flex flex-col gap-4 shadow-xl animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col items-center p-2 bg-gray-800 rounded-lg w-[45%]">
                      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
                        Original
                      </span>
                      <span className="text-gray-300 font-mono">
                        {formatFileSize(sourceImageFile.size)}
                      </span>
                      <span className="text-gray-500 text-[10px] uppercase mt-0.5">
                        {sourceImageFile.type.split("/")[1]}
                      </span>
                    </div>

                    <ArrowRight className="w-5 h-5 text-teal-500/50" />

                    <div className="flex flex-col items-center p-2 bg-teal-950/30 border border-teal-900/50 rounded-lg w-[45%]">
                      <span className="text-teal-500/70 text-xs font-semibold uppercase tracking-wider mb-1">
                        Converted
                      </span>
                      <span className="text-teal-300 font-mono">
                        {formatFileSize(convertedImage.size)}
                      </span>
                      <span className="text-teal-500/70 text-[10px] uppercase mt-0.5">
                        {convertedImage.format.split("/")[1]}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleDownload}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. BOTTOM CONTROL BAR */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        {/* Settings Row */}
        <div className="flex items-center justify-center flex-wrap gap-x-6 gap-y-2 text-xs max-w-4xl mx-auto mb-3">
          {/* Format Selector */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Select
              value={targetFormat}
              onValueChange={setTargetFormat}
              disabled={isLoading}
            >
              <SelectTrigger className="bg-transparent border-none text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto text-xs pr-2">
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="top"
                className="bg-slate-950 border-white/10 text-gray-300"
              >
                {SUPPORTED_FORMATS.map((fmt) => (
                  <SelectItem key={fmt.mime} value={fmt.mime}>
                    <div className="flex items-center gap-2">
                      <span className="uppercase tracking-wider">
                        {fmt.label}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quality Slider */}
          <div
            className={`flex items-center gap-3 text-gray-400 transition-opacity duration-300 ${
              !supportsQuality
                ? "opacity-30 pointer-events-none"
                : "opacity-100"
            }`}
          >
            <Label className="text-xs font-normal">Quality:</Label>
            <div className="w-24 sm:w-32 flex items-center">
              <Slider
                min={0.1}
                max={1.0}
                step={0.05}
                value={[quality]}
                onValueChange={(v) => setQuality(v[0])}
                disabled={isLoading || !supportsQuality}
                className="w-full [&_[data-radix-slider-range]]:!bg-teal-500 [&_[role=slider]]:border-teal-500"
              />
            </div>
            <span className="w-6 text-right text-xs text-gray-200 font-medium select-none">
              {Math.round(quality * 100)}%
            </span>
          </div>
        </div>

        {/* Input Bar */}
        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-3">
          <div className="flex-shrink-0 relative">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageFileChange}
              className="hidden"
              disabled={isLoading}
            />
            <Label
              onClick={() => fileInputRef.current?.click()}
              className={buttonVariants({
                variant: "outline",
                size: "icon",
                className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-teal-500 hover:text-teal-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${
                  imagePreviewUrl ? "border-teal-500 text-teal-500" : ""
                }`,
              })}
            >
              <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
            </Label>
          </div>

          <div className="flex-grow relative flex items-center">
            <Textarea
              disabled={true}
              value={
                !imagePreviewUrl
                  ? "Upload an image"
                  : `Convert to ${targetFormat.split("/")[1].toUpperCase()}`
              }
              className="flex-grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 md:py-4 self-center min-h-[48px] md:min-h-[56px] cursor-not-allowed select-none"
              rows={1}
            />

            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
              <Button
                onClick={handleConvert}
                disabled={isLoading || !imagePreviewUrl}
                className={`h-9 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                  isLoading || !imagePreviewUrl
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden md:inline font-semibold">
                      Convert
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
  );
};

export default ImageConverterPage;
