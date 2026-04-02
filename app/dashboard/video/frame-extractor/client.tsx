"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  UploadCloud,
  XCircle,
  Download,
  Play,
  Pause,
  Scissors,
  Wand2,
  Trash2,
  Video,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

// Remotion
import { Player, PlayerRef } from "@remotion/player";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Video as RemotionVideo,
  spring,
  interpolate,
  Easing,
} from "remotion";

const MAX_FILE_SIZE_MB = 100;
const MAX_DURATION_SEC = 60;

// ─── ZOOM TYPES & PRESETS ──────────────────────────────────────────────────
export type ZoomType =
  | "none"
  | "fast-snap"
  | "smooth-in"
  | "crash-zoom"
  | "zoom-out"
  | "pulse";

export interface ZoomEvent {
  id: string;
  start: number;
  end: number;
  type: ZoomType;
  scale: number;
}

const ZOOM_PRESETS: { id: ZoomType; label: string; desc: string }[] = [
  { id: "none", label: "None", desc: "No zoom" },
  { id: "fast-snap", label: "Fast Snap", desc: "Energetic cut" },
  { id: "crash-zoom", label: "Crash Zoom", desc: "Hard punch in" },
  { id: "smooth-in", label: "Smooth In", desc: "Slow push" },
  { id: "zoom-out", label: "Zoom Out", desc: "Pulls back" },
  { id: "pulse", label: "Smooth Pulse", desc: "Zoom in/out" },
];

// ─── REMOTION COMPONENT: Physics Engine ───────────────────────────────────────
const AutoZoomComposition: React.FC<{
  videoSrc: string;
  zoomEvents: ZoomEvent[];
}> = ({ videoSrc, zoomEvents }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const activeZoom = zoomEvents.find(
    (z) => currentTime >= z.start && currentTime < z.end,
  );
  const recentZoom = zoomEvents.find(
    (z) => currentTime >= z.end && currentTime < z.end + 0.5,
  );

  let currentScale = 1;

  if (activeZoom) {
    const timeInZoom = currentTime - activeZoom.start;
    const framesInZoom = Math.max(0, timeInZoom * fps);
    const durationFrames = Math.max(
      1,
      (activeZoom.end - activeZoom.start) * fps,
    );

    switch (activeZoom.type) {
      case "fast-snap":
        currentScale = spring({
          frame: framesInZoom,
          fps,
          config: { damping: 14, stiffness: 150 },
          from: 1,
          to: activeZoom.scale,
        });
        break;
      case "crash-zoom":
        currentScale = activeZoom.scale;
        break;
      case "smooth-in":
        currentScale = interpolate(
          framesInZoom,
          [0, durationFrames],
          [1, activeZoom.scale],
          {
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            extrapolateRight: "clamp",
          },
        );
        break;
      case "zoom-out":
        currentScale = interpolate(
          framesInZoom,
          [0, durationFrames],
          [activeZoom.scale, 1],
          {
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
            extrapolateRight: "clamp",
          },
        );
        break;
      case "pulse":
        const isEnding = durationFrames - framesInZoom < 0.5 * fps;
        if (isEnding) {
          currentScale = spring({
            frame: framesInZoom - (durationFrames - 0.5 * fps),
            fps,
            config: { damping: 14, stiffness: 100 },
            from: activeZoom.scale,
            to: 1,
          });
        } else {
          currentScale = spring({
            frame: framesInZoom,
            fps,
            config: { damping: 14, stiffness: 100 },
            from: 1,
            to: activeZoom.scale,
          });
        }
        break;
      case "none":
      default:
        currentScale = 1;
        break;
    }
  } else if (
    recentZoom &&
    recentZoom.type !== "crash-zoom" &&
    recentZoom.type !== "zoom-out"
  ) {
    const timeSinceEnd = currentTime - recentZoom.end;
    const framesSinceEnd = Math.max(0, timeSinceEnd * fps);
    currentScale = spring({
      frame: framesSinceEnd,
      fps,
      config: { damping: 14, stiffness: 100 },
      from: recentZoom.scale,
      to: 1,
    });
  }

  return (
    <AbsoluteFill className="bg-black flex items-center justify-center overflow-hidden">
      <div
        style={{
          transform: `scale(${currentScale})`,
          width: "100%",
          height: "100%",
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <RemotionVideo
          src={videoSrc}
          acceptableTimeShiftInSeconds={1.0}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AutoZoomPage() {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ w: 1080, h: 1920 });
  const [videoDuration, setVideoDuration] = useState(10);
  const [isMobile, setIsMobile] = useState(false);

  // Timeline State
  const [zoomEvents, setZoomEvents] = useState<ZoomEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const rafRef = useRef<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const playerInputProps = useMemo(() => {
    return { videoSrc: mediaSrc || "", zoomEvents };
  }, [mediaSrc, zoomEvents]);

  // Mobile Detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Drag & Drop Logic
  const dragState = useRef<{
    id: string;
    startMouseX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current || !timelineRef.current) return;
      const { id, startMouseX, origStart, origEnd } = dragState.current;
      const rect = timelineRef.current.getBoundingClientRect();
      const deltaTime =
        ((e.clientX - startMouseX) / rect.width) * videoDuration;
      let newStart = origStart + deltaTime;
      let newEnd = origEnd + deltaTime;

      if (newStart < 0) {
        newStart = 0;
        newEnd = origEnd - origStart;
      }
      if (newEnd > videoDuration) {
        newEnd = videoDuration;
        newStart = videoDuration - (origEnd - origStart);
      }

      setZoomEvents((prev) =>
        prev.map((z) =>
          z.id === id ? { ...z, start: newStart, end: newEnd } : z,
        ),
      );
    };
    const handleMouseUp = () => {
      dragState.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [videoDuration]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if ((e.key === "Backspace" || e.key === "Delete") && selectedEventId) {
        setZoomEvents((prev) => prev.filter((z) => z.id !== selectedEventId));
        setSelectedEventId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEventId]);

  // Playback Sync
  const updatePlaybackTime = useCallback(() => {
    if (playerRef.current) {
      const frame = playerRef.current.getCurrentFrame();
      setPlaybackTime(frame / 30);
      setIsPlaying(playerRef.current.isPlaying());
    }
    rafRef.current = requestAnimationFrame(updatePlaybackTime);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updatePlaybackTime);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updatePlaybackTime]);

  useEffect(() => {
    return () => workerRef.current?.terminate();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/"))
      return toast.error("Invalid video file.");
    if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB)
      return toast.error(`File too large. Limit is ${MAX_FILE_SIZE_MB}MB.`);

    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      if (video.duration > MAX_DURATION_SEC) {
        toast.error(`Media too long. Limit is ${MAX_DURATION_SEC}s.`);
        URL.revokeObjectURL(url);
      } else {
        setVideoDimensions({ w: video.videoWidth, h: video.videoHeight });
        setVideoDuration(video.duration);
        setMediaFile(file);
        setMediaSrc(url);
        setZoomEvents([]);
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    video.src = url;
  };

  const clearVideo = () => {
    setMediaFile(null);
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    setMediaSrc(null);
    setZoomEvents([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setSelectedEventId(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickedTime = ((e.clientX - rect.left) / rect.width) * videoDuration;
    if (playerRef.current)
      playerRef.current.seekTo(Math.floor(clickedTime * 30));
  };

  const addManualZoom = () => {
    const newId = `zoom-${Date.now()}`;
    const newZoom: ZoomEvent = {
      id: newId,
      start: playbackTime,
      end: Math.min(playbackTime + 2, videoDuration),
      type: "fast-snap",
      scale: 1.3,
    };
    setZoomEvents((prev) => [...prev, newZoom]);
    setSelectedEventId(newId);
  };

  const updateSelectedZoom = (patch: Partial<ZoomEvent>) => {
    if (!selectedEventId) return;
    setZoomEvents((prev) =>
      prev.map((z) => (z.id === selectedEventId ? { ...z, ...patch } : z)),
    );
  };

  const handleAutoGenerate = async () => {
    if (!mediaFile) return;
    setIsProcessing(true);
    setProgress("Analyzing audio...");

    try {
      const audioContext = new window.AudioContext({ sampleRate: 16000 });
      const arrayBuffer = await mediaFile.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const rawAudio = audioBuffer.getChannelData(0);
      audioContext.close();

      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL("../caption/transcribe.worker.ts", import.meta.url),
          { type: "module" },
        );
        workerRef.current.onmessage = (e) => {
          const { status, result, error, message } = e.data;
          if (status === "downloading")
            setProgress(message || "Downloading AI Engine...");
          if (status === "processing") setProgress("Finding cuts...");
          if (status === "success") {
            const autoZooms: ZoomEvent[] = [];
            let lastZoomEnd = 0;
            (result.chunks || []).forEach((chunk: any, index: number) => {
              let start = chunk.timestamp[0];
              let end = Math.min(
                chunk.timestamp[1] || start + 2,
                videoDuration,
              );
              if (start < lastZoomEnd) return;
              const prevEnd =
                index > 0 ? result.chunks[index - 1].timestamp[1] : 0;
              if (start - prevEnd > 1.0 || index % 3 === 0) {
                autoZooms.push({
                  id: `auto-${index}`,
                  start,
                  end,
                  type: start - prevEnd > 1.0 ? "crash-zoom" : "smooth-in",
                  scale: 1.25,
                });
                lastZoomEnd = end;
              }
            });
            setZoomEvents(autoZooms);
            setIsProcessing(false);
            setProgress("");
            toast.success("Timeline created!");
          }
          if (status === "error") {
            setIsProcessing(false);
            toast.error("AI Error: " + error);
          }
        };
      }
      workerRef.current.postMessage({ audio: rawAudio });
    } catch (err) {
      toast.error("Processing failed.");
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    if (!mediaSrc) return;
    setIsExporting(true);
    setExportProgress(0);
    toast.info("Rendering Video...");

    try {
      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: "AutoZoomExport",
          component: AutoZoomComposition,
          durationInFrames: Math.max(1, Math.floor(videoDuration * 30)),
          fps: 30,
          width: videoDimensions.w,
          height: videoDimensions.h,
          defaultProps: playerInputProps,
        },
        inputProps: playerInputProps,
        onProgress: ({ progress }) =>
          setExportProgress(Math.round(progress * 100)),
      });
      const blob = await getBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "submagic-zoom-video.mp4";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export Complete!");
    } catch (error: any) {
      toast.error("Export failed: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedEvent = zoomEvents.find((z) => z.id === selectedEventId);

  return (
    <div className="no-sidebar-swipe flex flex-col h-[calc(100vh-64px)] text-gray-300 bg-black relative overflow-hidden">
      {/* ─── SCROLLABLE CONTENT AREA ─── */}
      <div className="flex-grow overflow-y-auto p-4 md:p-6 pb-40 flex flex-col items-center">
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-6">
          {/* Empty State */}
          {!mediaSrc && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-10 max-w-md w-full">
              <Video className="h-20 w-20 mb-6 opacity-30" />
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Auto Zoom Editor
              </h1>
              <p className="text-gray-500 mb-6">
                Upload a video to add dynamic, Submagic-style zoom effects.
              </p>

              <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2">
                <div className="space-y-1 text-center">
                  <div className="flex items-center justify-center gap-2 text-teal-300">
                    <Cpu className="h-5 w-5" />
                    <p className="text-sm font-medium">Running Locally</p>
                  </div>
                  <p className="text-xs text-teal-200/70 leading-relaxed">
                    100% Private. Audio transcription and video rendering happen
                    entirely on your device.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Editor Area */}
          {mediaSrc && (
            <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
              {/* Video Player */}
              <div className="relative w-full max-w-[340px] md:max-w-md mx-auto aspect-9/16 rounded-xl overflow-hidden border border-gray-700 bg-black shadow-2xl group">
                <Player
                  ref={playerRef}
                  component={AutoZoomComposition}
                  inputProps={playerInputProps}
                  durationInFrames={Math.max(1, Math.floor(videoDuration * 30))}
                  fps={30}
                  compositionWidth={videoDimensions.w}
                  compositionHeight={videoDimensions.h}
                  style={{ width: "100%", height: "100%" }}
                  loop
                />
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={clearVideo}
                  className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
                {isExporting && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-500 mb-4" />
                    <h3 className="text-white font-bold text-lg">
                      {exportProgress}%
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Rendering Video...
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile-Friendly Horizontal Zoom Presets */}
              <div className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Zoom Templates
                  </h2>
                  <span className="text-[10px] text-gray-500">
                    Click to add at playhead
                  </span>
                </div>

                <div className="flex overflow-x-auto gap-3 pb-2 w-full snap-x scrollbar-hide">
                  {ZOOM_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => {
                        if (selectedEventId) {
                          updateSelectedZoom({ type: preset.id });
                        } else {
                          const newId = `zoom-${Date.now()}`;
                          setZoomEvents((prev) => [
                            ...prev,
                            {
                              id: newId,
                              start: playbackTime,
                              end: Math.min(playbackTime + 2, videoDuration),
                              type: preset.id,
                              scale: 1.3,
                            },
                          ]);
                          setSelectedEventId(newId);
                        }
                      }}
                      className={`shrink-0 w-28 cursor-pointer rounded-xl border-2 p-2 flex flex-col items-center justify-center text-center transition-all bg-gray-950 snap-start
                        ${selectedEvent?.type === preset.id ? "border-cyan-500 bg-cyan-500/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]" : "border-gray-800 hover:border-gray-600"}`}
                    >
                      <div className="w-10 h-14 bg-gray-800 rounded mb-2 border border-gray-700 flex items-center justify-center overflow-hidden">
                        <div
                          className={`w-6 h-6 bg-cyan-500/40 rounded-full ${preset.id === "fast-snap" ? "animate-bounce" : preset.id === "pulse" ? "animate-pulse" : ""}`}
                        />
                      </div>
                      <span
                        className={`text-[10px] font-bold ${selectedEvent?.type === preset.id ? "text-cyan-400" : "text-gray-300"}`}
                      >
                        {preset.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Selected Event Controls */}
                {selectedEvent && (
                  <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Zoom Level
                        </Label>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          {selectedEvent.scale}x
                        </span>
                      </div>
                      <Slider
                        min={1.0}
                        max={2.0}
                        step={0.05}
                        value={[selectedEvent.scale]}
                        onValueChange={([v]) =>
                          updateSelectedZoom({ scale: v })
                        }
                        className="**:data-radix-slider-range:bg-cyan-500 **:[[role=slider]]:border-cyan-500"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Duration
                        </Label>
                        <span className="text-[10px] font-mono text-cyan-400 font-bold">
                          {Math.max(
                            0.5,
                            selectedEvent.end - selectedEvent.start,
                          ).toFixed(1)}
                          s
                        </span>
                      </div>
                      <Slider
                        min={0.5}
                        max={10.0}
                        step={0.1}
                        value={[
                          Number(
                            Math.max(
                              0.5,
                              selectedEvent.end - selectedEvent.start,
                            ).toFixed(1),
                          ),
                        ]}
                        onValueChange={([v]) =>
                          updateSelectedZoom({
                            end: Math.min(
                              selectedEvent.start + v,
                              videoDuration,
                            ),
                          })
                        }
                        className="**:data-radix-slider-range:bg-cyan-500 **:[[role=slider]]:border-cyan-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Compact Timeline */}
              <div className="w-full bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (playerRef.current)
                          isPlaying
                            ? playerRef.current.pause()
                            : playerRef.current.play();
                      }}
                      className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:bg-gray-200"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-1" />
                      )}
                    </button>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-mono text-white font-bold">
                        {playbackTime.toFixed(1)}s
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        / {videoDuration.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={addManualZoom}
                    variant="ghost"
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 h-8 px-2 text-xs"
                  >
                    <Scissors className="w-3 h-3 mr-1.5" /> Cut
                  </Button>
                </div>

                <div
                  ref={timelineRef}
                  className="relative w-full h-12 bg-gray-900 border border-gray-800 rounded-lg mt-1 overflow-hidden cursor-crosshair"
                  onMouseDown={handleTimelineClick}
                >
                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                    style={{ left: `${(playbackTime / videoDuration) * 100}%` }}
                  >
                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  </div>

                  {/* Events */}
                  {zoomEvents.map((evt) => {
                    const leftPct = (evt.start / videoDuration) * 100;
                    const widthPct =
                      ((evt.end - evt.start) / videoDuration) * 100;
                    const isSelected = selectedEventId === evt.id;

                    return (
                      <div
                        key={evt.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedEventId(evt.id);
                          if (playerRef.current)
                            playerRef.current.seekTo(
                              Math.floor(evt.start * 30),
                            );
                          dragState.current = {
                            id: evt.id,
                            startMouseX: e.clientX,
                            origStart: evt.start,
                            origEnd: evt.end,
                          };
                        }}
                        className={`absolute top-1 bottom-1 rounded-md transition-colors cursor-grab active:cursor-grabbing border flex items-center justify-center overflow-hidden
                              ${isSelected ? "bg-cyan-500/80 border-cyan-400 z-40 shadow-lg shadow-cyan-500/50" : "bg-gray-700/50 border-gray-600 z-30 hover:bg-gray-600/70"}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        <span
                          className={`text-[8px] font-bold px-1 truncate select-none ${isSelected ? "text-white" : "text-gray-300"}`}
                        >
                          {ZOOM_PRESETS.find((p) => p.id === evt.type)?.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── FIXED BOTTOM INPUT BAR (Minimalist UI) ─── */}
      <div className="absolute bottom-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-10 pb-4 px-4 z-50">
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="w-full bg-gray-900/60 backdrop-blur-md p-1.5 rounded-2xl flex items-center gap-2 border border-gray-800 shadow-2xl">
            {/* Upload Button */}
            <div className="flex-shrink-0 relative">
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isProcessing || isExporting}
              />
              <Label
                onClick={() => fileInputRef.current?.click()}
                className={buttonVariants({
                  variant: "outline",
                  size: "icon",
                  className: `cursor-pointer h-12 w-12 flex items-center justify-center hover:border-cyan-500 hover:text-cyan-400 border-gray-700 bg-black/50 rounded-xl transition-all ${
                    mediaSrc
                      ? "border-cyan-500/50 text-cyan-500"
                      : "text-gray-400"
                  }`,
                })}
              >
                <UploadCloud className="h-5 w-5" />
              </Label>
            </div>

            {/* Status Indicator */}
            <div className="flex-grow relative flex items-center">
              <Textarea
                disabled
                value={
                  !mediaSrc
                    ? "Upload a video to start..."
                    : isProcessing
                      ? progress
                      : isExporting
                        ? `Exporting: ${exportProgress}%`
                        : "Ready to Auto-Zoom or Export"
                }
                className="flex-grow bg-black/30 border-none rounded-xl resize-none text-sm text-gray-400 pl-4 pr-32 py-3.5 self-center h-12 cursor-not-allowed select-none"
                rows={1}
              />

              {/* Action Buttons */}
              <div className="absolute right-1.5 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5">
                {mediaSrc && (
                  <>
                    <Button
                      onClick={handleAutoGenerate}
                      disabled={isProcessing || isExporting}
                      className={`h-9 px-3 rounded-lg flex items-center justify-center gap-1.5 text-white text-xs transition-all shadow-md ${
                        isProcessing || isExporting
                          ? "bg-gray-800 text-gray-500"
                          : "bg-gray-800 hover:bg-gray-700 hover:text-cyan-400"
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline font-semibold">
                        Auto
                      </span>
                    </Button>
                    <Button
                      onClick={handleExport}
                      disabled={
                        isProcessing || isExporting || zoomEvents.length === 0
                      }
                      className={`h-9 px-4 rounded-lg flex items-center justify-center gap-1.5 text-white text-xs transition-all shadow-md ${
                        isProcessing || isExporting || zoomEvents.length === 0
                          ? "bg-gray-800 text-gray-500 opacity-50"
                          : "bg-linear-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="font-semibold">Export</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
