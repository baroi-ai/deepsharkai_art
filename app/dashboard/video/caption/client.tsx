"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  AlertTriangle,
  UploadCloud,
  X,
  Cpu,
  Type,
  Settings2,
  Play,
  Pause,
  Download,
  ClosedCaption,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

const MAX_FILE_SIZE_DESKTOP_MB = 100;
const MAX_FILE_SIZE_MOBILE_MB = 60;
const MAX_DURATION_SEC = 60;

interface ChunkStyle {
  posX?: number;
  posY?: number;
  size?: number;
  rotation?: number;
  mainColor?: string;
  heroColor?: string;
  glowColor?: string;
  fontStyle?: string;
  layout?: string;
  animation?: string;
  glow?: number;
  sync?: number;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

interface TranscriptChunk {
  timestamp: [number, number];
  text: string;
  style?: ChunkStyle;
}

const formatSrtTime = (timeInSeconds: number) => {
  const pad = (num: number, size: number) => String(num).padStart(size, "0");
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(milliseconds, 3)}`;
};

export default function VideoCaptionerPage() {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(9 / 16);
  const [transcript, setTranscript] = useState<{
    text: string;
    chunks?: TranscriptChunk[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const [isEditing, setIsEditing] = useState(false);
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState(false);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [layout, setLayout] = useState("hormozi");
  const [fontStyle, setFontStyle] = useState("viral-italic");
  const [animation, setAnimation] = useState("pop");
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(71);
  const [size, setSize] = useState(30);
  const [rotation, setRotation] = useState(0);
  const [sync, setSync] = useState(0.15);
  const [glow, setGlow] = useState(0);
  const [mainColor, setMainColor] = useState("#FFFFFF");
  const [heroColor, setHeroColor] = useState("#39FF14");
  const [glowColor, setGlowColor] = useState("#000000");
  const [strokeEnabled, setStrokeEnabled] = useState(true);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(12);

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    return () => {
      if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    };
  }, [mediaSrc]);

  const resetResults = () => {
    setTranscript(null);
    setProgress("");
    setIsProcessing(false);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsEditing(false);
    setSelectedChunkIndex(null);
    setIsExporting(false);
  };

  const clearMedia = () => {
    setMediaFile(null);
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    setMediaSrc(null);
    resetResults();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadSRT = () => {
    if (!transcript || !transcript.chunks) return;

    let srtContent = "";
    transcript.chunks.forEach((chunk, index) => {
      const start = chunk.timestamp[0];
      const end = chunk.timestamp[1] !== null ? chunk.timestamp[1] : start + 2;

      srtContent += `${index + 1}\n`;
      srtContent += `${formatSrtTime(start)} --> ${formatSrtTime(end)}\n`;
      srtContent += `${chunk.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "captions.srt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SRT file downloaded!");
  };

  const handleExport = async () => {
    if (!videoRef.current || !transcript || !transcript.chunks) return;

    setIsExporting(true);
    toast.info("Rendering HD Video...", {
      description: "Applying crisp text rendering and high-bitrate encoding...",
    });

    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Your browser does not support Canvas rendering.");
      setIsExporting(false);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const canvasStream = canvas.captureStream(60);
    let mediaStream;
    try {
      mediaStream = (video as any).captureStream
        ? (video as any).captureStream()
        : (video as any).mozCaptureStream();
    } catch (e) {
      console.warn("Audio capture fallback triggered.");
    }

    if (mediaStream) {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length > 0) canvasStream.addTrack(audioTracks[0]);
    }

    let mimeType = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm";

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: mimeType,
      videoBitsPerSecond: 15000000,
    });

    const recordedChunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType.split(";")[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "viral-captioned-video.webm";
      a.click();
      URL.revokeObjectURL(url);

      setIsExporting(false);
      video.pause();
      toast.success("Export Complete! HD Video downloaded.");
    };

    video.currentTime = 0;
    await video.play();
    recorder.start();

    const domRect = video.getBoundingClientRect();
    const exportScale = canvas.width / (domRect.width || 340);

    const easeOutBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    let isExportActive = true;

    const drawLoop = (now: number, metadata: any) => {
      if (!isExportActive || video.paused || video.ended) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const t = metadata ? metadata.mediaTime : video.currentTime;

      const chunkIdx = transcript.chunks!.findIndex((c) => {
        const syncOffset = c.style?.sync ?? sync;
        const adjustedT = t + syncOffset;
        const end =
          c.timestamp[1] !== null ? c.timestamp[1] : c.timestamp[0] + 2;
        return adjustedT >= c.timestamp[0] && adjustedT < end;
      });

      if (chunkIdx !== -1) {
        const chunk = transcript.chunks![chunkIdx];
        const words = chunk.text
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0);

        if (words.length > 0) {
          const lLayout = chunk.style?.layout ?? layout;
          const lSize = chunk.style?.size ?? size;
          const lMainColor = chunk.style?.mainColor ?? mainColor;
          const lHeroColor = chunk.style?.heroColor ?? heroColor;
          const lGlowColor = chunk.style?.glowColor ?? glowColor;
          const lGlow = chunk.style?.glow ?? glow;
          const lPosX = chunk.style?.posX ?? posX;
          const lPosY = chunk.style?.posY ?? posY;
          const lRotation = chunk.style?.rotation ?? rotation;
          const syncOffset = chunk.style?.sync ?? sync;
          const lAnimation = chunk.style?.animation ?? animation;
          const lFontStyle = chunk.style?.fontStyle ?? fontStyle;

          const lStrokeEnabled = chunk.style?.strokeEnabled ?? strokeEnabled;
          const lStrokeColor = chunk.style?.strokeColor ?? strokeColor;
          const lStrokeWidth = chunk.style?.strokeWidth ?? strokeWidth;

          const start = chunk.timestamp[0];
          const end =
            chunk.timestamp[1] !== null ? chunk.timestamp[1] : start + 2;
          const timePerWord = (end - start) / words.length;

          let fontFace = "sans-serif";
          let isUppercase = true;
          let isItalic = false;

          if (lFontStyle === "apple-premium") {
            fontFace = "-apple-system, system-ui, sans-serif";
            isUppercase = false;
          } else if (lFontStyle === "viral-impact") {
            fontFace = "Impact, sans-serif";
          } else if (lFontStyle === "viral-italic") {
            fontFace = "'Montserrat', sans-serif";
            isItalic = true;
          } else if (lFontStyle === "cinematic") {
            fontFace = "Montserrat, sans-serif";
          } else if (lFontStyle === "futura-bold") {
            fontFace = "Futura, sans-serif";
          } else if (lFontStyle === "roboto-clean") {
            fontFace = "Roboto, sans-serif";
            isUppercase = false;
          } else if (lFontStyle === "gaming-bangers") {
            fontFace = "'Arial Black', sans-serif";
          } else if (lFontStyle === "comic-quirky") {
            fontFace = "'Comic Sans MS', sans-serif";
            isUppercase = false;
          } else if (lFontStyle === "komika-axis") {
            fontFace = "'Luckiest Guy', cursive";
          }

          const baseFontSize = lSize * exportScale;
          const cx = Math.round(canvas.width / 2 + lPosX * exportScale);
          const cy = Math.round(canvas.height / 2 + lPosY * exportScale);

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((lRotation * Math.PI) / 180);

          const getAnim = (timeSinceSpoken: number) => {
            if (timeSinceSpoken < 0)
              return { scale: 0, yOffset: 0, opacity: 0 };
            const animDuration = 0.35;
            const p = Math.min(timeSinceSpoken / animDuration, 1);
            let s = 1,
              y = 0,
              o = 1;
            if (p < 1) {
              if (lAnimation === "pop") {
                const e = easeOutCubic(p);
                s = 0.85 + 0.15 * e;
                y = 10 * (1 - e) * exportScale;
                o = p * 2;
              } else if (lAnimation === "spring") {
                const e = easeOutBack(p);
                s = 0.4 + 0.6 * e;
                y = 15 * (1 - e) * exportScale;
                o = p * 2;
              } else if (lAnimation === "slide-up") {
                const e = easeOutCubic(p);
                s = 1;
                y = 20 * (1 - e) * exportScale;
                o = p * 2;
              } else if (lAnimation === "fade") {
                s = 1;
                y = 0;
                o = p * 1.5;
              }
            }
            return { scale: s, yOffset: y, opacity: Math.min(o, 1) };
          };

          const drawText = (
            tText: string,
            offsetX: number,
            offsetY: number,
            isHero: boolean,
            anim: any,
            sizeScale: number,
          ) => {
            ctx.save();
            ctx.translate(offsetX, offsetY + anim.yOffset);
            ctx.scale(anim.scale * sizeScale, anim.scale * sizeScale);
            ctx.globalAlpha = anim.opacity;

            const fontStylePrefix = isItalic ? "italic " : "";
            const fontWeight = isHero
              ? "900"
              : lFontStyle === "cinematic"
                ? "500"
                : "700";
            ctx.font = `${fontStylePrefix}${fontWeight} ${baseFontSize}px ${fontFace}`;

            if (isHero) {
              ctx.shadowColor = lGlowColor;
              ctx.shadowBlur = lGlow * exportScale;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
            } else {
              ctx.shadowColor = "rgba(0,0,0,0.8)";
              ctx.shadowBlur = 3 * exportScale;
              ctx.shadowOffsetX = 1 * exportScale;
              ctx.shadowOffsetY = 1 * exportScale;
            }

            ctx.fillStyle = isHero ? lHeroColor : lMainColor;
            ctx.fillText(tText, 0, 0);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            if (lStrokeEnabled) {
              ctx.lineWidth = baseFontSize * (lStrokeWidth / 100);
              ctx.strokeStyle = lStrokeColor;
              ctx.lineJoin = "round";
              ctx.miterLimit = 2;
              ctx.strokeText(tText, 0, 0);
            }

            ctx.restore();
          };

          const measureTxt = (txt: string, isHero: boolean) => {
            const fontStylePrefix = isItalic ? "italic " : "";
            const fontWeight = isHero
              ? "900"
              : lFontStyle === "cinematic"
                ? "500"
                : "700";
            ctx.font = `${fontStylePrefix}${fontWeight} ${baseFontSize}px ${fontFace}`;
            return ctx.measureText(txt).width;
          };

          let wIndex = Math.floor((t + syncOffset - start) / timePerWord);
          if (wIndex < 0) wIndex = 0;
          if (wIndex >= words.length) wIndex = words.length - 1;

          if (lLayout === "hormozi") {
            let topWords: string[] = [];
            let midWord = "";
            let botWords: string[] = [];
            if (words.length === 1) {
              midWord = words[0];
            } else if (words.length === 2) {
              topWords = [words[0]];
              midWord = words[1];
            } // ✅ FIXED
            else if (words.length === 3) {
              topWords = [words[0], words[1]];
              midWord = words[2];
            } // ✅ FIXED
            else if (words.length === 4) {
              topWords = [words[0], words[1]];
              midWord = words[2];
              botWords = [words[3]];
            } // ✅ FIXED
            else {
              topWords = [words[0], words[1]];
              midWord = words[2];
              botWords = [words[3], words[4]];
            } // ✅ FIXED

            const topScale = 0.45;
            const midScale = 1.8;
            const botScale = 0.45;
            const gap = baseFontSize * 0.15;
            const ySpacing = baseFontSize * 0.9;

            const getTierWidth = (arr: string[], sc: number, hero: boolean) => {
              if (!arr.length) return 0;
              let w = 0;
              arr.forEach(
                (word) =>
                  (w +=
                    measureTxt(isUppercase ? word.toUpperCase() : word, hero) *
                    sc),
              );
              w += (arr.length - 1) * gap;
              return w;
            };

            const topW = getTierWidth(topWords, topScale, false);
            const midW = getTierWidth(midWord ? [midWord] : [], midScale, true);
            const botW = getTierWidth(botWords, botScale, false);

            const blockW = Math.max(topW, midW, botW);
            const blockLeft = -blockW / 2;
            const blockRight = blockW / 2;

            const renderTier = (
              arr: string[],
              sc: number,
              hero: boolean,
              startX: number,
              startIdx: number,
              tierY: number,
            ) => {
              let currX = startX;
              arr.forEach((w, idx) => {
                const absoluteIdx = startIdx + idx;
                if (wIndex >= absoluteIdx) {
                  const timeSinceSpoken =
                    t + syncOffset - (start + absoluteIdx * timePerWord);
                  const anim = getAnim(timeSinceSpoken);
                  const fw = isUppercase ? w.toUpperCase() : w;
                  const wWidth = measureTxt(fw, hero) * sc;
                  drawText(fw, currX + wWidth / 2, tierY, hero, anim, sc);
                  currX += wWidth + gap;
                }
              });
            };

            renderTier(topWords, topScale, false, blockLeft, 0, -ySpacing);
            if (midWord && wIndex >= topWords.length) {
              const timeSinceSpoken =
                t + syncOffset - (start + topWords.length * timePerWord);
              const fw = isUppercase ? midWord.toUpperCase() : midWord;
              drawText(fw, 0, 0, true, getAnim(timeSinceSpoken), midScale);
            }
            renderTier(
              botWords,
              botScale,
              false,
              blockRight - botW,
              topWords.length + (midWord ? 1 : 0),
              ySpacing,
            );
          } else {
            const spaceWidth = measureTxt(" ", false) * 0.4;
            const maxContainerWidth = canvas.width * 0.85;
            const lines: {
              text: string;
              isHero: boolean;
              sc: number;
              width: number;
              origIndex: number;
            }[][] = [];
            let currentLine: any[] = [];
            let currentLineWidth = 0;

            words.forEach((w, i) => {
              const isHero = lLayout === "one-word" ? true : i === wIndex;
              const sc = lLayout === "one-word" ? 1.4 : isHero ? 1.1 : 1.0;
              const fw = isUppercase ? w.toUpperCase() : w;
              const wWidth = measureTxt(fw, isHero) * sc;

              if (
                currentLineWidth + wWidth > maxContainerWidth &&
                currentLine.length > 0
              ) {
                lines.push([...currentLine]);
                currentLine = [];
                currentLineWidth = 0;
              }
              currentLine.push({
                text: fw,
                isHero,
                sc,
                width: wWidth,
                origIndex: i,
              });
              currentLineWidth += wWidth + spaceWidth;
            });
            if (currentLine.length > 0) lines.push(currentLine);

            const lineHeight = baseFontSize * 1.2;
            const startY = -((lines.length - 1) * lineHeight) / 2;

            lines.forEach((line, lineIdx) => {
              const totalLineWidth =
                line.reduce((sum, wordObj) => sum + wordObj.width, 0) +
                spaceWidth * (line.length - 1);
              let currentX = -totalLineWidth / 2;

              line.forEach((wordObj) => {
                if (wIndex >= wordObj.origIndex) {
                  const timeSinceSpoken =
                    t + syncOffset - (start + wordObj.origIndex * timePerWord);
                  drawText(
                    wordObj.text,
                    currentX + wordObj.width / 2,
                    startY + lineIdx * lineHeight,
                    wordObj.isHero,
                    getAnim(timeSinceSpoken),
                    wordObj.sc,
                  );
                }
                currentX += wordObj.width + spaceWidth;
              });
            });
          }
          ctx.restore();
        }
      }

      if ("requestVideoFrameCallback" in video) {
        (video as any).requestVideoFrameCallback(drawLoop);
      } else {
        requestAnimationFrame(() => drawLoop(0, null));
      }
    };

    if ("requestVideoFrameCallback" in video) {
      (video as any).requestVideoFrameCallback(drawLoop);
    } else {
      requestAnimationFrame(() => drawLoop(0, null));
    }

    video.onended = () => {
      isExportActive = false;
      recorder.stop();
    };
  };

  const formatTranscriptByLayout = (
    chunks: TranscriptChunk[],
    targetLayout: string,
  ) => {
    let wordsPerChunk = 4;
    if (targetLayout === "hormozi") wordsPerChunk = 5;
    if (targetLayout === "one-word") wordsPerChunk = 1;
    if (targetLayout === "two-words") wordsPerChunk = 2;
    if (targetLayout === "three-words") wordsPerChunk = 3;
    if (targetLayout === "classic") wordsPerChunk = 6;

    const allWords: { text: string; start: number; end: number }[] = [];

    chunks.forEach((chunk) => {
      const words = chunk.text
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (words.length === 0) return;
      const start = chunk.timestamp[0];
      const end =
        chunk.timestamp[1] !== null
          ? chunk.timestamp[1]
          : start + words.length * 0.5;
      const timePerWord = (end - start) / words.length;

      words.forEach((w, i) => {
        allWords.push({
          text: w,
          start: start + i * timePerWord,
          end: start + (i + 1) * timePerWord,
        });
      });
    });

    const newChunks: TranscriptChunk[] = [];
    for (let i = 0; i < allWords.length; i += wordsPerChunk) {
      const slice = allWords.slice(i, i + wordsPerChunk);
      newChunks.push({
        text: slice.map((w) => w.text).join(" "),
        timestamp: [slice[0].start, slice[slice.length - 1].end],
      });
    }
    return newChunks;
  };

  const getActiveStyle = (key: keyof ChunkStyle, globalValue: any) => {
    if (
      selectedChunkIndex !== null &&
      transcript?.chunks &&
      transcript.chunks[selectedChunkIndex]?.style?.[key] !== undefined
    ) {
      return transcript.chunks[selectedChunkIndex].style![key];
    }
    return globalValue;
  };

  const applyStyle = (
    key: keyof ChunkStyle,
    value: any,
    setGlobalState: Function,
  ) => {
    if (selectedChunkIndex !== null) {
      if (!transcript || !transcript.chunks) return;
      const updatedChunks = [...transcript.chunks];
      const currentChunk = updatedChunks[selectedChunkIndex];

      updatedChunks[selectedChunkIndex] = {
        ...currentChunk,
        style: {
          ...(currentChunk.style || {}),
          [key]: value,
        },
      };

      setTranscript({ ...transcript, chunks: updatedChunks });
    } else {
      setGlobalState(value);
      if (key === "layout" && transcript && transcript.chunks) {
        const newChunks = formatTranscriptByLayout(transcript.chunks, value);
        setTranscript({
          text: newChunks.map((c) => c.text).join(" "),
          chunks: newChunks,
        });
        setSelectedChunkIndex(null);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a valid video file.");
      return;
    }

    const isMobile = window.innerWidth <= 768;
    const limitMB = isMobile
      ? MAX_FILE_SIZE_MOBILE_MB
      : MAX_FILE_SIZE_DESKTOP_MB;
    const fileSizeMB = file.size / (1024 * 1024);

    if (fileSizeMB > limitMB) {
      toast.error(
        `File too large (${fileSizeMB.toFixed(1)}MB). Limit is ${limitMB}MB on this device to prevent browser crashes.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    resetResults();

    const url = URL.createObjectURL(file);
    const mediaElement = document.createElement("video");
    mediaElement.preload = "metadata";

    mediaElement.onloadedmetadata = () => {
      const width = mediaElement.videoWidth;
      const height = mediaElement.videoHeight;
      const ratio = width / height;
      setVideoAspectRatio(ratio);

      if (mediaElement.duration > MAX_DURATION_SEC) {
        toast.error(
          `Media too long (${mediaElement.duration.toFixed(0)}s). Limit is ${MAX_DURATION_SEC}s.`,
        );
        URL.revokeObjectURL(url);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setMediaFile(file);
        setMediaSrc(url);
        setDuration(mediaElement.duration);
      }
    };

    mediaElement.onerror = () => {
      toast.error("Invalid video file.");
      URL.revokeObjectURL(url);
    };

    mediaElement.src = url;
  };

  const handleTranscribe = async () => {
    if (!mediaFile) return;

    setIsProcessing(true);
    setProgress("Initializing...");

    try {
      setProgress("Extracting audio...");
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const arrayBuffer = await mediaFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const rawAudio = audioBuffer.getChannelData(0);

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("./transcribe.worker.ts", import.meta.url),
          { type: "module" },
        );

        workerRef.current.onmessage = (e) => {
          const { status, result, error, message } = e.data;

          if (status === "downloading")
            setProgress(message || "Downloading AI...");
          if (status === "processing") setProgress("Transcribing...");
          if (status === "success") {
            const formattedChunks = formatTranscriptByLayout(
              result.chunks || [],
              layout,
            );
            setTranscript({
              text: formattedChunks.map((c) => c.text).join(" "),
              chunks: formattedChunks,
            });
            setIsProcessing(false);
            setProgress("Done!");
            toast.success("Transcription complete!");
          }

          if (status === "error") {
            console.error(error);
            setIsProcessing(false);
            toast.error("AI Error: " + error);
          }
        };
      }

      workerRef.current.postMessage({ audio: rawAudio });
    } catch (err) {
      console.error(err);
      toast.error("Failed to process media file.");
      setIsProcessing(false);
    }
  };

  const handleChunkEdit = (index: number, newText: string) => {
    if (!transcript || !transcript.chunks) return;
    const updatedChunks = [...transcript.chunks];
    updatedChunks[index] = { ...updatedChunks[index], text: newText };
    setTranscript({
      text: updatedChunks.map((c) => c.text).join(" "),
      chunks: updatedChunks,
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!transcript || !transcript.chunks) return;

      const target = e.currentTarget;
      const cursorPosition = target.selectionStart;
      const currentText = transcript.chunks[index].text;

      const textBefore = currentText.slice(0, cursorPosition).trim();
      const textAfter = currentText.slice(cursorPosition).trim();

      if (!textBefore || !textAfter) return;

      const updatedChunks = [...transcript.chunks];
      const currentChunk = updatedChunks[index];

      const start = currentChunk.timestamp[0];
      const end =
        currentChunk.timestamp[1] !== null
          ? currentChunk.timestamp[1]
          : start + 2;
      const duration = end - start;
      const ratio = textBefore.length / currentText.length;
      const splitTime = start + duration * ratio;

      updatedChunks[index] = {
        ...currentChunk,
        text: textBefore,
        timestamp: [start, splitTime],
      };

      updatedChunks.splice(index + 1, 0, {
        text: textAfter,
        timestamp: [splitTime, end],
        style: currentChunk.style,
      });

      setTranscript({
        text: updatedChunks.map((c) => c.text).join(" "),
        chunks: updatedChunks,
      });

      setTimeout(() => {
        const textareas = document.querySelectorAll(".transcript-textarea");
        if (textareas[index + 1]) {
          (textareas[index + 1] as HTMLTextAreaElement).focus();
        }
      }, 50);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && !isExporting)
      setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current && !isExporting) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
  };

  const { activeChunk, wordIndex, words, activeChunkIndex } = useMemo(() => {
    if (!transcript?.chunks)
      return {
        activeChunk: null,
        wordIndex: -1,
        words: [],
        activeChunkIndex: -1,
      };

    const adjustedTime = currentTime + sync;

    const chunkIdx = transcript.chunks.findIndex((c) => {
      const end = c.timestamp[1] !== null ? c.timestamp[1] : c.timestamp[0] + 2;
      return adjustedTime >= c.timestamp[0] && adjustedTime < end;
    });

    if (chunkIdx === -1)
      return {
        activeChunk: null,
        wordIndex: -1,
        words: [],
        activeChunkIndex: -1,
      };

    const chunk = transcript.chunks[chunkIdx];
    const chunkWords = chunk.text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);

    if (chunkWords.length === 0)
      return {
        activeChunk: chunk,
        wordIndex: 0,
        words: [],
        activeChunkIndex: chunkIdx,
      };

    const start = chunk.timestamp[0];
    const end = chunk.timestamp[1] !== null ? chunk.timestamp[1] : start + 2;
    const duration = end - start;
    const timePerWord = duration / Math.max(1, chunkWords.length);

    const elapsed = adjustedTime - start;
    let wIndex = Math.floor(elapsed / timePerWord);
    if (wIndex < 0) wIndex = 0;
    if (wIndex >= chunkWords.length) wIndex = chunkWords.length - 1;

    return {
      activeChunk: chunk,
      wordIndex: wIndex,
      words: chunkWords,
      activeChunkIndex: chunkIdx,
    };
  }, [transcript, currentTime, sync]);

  useEffect(() => {
    if (
      !isEditing &&
      activeChunkIndex !== -1 &&
      transcriptRef.current &&
      !isExporting
    ) {
      const container = transcriptRef.current;
      const activeEl = container.children[activeChunkIndex] as HTMLElement;
      if (activeEl) {
        const offsetTop = activeEl.offsetTop;
        const scrollPosition =
          offsetTop - container.clientHeight / 2 + activeEl.clientHeight / 2;
        container.scrollTo({ top: scrollPosition, behavior: "smooth" });
      }
    }
  }, [activeChunkIndex, isEditing, isExporting]);

  const activePosX = activeChunk?.style?.posX ?? posX;
  const activePosY = activeChunk?.style?.posY ?? posY;
  const activeSize = activeChunk?.style?.size ?? size;
  const activeRotation = activeChunk?.style?.rotation ?? rotation;
  const activeGlow = activeChunk?.style?.glow ?? glow;
  const activeMainColor = activeChunk?.style?.mainColor ?? mainColor;
  const activeHeroColor = activeChunk?.style?.heroColor ?? heroColor;
  const activeGlowColor = activeChunk?.style?.glowColor ?? glowColor;
  const activeFontStyle = activeChunk?.style?.fontStyle ?? fontStyle;
  const activeAnimation = activeChunk?.style?.animation ?? animation;
  const activeLayout = activeChunk?.style?.layout ?? layout;

  const lStrokeEnabled = activeChunk?.style?.strokeEnabled ?? strokeEnabled;
  const lStrokeColor = activeChunk?.style?.strokeColor ?? strokeColor;
  const lStrokeWidth = activeChunk?.style?.strokeWidth ?? strokeWidth;

  const getActivePremiumFontStyles = () => {
    switch (activeFontStyle) {
      case "apple-premium":
        return {
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
          fontWeight: 900,
          textTransform: "none" as const,
          letterSpacing: "-0.04em",
          textShadow: `0px 4px ${activeGlow}px ${activeGlowColor}, 0px 8px 32px rgba(0,0,0,0.5)`,
        };
      case "viral-impact":
        return {
          fontFamily: "Impact, sans-serif",
          fontWeight: 900,
          textTransform: "uppercase" as const,
          letterSpacing: "0.02em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `0.08em 0.08em 0px black, 0 0 ${activeGlow}px ${activeGlowColor}`,
        };
      case "viral-italic":
        return {
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 900,
          fontStyle: "italic",
          textTransform: "uppercase" as const,
          letterSpacing: "0.02em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `0 0 ${activeGlow}px ${activeGlowColor}`,
        };
      case "cinematic":
        return {
          fontFamily: "'Montserrat', 'Helvetica Neue', sans-serif",
          fontWeight: 500,
          textTransform: "uppercase" as const,
          letterSpacing: "0.15em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `0px 2px ${activeGlow}px ${activeGlowColor}`,
        };
      case "futura-bold":
        return {
          fontFamily: "'Futura', 'Trebuchet MS', sans-serif",
          fontWeight: 800,
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `2px 2px 0px black, 0 0 ${activeGlow}px ${activeGlowColor}`,
        };
      case "roboto-clean":
        return {
          fontFamily: "'Roboto', 'Segoe UI', sans-serif",
          fontWeight: 600,
          textTransform: "none" as const,
          letterSpacing: "0em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `1px 1px 4px rgba(0,0,0,0.8), 0 0 ${activeGlow}px ${activeGlowColor}`,
        };
      case "gaming-bangers":
        return {
          fontFamily: "'Arial Black', 'Bangers', sans-serif",
          fontWeight: 900,
          textTransform: "uppercase" as const,
          letterSpacing: "0.02em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `0.1em 0.1em 0px black, 0 0 ${activeGlow}px ${activeGlowColor}`,
        };
      case "comic-quirky":
        return {
          fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif",
          fontWeight: 700,
          textTransform: "none" as const,
          letterSpacing: "0em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `2px 2px 0px black, 0 0 ${activeGlow}px ${activeGlowColor}`,
        };
      case "komika-axis":
        return {
          fontFamily: "'Luckiest Guy', cursive",
          fontWeight: 400,
          textTransform: "uppercase" as const,
          letterSpacing: "0.05em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `0.1em 0.1em 0px black, 0 0 ${activeGlow}px ${activeGlowColor}`,
        };
      default:
        return {
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          textTransform: "uppercase" as const,
          letterSpacing: "0em",
          WebkitTextStroke: lStrokeEnabled
            ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
            : "0px",
          textShadow: `0 0 ${activeGlow}px ${activeGlowColor}`,
        };
    }
  };

  const { WebkitTextStroke, textShadow, ...baseFontStyles } =
    getActivePremiumFontStyles();

  if (!transcript) {
    return (
      <div className="flex flex-col h-full text-gray-300">
        <div className="grow overflow-y-auto p-4 md:p-6 pb-40 flex flex-col justify-start min-h-[60vh]">
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
            {!mediaFile && (
              <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-20 max-w-md w-full">
                <ClosedCaption className="h-20 w-20 mb-6 opacity-30" />
                <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                  AI Video Captioner
                </h1>
                <p className="text-gray-500 mb-6">
                  Automatically generate synced captions for short videos.
                </p>

                <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2 mb-6">
                  <div className="space-y-1 text-center">
                    <div className="flex items-center justify-center gap-2 text-teal-300">
                      <Cpu className="h-5 w-5" />
                      <p className="text-sm font-medium">Running Locally</p>
                    </div>
                    <p className="text-xs text-teal-200/70 leading-relaxed">
                      100% Private. Runs entirely on your device. Free Forever.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {mediaSrc && (
              <div className="w-full max-w-sm animate-in fade-in zoom-in duration-500">
                <div className="relative group rounded-xl overflow-hidden border border-gray-700 bg-black shadow-2xl flex flex-col items-center justify-center min-h-50">
                  <video
                    src={mediaSrc}
                    className="w-full h-auto max-h-[60vh] object-contain"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={clearMedia}
                    disabled={isProcessing}
                    className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-3 bg-yellow-950/30 border border-yellow-800/50 p-4 rounded-lg max-w-md animate-pulse">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <div className="text-sm text-yellow-200/80">
                  <p className="font-semibold text-yellow-500">
                    Processing locally
                  </p>
                  <p className="text-xs">
                    Generating precise word-level timestamps...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full px-4 pb-4 pt-2 bg-transparent z-10">
          <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-3">
            <div className="shrink-0 relative">
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing}
              />
              <Label
                onClick={() => fileInputRef.current?.click()}
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: `cursor-pointer h-12 w-12 md:h-14 md:w-14 flex flex-col items-center justify-center text-xs hover:border-teal-500 hover:text-teal-400 border-gray-700 bg-gray-800/50 rounded-lg transition-all ${mediaSrc ? "border-teal-500 text-teal-500" : ""}`,
                })}
              >
                <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
              </Label>
            </div>
            <div className="grow relative flex items-center">
              <Textarea
                disabled={true}
                value={
                  isProcessing
                    ? `${progress}`
                    : mediaFile
                      ? "Generate."
                      : "Upload"
                }
                className="grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-13.5 cursor-not-allowed select-none focus:ring-0"
                rows={1}
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                <Button
                  onClick={handleTranscribe}
                  disabled={!mediaFile || isProcessing}
                  className={`h-9 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${!mediaFile || isProcessing ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-linear-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"}`}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Free"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @import url('https://fonts.googleapis.com/css2?family=Luckiest+Guy&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,900;1,900&display=swap');

        @keyframes caption-pop { 0% { transform: scale(0.85) translateY(10px); opacity: 0; } 50% { transform: scale(1.02) translateY(-1px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes caption-spring { 0% { transform: scale(0.4) translateY(15px); opacity: 0; } 60% { transform: scale(1.2) translateY(-2px); opacity: 1; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
        @keyframes caption-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes caption-slide-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .animate-caption-pop { animation: caption-pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; display: inline-block; will-change: transform, opacity; }
        .animate-caption-spring { animation: caption-spring 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; display: inline-block; will-change: transform, opacity; }
        .animate-caption-fade { animation: caption-fade 0.2s ease-in forwards; display: inline-block; will-change: opacity; }
        .animate-caption-slide-up { animation: caption-slide-up 0.25s ease-out forwards; display: inline-block; will-change: transform, opacity; }
      `,
        }}
      />

      <div className="flex flex-col lg:flex-row w-full h-[calc(100vh-64px)] text-gray-200 overflow-hidden bg-transparent">
        <div className="w-full h-[45%] lg:h-full lg:flex-1 flex flex-col items-center justify-center relative border-b border-white/5 lg:border-b-0 shrink-0">
          <div
            className="relative h-full max-h-[40vh] lg:max-h-[65vh] max-w-full bg-black rounded-2xl lg:rounded-4xl border border-white/10 shadow-2xl overflow-hidden group"
            style={{ aspectRatio: videoAspectRatio }}
          >
            <video
              ref={videoRef}
              src={mediaSrc || ""}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnd}
              className="w-full h-full object-cover"
              playsInline
            />

            {isExporting && (
              <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-teal-500 mb-4" />
                <h3 className="text-white font-bold text-lg animate-pulse">
                  Rendering Video...
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  Do not close this tab
                </p>
              </div>
            )}

            <div
              className={`absolute inset-0 flex items-center justify-center pointer-events-none ${isExporting ? "opacity-0" : "opacity-100"}`}
            >
              <div
                style={{
                  transform: `translate(${activePosX}px, ${activePosY}px) rotate(${activeRotation}deg)`,
                  fontSize: `${activeSize}px`,
                  lineHeight: 1,
                }}
                className="w-[85%] flex justify-center items-center"
              >
                {activeChunk &&
                  words.length > 0 &&
                  (() => {
                    if (activeLayout === "hormozi") {
                      let topWords: string[] = [];
                      let middleWord: string[] = [];
                      let bottomWords: string[] = [];
                      if (words.length === 1) {
                        middleWord = [words[0]];
                      } else if (words.length === 2) {
                        topWords = [words[0]];
                        middleWord = [words[1]];
                      } else if (words.length === 3) {
                        topWords = [words[0], words[1]];
                        middleWord = [words[2]];
                      } else if (words.length === 4) {
                        topWords = [words[0], words[1]];
                        middleWord = [words[2]];
                        bottomWords = [words[3]];
                      } else {
                        topWords = [words[0], words[1]];
                        middleWord = [words[2]];
                        bottomWords = [words[3], words[4]];
                      }

                      const renderWord = (
                        word: string,
                        absoluteIndex: number,
                        isHero: boolean = false,
                      ) => {
                        const isSpoken = wordIndex >= absoluteIndex;
                        return (
                          <span
                            key={`${activeChunk.timestamp[0]}-${absoluteIndex}-${isSpoken}`}
                            className={
                              isSpoken
                                ? `animate-caption-${activeAnimation}`
                                : ""
                            }
                            style={{
                              ...baseFontStyles,
                              color: isHero ? activeHeroColor : activeMainColor,
                              fontSize: isHero ? `1.8em` : `0.45em`,
                              opacity: isSpoken ? 1 : 0,
                              transition: "all 0.25s ease-out",
                              WebkitTextStroke:
                                isHero || lStrokeEnabled
                                  ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
                                  : "0px",
                              textShadow: isHero
                                ? textShadow
                                : `1px 1px 3px rgba(0,0,0,0.8)`,
                            }}
                          >
                            {word}
                          </span>
                        );
                      };

                      return (
                        <div
                          className="inline-flex flex-col relative"
                          style={{ gap: "0.05em", lineHeight: 1 }}
                        >
                          {topWords.length > 0 && (
                            <div className="flex gap-[0.3em] self-start z-0">
                              {topWords.map((word, i) =>
                                renderWord(word, i, false),
                              )}
                            </div>
                          )}
                          {middleWord.length > 0 && (
                            <div
                              className="flex z-10 relative self-center"
                              style={{ lineHeight: 1 }}
                            >
                              {middleWord.map((word, i) =>
                                renderWord(word, topWords.length + i, true),
                              )}
                            </div>
                          )}
                          {bottomWords.length > 0 && (
                            <div className="flex gap-[0.3em] self-end z-0">
                              {bottomWords.map((word, i) =>
                                renderWord(
                                  word,
                                  topWords.length + middleWord.length + i,
                                  false,
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        className="flex flex-wrap justify-center items-center"
                        style={{ gap: "0.4em" }}
                      >
                        {words.map((word, i) => {
                          const isSpoken = wordIndex >= i;
                          const isHero =
                            activeLayout === "one-word"
                              ? true
                              : i === wordIndex;
                          return (
                            <span
                              key={`${activeChunk.timestamp[0]}-${i}-${isSpoken}`}
                              className={
                                isSpoken
                                  ? `animate-caption-${activeAnimation}`
                                  : ""
                              }
                              style={{
                                ...baseFontStyles,
                                color: isHero
                                  ? activeHeroColor
                                  : activeMainColor,
                                fontSize:
                                  activeLayout === "one-word"
                                    ? `1.4em`
                                    : isHero
                                      ? `1.1em`
                                      : `1em`,
                                opacity: isSpoken ? 1 : 0,
                                transition: "all 0.25s ease-out",
                                WebkitTextStroke:
                                  isHero || lStrokeEnabled
                                    ? `${lStrokeWidth * 0.01}em ${lStrokeColor}`
                                    : "0px",
                                textShadow: isHero
                                  ? textShadow
                                  : "1px 1px 3px rgba(0,0,0,0.6)",
                              }}
                            >
                              {word}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
              </div>
            </div>

            {!isExporting && (
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={clearMedia}
                  className="absolute top-3 right-3 lg:top-4 lg:right-4 bg-black/50 hover:bg-black/80 rounded-full p-2 text-white transition"
                >
                  <X className="w-3 h-3 lg:w-4 lg:h-4" />
                </button>
                <button
                  onClick={togglePlay}
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-xl p-3 lg:p-4 text-white backdrop-blur-sm transition shadow-lg"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 lg:w-8 lg:h-8" />
                  ) : (
                    <Play className="w-6 h-6 lg:w-8 lg:h-8 ml-1" />
                  )}
                </button>
              </div>
            )}

            <div className="absolute bottom-2 right-2 lg:bottom-4 lg:right-4 z-50">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className={`h-7 lg:h-9 px-3 lg:px-4 text-white rounded-full shadow-lg flex items-center gap-1.5 transition-transform active:scale-95 border ${isExporting ? "bg-gray-800 border-gray-600 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-400 shadow-teal-500/20 border-teal-400/50"}`}
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span className="text-[10px] lg:text-xs font-bold hidden sm:inline">
                  {isExporting ? "Exporting..." : "Export"}
                </span>
              </Button>
            </div>
          </div>

          {/* Timeline Slider */}
          <div className="w-full max-w-70 mt-4 lg:mt-6 flex items-center gap-3">
            <span className="text-[10px] lg:text-xs text-gray-400 font-mono w-8">
              {currentTime.toFixed(1)}s
            </span>
            <Slider
              disabled={isExporting}
              min={0}
              max={duration || 100}
              step={0.1}
              value={[currentTime]}
              onValueChange={handleSeek}
              className="grow **:data-radix-slider-range:bg-white **:[[role=slider]]:bg-white **:[[role=slider]]:border-white **:[[role=slider]]:w-3 lg:**:[[role=slider]]:w-4 **:[[role=slider]]:h-3 lg:**:[[role=slider]]:h-4"
            />
            <span className="text-[10px] lg:text-xs text-gray-400 font-mono w-8 text-right">
              {duration.toFixed(1)}s
            </span>
          </div>
        </div>

        {/* 🌟 RIGHT COLUMN: STYLE LAB 🌟 */}
        <div
          className={`h-[55%] lg:h-full w-full lg:w-112.5 shrink-0 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto scrollbar-hide bg-black/40 backdrop-blur-xl border-l border-white/5 z-10 shadow-2xl relative ${isExporting ? "opacity-50 pointer-events-none" : ""}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-white tracking-wide">
              <Settings2
                className={`w-4 h-4 lg:w-5 lg:h-5 ${selectedChunkIndex !== null ? "text-purple-500" : "text-teal-400"}`}
              />
              Style Lab
            </div>
            {selectedChunkIndex !== null ? (
              <button
                onClick={() => setSelectedChunkIndex(null)}
                className="text-[10px] lg:text-xs text-red-500 hover:text-red-400 font-medium px-3 py-1.5 bg-red-500/10 rounded-full transition-colors"
              >
                Deselect Line
              </button>
            ) : (
              <span
                className={`text-[9px] lg:text-[10px] uppercase tracking-widest font-semibold px-3 py-1 lg:px-4 lg:py-1.5 rounded-full text-teal-400 bg-teal-500/10 border border-teal-500/30`}
              >
                Global Settings
              </span>
            )}
          </div>

          {selectedChunkIndex !== null && (
            <div className="flex justify-center items-center mb-6 border-b border-white/5 pb-4">
              <span
                className={`text-[10px] uppercase tracking-widest font-semibold px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/50`}
              >
                Editing Line {selectedChunkIndex + 1} ONLY
              </span>
            </div>
          )}

          {/* 🌟 COMPACT 3-COLUMN DROPDOWNS 🌟 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
            <div>
              <Label className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 block truncate">
                Layout
              </Label>
              <Select
                value={getActiveStyle("layout", layout)}
                onValueChange={(v) => applyStyle("layout", v, setLayout)}
              >
                <SelectTrigger className="bg-black/50 border-white/10 text-gray-200 h-8 sm:h-9 text-[10px] sm:text-xs hover:border-white/20 px-2 sm:px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-gray-300 text-xs">
                  <SelectItem value="hormozi">Hormozi</SelectItem>
                  <SelectItem value="one-word">1 Word</SelectItem>
                  <SelectItem value="two-words">2 Words</SelectItem>
                  <SelectItem value="three-words">3 Words</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 block truncate">
                Font
              </Label>
              <Select
                value={getActiveStyle("fontStyle", fontStyle)}
                onValueChange={(v) => applyStyle("fontStyle", v, setFontStyle)}
              >
                <SelectTrigger className="bg-black/50 border-white/10 text-gray-200 h-8 sm:h-9 text-[10px] sm:text-xs hover:border-white/20 px-2 sm:px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-gray-300 text-xs">
                  <SelectItem value="apple-premium">Apple</SelectItem>
                  <SelectItem value="viral-impact">Impact</SelectItem>
                  <SelectItem value="viral-italic">Viral Italic</SelectItem>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="futura-bold">Bold</SelectItem>
                  <SelectItem value="roboto-clean">Clean</SelectItem>
                  <SelectItem value="gaming-bangers">Gaming</SelectItem>
                  <SelectItem value="comic-quirky">Quirky</SelectItem>
                  <SelectItem value="komika-axis">Komika Style</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 block truncate">
                Animate
              </Label>
              <Select
                value={getActiveStyle("animation", animation)}
                onValueChange={(v) => applyStyle("animation", v, setAnimation)}
              >
                <SelectTrigger className="bg-black/50 border-white/10 text-gray-200 h-8 sm:h-9 text-[10px] sm:text-xs hover:border-white/20 px-2 sm:px-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-gray-300 text-xs">
                  <SelectItem value="slide-up">Slide Up</SelectItem>
                  <SelectItem value="pop">Smooth Pop</SelectItem>
                  <SelectItem value="spring">Spring</SelectItem>
                  <SelectItem value="fade">Fade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Adjustments Panel */}
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 lg:p-5 mb-8 shadow-inner">
            <div className="flex items-center gap-2 text-[9px] lg:text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-4 lg:mb-6">
              <Settings2 className="w-3 h-3" /> Adjustments
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:gap-x-8 lg:gap-y-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] lg:text-xs text-gray-400">
                  <span>Pos X</span>
                  <span>{getActiveStyle("posX", posX)}</span>
                </div>
                <Slider
                  min={-150}
                  max={150}
                  value={[getActiveStyle("posX", posX)]}
                  onValueChange={(v) => applyStyle("posX", v[0], setPosX)}
                  className="**:data-radix-slider-range:bg-gray-500 **:[[role=slider]]:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] lg:text-xs text-gray-400">
                  <span>Pos Y</span>
                  <span>{getActiveStyle("posY", posY)}</span>
                </div>
                <Slider
                  min={-300}
                  max={300}
                  value={[getActiveStyle("posY", posY)]}
                  onValueChange={(v) => applyStyle("posY", v[0], setPosY)}
                  className="**:data-radix-slider-range:bg-gray-500 **:[[role=slider]]:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] lg:text-xs text-gray-400">
                  <span>Size</span>
                  <span>{getActiveStyle("size", size)}px</span>
                </div>
                <Slider
                  min={10}
                  max={100}
                  value={[getActiveStyle("size", size)]}
                  onValueChange={(v) => applyStyle("size", v[0], setSize)}
                  className="**:data-radix-slider-range:bg-gray-500 **:[[role=slider]]:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] lg:text-xs text-gray-400">
                  <span>Rotation</span>
                  <span>{getActiveStyle("rotation", rotation)}°</span>
                </div>
                <Slider
                  min={-45}
                  max={45}
                  value={[getActiveStyle("rotation", rotation)]}
                  onValueChange={(v) =>
                    applyStyle("rotation", v[0], setRotation)
                  }
                  className="**:data-radix-slider-range:bg-gray-500 **:[[role=slider]]:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] lg:text-xs font-semibold text-teal-400">
                  <span>Outline Thickness</span>
                  <span>{getActiveStyle("strokeWidth", strokeWidth)}%</span>
                </div>
                <Slider
                  min={0}
                  max={20}
                  value={[getActiveStyle("strokeWidth", strokeWidth)]}
                  onValueChange={(v) =>
                    applyStyle("strokeWidth", v[0], setStrokeWidth)
                  }
                  disabled={!getActiveStyle("strokeEnabled", strokeEnabled)}
                  className={`**:data-radix-slider-range:bg-teal-500 **:[[role=slider]]:bg-white **:[[role=slider]]:border-teal-500 ${!getActiveStyle("strokeEnabled", strokeEnabled) ? "opacity-50" : ""}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] lg:text-xs font-semibold text-teal-400">
                  <span>Sync</span>
                  <span>
                    {getActiveStyle("sync", sync) > 0 ? "+" : ""}
                    {getActiveStyle("sync", sync).toFixed(2)}s
                  </span>
                </div>
                <Slider
                  min={-1}
                  max={1}
                  step={0.05}
                  value={[getActiveStyle("sync", sync)]}
                  onValueChange={(v) => applyStyle("sync", v[0], setSync)}
                  className="**:data-radix-slider-range:bg-teal-500 **:[[role=slider]]:bg-white **:[[role=slider]]:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-8">
            <div>
              <Label className="text-[9px] sm:text-[10px] text-gray-400 font-semibold mb-1.5 block truncate">
                Main
              </Label>
              <div className="relative w-full h-8 sm:h-10 rounded overflow-hidden border border-white/20 shadow-md cursor-pointer hover:border-white/40 transition">
                <input
                  type="color"
                  value={getActiveStyle("mainColor", mainColor)}
                  onChange={(e) =>
                    applyStyle("mainColor", e.target.value, setMainColor)
                  }
                  className="absolute inset-0 w-[150%] h-[150%] -translate-x-4 -translate-y-4 cursor-pointer"
                />
              </div>
            </div>
            <div>
              <Label className="text-[9px] sm:text-[10px] text-gray-400 font-semibold mb-1.5 block truncate">
                Hero
              </Label>
              <div className="relative w-full h-8 sm:h-10 rounded overflow-hidden border border-white/20 shadow-md cursor-pointer hover:border-white/40 transition">
                <input
                  type="color"
                  value={getActiveStyle("heroColor", heroColor)}
                  onChange={(e) =>
                    applyStyle("heroColor", e.target.value, setHeroColor)
                  }
                  className="absolute inset-0 w-[150%] h-[150%] -translate-x-4 -translate-y-4 cursor-pointer"
                />
              </div>
            </div>
            <div>
              <Label className="text-[9px] sm:text-[10px] text-gray-400 font-semibold mb-1.5 block truncate">
                Outline
              </Label>
              <div
                className="relative w-full h-8 sm:h-10 rounded overflow-hidden border border-white/20 shadow-md cursor-pointer transition flex items-center justify-center bg-black/50 hover:border-white/40"
                onClick={() =>
                  applyStyle(
                    "strokeEnabled",
                    !getActiveStyle("strokeEnabled", strokeEnabled),
                    setStrokeEnabled,
                  )
                }
              >
                <span className="text-[10px] font-bold text-white z-10 pointer-events-none">
                  {getActiveStyle("strokeEnabled", strokeEnabled)
                    ? "ON"
                    : "OFF"}
                </span>
                <input
                  type="color"
                  value={getActiveStyle("strokeColor", strokeColor)}
                  onChange={(e) =>
                    applyStyle("strokeColor", e.target.value, setStrokeColor)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute inset-0 w-[150%] h-[150%] -translate-x-4 -translate-y-4 cursor-pointer ${!getActiveStyle("strokeEnabled", strokeEnabled) ? "opacity-0" : "opacity-30"}`}
                />
              </div>
            </div>
            <div>
              <Label className="text-[9px] sm:text-[10px] text-gray-400 font-semibold mb-1.5 block truncate">
                Shadow
              </Label>
              <div className="relative w-full h-8 sm:h-10 rounded overflow-hidden border border-white/20 shadow-md cursor-pointer hover:border-white/40 transition">
                <input
                  type="color"
                  value={getActiveStyle("glowColor", glowColor)}
                  onChange={(e) =>
                    applyStyle("glowColor", e.target.value, setGlowColor)
                  }
                  className="absolute inset-0 w-[150%] h-[150%] -translate-x-4 -translate-y-4 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 🌟 TRANSCRIPT EDITING SECTION 🌟 */}
          <div className="grow flex flex-col min-h-50 lg:min-h-62.5 relative">
            <div className="flex justify-between items-center mb-3 lg:mb-4">
              <h3 className="text-xs lg:text-sm font-semibold text-gray-200 flex items-center gap-2">
                <Type className="w-3 h-3 lg:w-4 lg:h-4" /> Transcript
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSRT}
                  className="text-[10px] lg:text-xs font-medium px-3 py-1 lg:px-4 lg:py-1.5 rounded-full transition-all text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> .SRT
                </button>

                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`text-[10px] lg:text-xs font-medium px-3 py-1 lg:px-4 lg:py-1.5 rounded-full transition-all ${
                    isEditing
                      ? "bg-teal-500 text-white shadow-[0_0_10px_rgba(20,184,166,0.4)]"
                      : "text-teal-400 hover:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20"
                  }`}
                >
                  {isEditing ? "Save Edits" : "Edit Text"}
                </button>
              </div>
            </div>

            <div
              ref={transcriptRef}
              className="relative grow overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-700 border border-white/10 rounded-xl p-2 bg-black/40"
            >
              {transcript.chunks?.map((chunk, index) => {
                const isSelected = index === selectedChunkIndex;
                const isActive = index === activeChunkIndex && !isEditing;

                return (
                  <div
                    key={index}
                    onClick={() => {
                      if (!isEditing) {
                        setSelectedChunkIndex(index);
                        handleSeek([chunk.timestamp[0]]);
                      }
                    }}
                    className={`flex gap-3 lg:gap-4 p-2 lg:p-3 rounded-lg transition-all ${
                      isEditing
                        ? "bg-black/50 border border-white/10"
                        : isSelected
                          ? "bg-purple-500/20 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)] cursor-pointer"
                          : isActive
                            ? "bg-teal-500/10 border border-teal-500/50 cursor-pointer"
                            : "bg-transparent border border-transparent hover:bg-white/5 cursor-pointer"
                    }`}
                  >
                    <span
                      className={`text-[9px] lg:text-[10px] font-mono mt-1 w-6 lg:w-8 shrink-0 ${isSelected ? "text-purple-400" : isActive ? "text-teal-400" : "text-gray-500"}`}
                    >
                      {chunk.timestamp[0].toFixed(1)}s
                    </span>

                    {isEditing ? (
                      <textarea
                        value={chunk.text}
                        onChange={(e) => handleChunkEdit(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className="w-full bg-black/40 text-xs lg:text-sm text-white border border-white/10 rounded-md p-2 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all resize-none overflow-hidden transcript-textarea"
                        rows={2}
                      />
                    ) : (
                      <p
                        className={`text-xs lg:text-sm ${isSelected || isActive ? "text-white" : "text-gray-400"}`}
                      >
                        {chunk.text}
                        {chunk.style && Object.keys(chunk.style).length > 0 && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[7px] lg:text-[8px] font-bold bg-purple-500/30 text-purple-300">
                            STYLED
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
