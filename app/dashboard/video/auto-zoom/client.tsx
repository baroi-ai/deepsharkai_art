"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Loader2,
  UploadCloud,
  Download,
  Play,
  Pause,
  Plus,
  Wand2,
  Trash2,
  Settings2,
  ZoomIn,
  Clock,
  HardDrive,
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

// Remotion — preview only (no web-renderer export)
import { Player, PlayerRef } from "@remotion/player";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Video as RemotionVideo,
  spring,
  interpolate,
  Easing,
} from "remotion";

const MAX_FILE_SIZE_MB = 500;
const MAX_DURATION_SEC = 2 * 60; // 2 minutes

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
  { id: "fast-snap", label: "Fast Snap", desc: "Bouncy cut" },
  { id: "crash-zoom", label: "Crash", desc: "Hard punch in" },
  { id: "smooth-in", label: "Smooth In", desc: "Cinematic push" },
  { id: "zoom-out", label: "Zoom Out", desc: "Pulls back" },
  { id: "pulse", label: "Pulse", desc: "In then out" },
];

// ─── REMOTION COMPONENT (preview only) ───────────────────────────────────────
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
    const framesInZoom = Math.max(0, (currentTime - activeZoom.start) * fps);
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
      case "pulse": {
        const isEnding = durationFrames - framesInZoom < 0.5 * fps;
        currentScale = isEnding
          ? spring({
              frame: framesInZoom - (durationFrames - 0.5 * fps),
              fps,
              config: { damping: 14, stiffness: 100 },
              from: activeZoom.scale,
              to: 1,
            })
          : spring({
              frame: framesInZoom,
              fps,
              config: { damping: 14, stiffness: 100 },
              from: 1,
              to: activeZoom.scale,
            });
        break;
      }
      default:
        currentScale = 1;
    }
  } else if (
    recentZoom &&
    recentZoom.type !== "crash-zoom" &&
    recentZoom.type !== "zoom-out"
  ) {
    const framesSinceEnd = Math.max(0, (currentTime - recentZoom.end) * fps);
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

// ─── SPRING SIMULATOR ─────────────────────────────────────────────────────────
// Matches Remotion's spring() output by numerically integrating the same ODE.
// damping/stiffness values mirror the Remotion component exactly.
function simulateSpring(
  frame: number,
  fps: number,
  from: number,
  to: number,
  config: { damping: number; stiffness: number },
): number {
  const { damping, stiffness } = config;
  const mass = 1;
  const dt = 1 / fps;
  let pos = from;
  let vel = 0;
  const steps = Math.max(0, Math.round(frame));
  for (let i = 0; i < steps; i++) {
    const force = -stiffness * (pos - to) - damping * vel;
    vel += (force / mass) * dt;
    pos += vel * dt;
  }
  return pos;
}

// ─── CANVAS EXPORT HELPER ─────────────────────────────────────────────────────
async function exportWithCanvas(
  mediaSrc: string,
  videoDimensions: { w: number; h: number },
  videoDuration: number,
  zoomEvents: ZoomEvent[],
  onProgress: (p: number) => void,
): Promise<void> {
  const FPS = 30;
  const { w, h } = videoDimensions;
  const totalFrames = Math.ceil(videoDuration * FPS) + 1;

  // ── 1. Pre-cache zoom scale for every frame ───────────────────────────────
  const easeOutCubic = (x: number) =>
    1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  const scaleCache = new Float32Array(totalFrames + 1);

  for (let f = 0; f <= totalFrames; f++) {
    const t = f / FPS;
    const activeZoom = zoomEvents.find((z) => t >= z.start && t < z.end);
    const recentZoom = zoomEvents.find((z) => t >= z.end && t < z.end + 0.5);
    let scale = 1;
    if (activeZoom) {
      const framesInZoom = Math.max(0, (t - activeZoom.start) * FPS);
      const durationFrames = Math.max(
        1,
        (activeZoom.end - activeZoom.start) * FPS,
      );
      const p = Math.min(1, framesInZoom / durationFrames);
      switch (activeZoom.type) {
        case "crash-zoom":
          scale = activeZoom.scale;
          break;
        case "smooth-in":
          scale = 1 + (activeZoom.scale - 1) * easeOutCubic(p);
          break;
        case "zoom-out":
          scale = activeZoom.scale - (activeZoom.scale - 1) * easeOutCubic(p);
          break;
        case "fast-snap":
          scale = simulateSpring(framesInZoom, FPS, 1, activeZoom.scale, {
            damping: 14,
            stiffness: 150,
          });
          break;
        case "pulse": {
          const isEnding = durationFrames - framesInZoom < 0.5 * FPS;
          scale = isEnding
            ? simulateSpring(
                framesInZoom - (durationFrames - 0.5 * FPS),
                FPS,
                activeZoom.scale,
                1,
                { damping: 14, stiffness: 100 },
              )
            : simulateSpring(framesInZoom, FPS, 1, activeZoom.scale, {
                damping: 14,
                stiffness: 100,
              });
          break;
        }
        default:
          scale = 1;
      }
    } else if (
      recentZoom &&
      recentZoom.type !== "crash-zoom" &&
      recentZoom.type !== "zoom-out"
    ) {
      scale = simulateSpring(
        Math.max(0, (t - recentZoom.end) * FPS),
        FPS,
        recentZoom.scale,
        1,
        { damping: 14, stiffness: 100 },
      );
    }
    scaleCache[f] = scale;
  }

  // ── 2. Create video element — MUST be in DOM for captureStream() audio ────
  const video = document.createElement("video");
  video.src = mediaSrc;
  video.muted = false;
  video.playsInline = true;
  video.preload = "auto";
  // Hidden but in DOM — required for audio capture to work in Chrome
  video.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  document.body.appendChild(video);

  // ── 3. Wait for video to be ready ────────────────────────────────────────
  await new Promise<void>((res, rej) => {
    video.oncanplaythrough = () => res();
    video.onerror = () => rej(new Error("Video load failed"));
    video.load();
  });

  // ── 4. Setup canvas ───────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // ── 5. Build combined stream: canvas video + video element audio ──────────
  const canvasStream = canvas.captureStream(FPS);

  // captureStream() works reliably now because video is in the DOM
  try {
    const videoStream: MediaStream =
      typeof (video as any).captureStream === "function"
        ? (video as any).captureStream()
        : (video as any).mozCaptureStream();
    videoStream
      .getAudioTracks()
      .forEach((track) => canvasStream.addTrack(track));
  } catch (_) {}

  // ── 6. MediaRecorder ─────────────────────────────────────────────────────
  let mimeType = "video/webm;codecs=vp9";
  if (!MediaRecorder.isTypeSupported(mimeType))
    mimeType = "video/webm;codecs=vp8";
  if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = "video/webm";

  const recorder = new MediaRecorder(canvasStream, {
    mimeType,
    videoBitsPerSecond: 15_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      document.body.removeChild(video); // clean up DOM
      const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "autozoom-export.webm";
      a.click();
      URL.revokeObjectURL(url);
      resolve();
    };

    // ── 7. Play + rVFC draw loop ──────────────────────────────────────────
    video.currentTime = 0;
    video
      .play()
      .then(() => {
        recorder.start();
        let isActive = true;

        const drawLoop = (_now: number, metadata: any) => {
          if (!isActive) return;

          const t: number = metadata ? metadata.mediaTime : video.currentTime;
          const frameIdx = Math.min(Math.round(t * FPS), scaleCache.length - 1);
          const scale = scaleCache[frameIdx];

          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, w, h);
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(scale, scale);
          ctx.drawImage(video, -w / 2, -h / 2, w, h);
          ctx.restore();

          onProgress(Math.min(99, Math.round((t / videoDuration) * 100)));

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
          isActive = false;
          recorder.stop();
          onProgress(100);
        };

        video.onerror = () => {
          isActive = false;
          document.body.removeChild(video);
          reject(new Error("Video error during export"));
        };
      })
      .catch((err) => {
        document.body.removeChild(video);
        reject(err);
      });
  });
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AutoZoomPage() {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ w: 1080, h: 1920 });
  const [videoDuration, setVideoDuration] = useState(10);
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
  const dragState = useRef<{
    id: string;
    startMouseX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);

  const playerInputProps = useMemo(
    () => ({ videoSrc: mediaSrc || "", zoomEvents }),
    [mediaSrc, zoomEvents],
  );

  // ─── Drag ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current || !timelineRef.current) return;
      const { id, startMouseX, origStart, origEnd } = dragState.current;
      const rect = timelineRef.current.getBoundingClientRect();
      const deltaTime =
        ((e.clientX - startMouseX) / rect.width) * videoDuration;
      let ns = origStart + deltaTime,
        ne = origEnd + deltaTime;
      if (ns < 0) {
        ns = 0;
        ne = origEnd - origStart;
      }
      if (ne > videoDuration) {
        ne = videoDuration;
        ns = videoDuration - (origEnd - origStart);
      }
      setZoomEvents((prev) =>
        prev.map((z) => (z.id === id ? { ...z, start: ns, end: ne } : z)),
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

  // ─── Keyboard delete ──────────────────────────────────────────────────────
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

  // ─── RAF sync ─────────────────────────────────────────────────────────────
  const updatePlaybackTime = useCallback(() => {
    if (playerRef.current) {
      setPlaybackTime(playerRef.current.getCurrentFrame() / 30);
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

  useEffect(() => () => workerRef.current?.terminate(), []);

  // ─── File select ──────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/"))
      return toast.error("Invalid video file.");
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB)
      return toast.error(
        `File too large (${sizeMB.toFixed(0)}MB). Limit is ${MAX_FILE_SIZE_MB}MB.`,
      );
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => {
      if (video.duration > MAX_DURATION_SEC) {
        toast.error(
          `Too long (${Math.round(video.duration / 60)}min). Limit is 2 minutes.`,
        );
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

  // ─── Timeline ─────────────────────────────────────────────────────────────
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    setSelectedEventId(null);
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * videoDuration;
    if (playerRef.current) playerRef.current.seekTo(Math.floor(t * 30));
  };

  const addManualZoom = () => {
    const newId = `zoom-${Date.now()}`;
    setZoomEvents((prev) => [
      ...prev,
      {
        id: newId,
        start: playbackTime,
        end: Math.min(playbackTime + 2, videoDuration),
        type: "fast-snap",
        scale: 1.3,
      },
    ]);
    setSelectedEventId(newId);
  };

  const updateSelectedZoom = (patch: Partial<ZoomEvent>) => {
    if (!selectedEventId) return;
    setZoomEvents((prev) =>
      prev.map((z) => (z.id === selectedEventId ? { ...z, ...patch } : z)),
    );
  };

  const deleteSelectedZoom = () => {
    if (!selectedEventId) return;
    setZoomEvents((prev) => prev.filter((z) => z.id !== selectedEventId));
    setSelectedEventId(null);
  };

  // ─── AI Auto-Generate ─────────────────────────────────────────────────────
  const handleAutoGenerate = async () => {
    if (!mediaFile) return;
    setIsProcessing(true);
    setProgress("Extracting audio...");
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
            setProgress(message || "Downloading AI...");
          if (status === "processing") setProgress("Transcribing...");
          if (status === "success") {
            const rawChunks = result.chunks || [];
            const autoZooms: ZoomEvent[] = [];
            let lastZoomEnd = 0;
            rawChunks.forEach((chunk: any, index: number) => {
              const start = chunk.timestamp[0];
              const end = Math.min(
                chunk.timestamp[1] || start + 2,
                videoDuration,
              );
              if (start < lastZoomEnd) return;
              const prevEnd = index > 0 ? rawChunks[index - 1].timestamp[1] : 0;
              const isPause = start - prevEnd > 1.0;
              if (isPause || index % 3 === 0) {
                autoZooms.push({
                  id: `auto-${index}`,
                  start,
                  end,
                  type: isPause ? "crash-zoom" : "smooth-in",
                  scale: 1.25,
                });
                lastZoomEnd = end;
              }
            });
            setZoomEvents(autoZooms);
            setIsProcessing(false);
            setProgress("");
            toast.success("Auto-Zoom created!");
          }
          if (status === "error") {
            setIsProcessing(false);
            toast.error("AI Error: " + error);
          }
        };
      }
      workerRef.current.postMessage({ audio: rawAudio });
    } catch {
      toast.error("Failed to process media.");
      setIsProcessing(false);
    }
  };

  // ─── Export (canvas-based, no remotion/web-renderer) ──────────────────────
  const handleExport = async () => {
    if (!mediaSrc) return;

    // Pause Remotion player so it doesn't fight the export video element
    const wasPlaying = playerRef.current?.isPlaying() ?? false;
    playerRef.current?.pause();

    setIsExporting(true);
    setExportProgress(0);
    toast.info("Rendering video...", { description: "Do not close this tab." });
    try {
      await exportWithCanvas(
        mediaSrc,
        videoDimensions,
        videoDuration,
        zoomEvents,
        setExportProgress,
      );
      toast.success("Export complete!");
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      // Restore playback state
      if (wasPlaying) playerRef.current?.play();
    }
  };

  const selectedEvent = zoomEvents.find((z) => z.id === selectedEventId);

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  // ─── UPLOAD SCREEN ────────────────────────────────────────────────────────
  if (!mediaSrc) {
    return (
      <div className="no-sidebar-swipe flex flex-col h-[calc(100vh-64px)] text-gray-300">
        <div className="grow overflow-y-auto p-4 md:p-6 flex flex-col justify-start items-center">
          <div className="flex flex-col items-center justify-center text-center mt-16 max-w-md w-full gap-6">
            <ZoomIn className="h-16 w-16 opacity-20" />
            <div>
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Auto Zoom
              </h1>
              <p className="text-gray-500">
                Add dynamic zoom cuts to your videos.
              </p>
            </div>
            {/* Limits info */}
            <div className="flex gap-3 w-full">
              <div className="flex-1 flex items-center gap-2 bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-white/30 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white/50">
                    Max Length
                  </div>
                  <div className="text-[11px] text-white/30">2 minutes</div>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <HardDrive className="w-4 h-4 text-white/30 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white/50">
                    Max Size
                  </div>
                  <div className="text-[11px] text-white/30">500 MB</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full px-4 pb-4">
          <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-12 md:h-14 md:w-14 shrink-0 flex flex-col items-center justify-center border border-gray-700 bg-gray-800/50 rounded-lg hover:border-white/30 hover:text-white text-gray-400 transition-all"
            >
              <UploadCloud className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <div className="grow bg-gray-900/30 border border-gray-800 rounded-lg text-base text-gray-500 px-4 py-3.5 min-h-13.5 flex items-center select-none">
              Upload a video to begin
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── EDITOR SCREEN ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-[calc(100vh-64px)] text-gray-200 overflow-hidden bg-transparent">
      {/* TOP: Video preview + right panel */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* LEFT: Video */}
        <div className="w-full h-[45%] lg:h-full lg:flex-1 flex flex-col items-center justify-center relative border-b border-white/5 lg:border-b-0 shrink-0">
          <div
            className="relative h-full max-h-[36vh] lg:max-h-[65vh] max-w-full bg-black rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl overflow-hidden group"
            style={{
              aspectRatio: `${videoDimensions.w} / ${videoDimensions.h}`,
            }}
          >
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
              acknowledgeRemotionLicense
            />

            {isExporting && (
              <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-white/60 mb-4" />
                <h3 className="text-white font-bold text-lg">
                  {Math.round(exportProgress)}%
                </h3>
                <p className="text-xs text-gray-400 mt-2">
                  Do not close this tab
                </p>
              </div>
            )}

            {!isExporting && (
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={() => {
                    if (playerRef.current)
                      isPlaying
                        ? playerRef.current.pause()
                        : playerRef.current.play();
                  }}
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
              <button
                onClick={handleExport}
                disabled={isExporting}
                className={`h-7 lg:h-9 px-3 lg:px-4 text-white rounded-full flex items-center gap-1.5 active:scale-95 border text-[10px] lg:text-xs font-bold transition-all ${isExporting ? "bg-gray-800 border-gray-600 cursor-not-allowed" : "bg-white/10 hover:bg-white/20 border-white/20"}`}
              >
                {isExporting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Download className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">
                  {isExporting ? `${Math.round(exportProgress)}%` : "Export"}
                </span>
              </button>
            </div>
          </div>

          {/* Seek slider */}
          <div className="w-full max-w-72 mt-3 lg:mt-5 flex items-center gap-3">
            <span className="text-[10px] text-gray-400 font-mono w-8">
              {formatDur(playbackTime)}
            </span>
            <Slider
              min={0}
              max={videoDuration}
              step={0.1}
              value={[playbackTime]}
              onValueChange={([v]) => {
                if (playerRef.current)
                  playerRef.current.seekTo(Math.floor(v * 30));
              }}
              className="grow **:data-radix-slider-range:bg-white **:[[role=slider]]:bg-white **:[[role=slider]]:border-white **:[[role=slider]]:w-3 **:[[role=slider]]:h-3"
            />
            <span className="text-[10px] text-gray-400 font-mono w-8 text-right">
              {formatDur(videoDuration)}
            </span>
          </div>
        </div>

        {/* RIGHT: Style panel */}
        <div className="h-[55%] lg:h-full w-full lg:w-100 xl:w-107.5 shrink-0 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto scrollbar-hide bg-black/40 backdrop-blur-xl border-l border-white/5 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-lg lg:text-xl font-semibold text-white tracking-wide">
              <Settings2
                className={`w-4 h-4 lg:w-5 lg:h-5 ${selectedEventId ? "text-teal-400" : "text-white/30"}`}
              />
              Zoom Editor
            </div>
            {selectedEventId ? (
              <span className="text-[9px] lg:text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full text-teal-400 bg-teal-500/10 border border-teal-500/30">
                Editing
              </span>
            ) : (
              <span className="text-[9px] lg:text-[10px] uppercase tracking-widest font-semibold px-3 py-1 rounded-full text-white/25 bg-white/5 border border-white/10">
                No Selection
              </span>
            )}
          </div>

          {/* Zoom type presets */}
          <div className="mb-5">
            <Label className="text-[9px] text-gray-400 uppercase tracking-wider mb-3 block">
              Zoom Type
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {ZOOM_PRESETS.map((preset) => {
                const isActive = selectedEvent?.type === preset.id;
                return (
                  <button
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
                    className={`rounded-xl px-3 py-2.5 text-left transition-all border ${isActive ? "bg-teal-500/10 border-teal-500/50 text-teal-300" : "bg-transparent border-white/6 text-white/50 hover:text-white/70 hover:border-white/10 hover:bg-white/5"}`}
                  >
                    <div className="text-xs font-medium leading-tight">
                      {preset.label}
                    </div>
                    <div className="text-[9px] text-white/30 mt-0.5 leading-tight">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Adjustments */}
          <div
            className={`bg-black/40 border border-white/10 rounded-xl p-4 mb-5 shadow-inner transition-opacity ${!selectedEvent ? "opacity-40 pointer-events-none" : ""}`}
          >
            <div className="flex items-center gap-2 text-[9px] text-gray-400 uppercase tracking-widest font-semibold mb-4">
              <Settings2 className="w-3 h-3" /> Adjustments
            </div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-white/60">
                  <span>Zoom Level</span>
                  <span className="text-teal-400 font-semibold">
                    {selectedEvent?.scale ?? 1.3}×
                  </span>
                </div>
                <Slider
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  value={[selectedEvent?.scale ?? 1.3]}
                  onValueChange={([v]) => updateSelectedZoom({ scale: v })}
                  className="**:data-radix-slider-range:bg-teal-500 **:[[role=slider]]:bg-white **:[[role=slider]]:border-teal-400"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-[10px] text-white/60">
                  <span>Hold Duration</span>
                  <span className="text-white/40">
                    {selectedEvent
                      ? Math.max(
                          0.5,
                          selectedEvent.end - selectedEvent.start,
                        ).toFixed(1)
                      : "2.0"}
                    s
                  </span>
                </div>
                <Slider
                  min={0.5}
                  max={10.0}
                  step={0.1}
                  value={[
                    selectedEvent
                      ? Number(
                          Math.max(
                            0.5,
                            selectedEvent.end - selectedEvent.start,
                          ).toFixed(1),
                        )
                      : 2.0,
                  ]}
                  onValueChange={([v]) =>
                    selectedEvent &&
                    updateSelectedZoom({
                      end: Math.min(selectedEvent.start + v, videoDuration),
                    })
                  }
                  className="**:data-radix-slider-range:bg-gray-500 **:[[role=slider]]:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={handleAutoGenerate}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all disabled:opacity-40"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              {isProcessing ? progress || "Analyzing..." : "Auto-Fill"}
            </button>
            {selectedEventId && (
              <button
                onClick={deleteSelectedZoom}
                className="flex items-center justify-center gap-1.5 text-xs text-white/30 hover:text-red-400 px-4 py-2.5 rounded-full border border-transparent hover:border-red-500/20 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>

          {/* Limits info at bottom of panel */}
          <div className="mt-auto pt-4 border-t border-white/6 flex gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-white/25">
              <Clock className="w-3 h-3" /> Max 2 min
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-white/25">
              <HardDrive className="w-3 h-3" /> Max 500 MB
            </div>
            <div className="ml-auto text-[10px] text-white/20 font-mono">
              {formatDur(videoDuration)} · {zoomEvents.length} zoom
              {zoomEvents.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Timeline */}
      <div className="h-32 lg:h-36 shrink-0 border-t border-white/6 bg-black/30 backdrop-blur-sm px-4 py-3 flex flex-col">
        {/* Controls */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (playerRef.current)
                  isPlaying
                    ? playerRef.current.pause()
                    : playerRef.current.play();
              }}
              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
            <span className="text-xs font-mono text-white/40">
              {formatDur(playbackTime)}{" "}
              <span className="text-white/20">
                / {formatDur(videoDuration)}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedEventId && (
              <button
                onClick={deleteSelectedZoom}
                className="flex items-center gap-1 text-[11px] text-white/25 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              onClick={addManualZoom}
              className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white px-3 py-1.5 rounded-lg border border-white/6 hover:border-white/20 hover:bg-white/5 transition-all"
            >
              <Plus className="w-3 h-3" /> Add Cut
            </button>
          </div>
        </div>

        {/* Track */}
        <div
          ref={timelineRef}
          className="relative flex-1 rounded-xl border border-white/6 bg-white/2 cursor-crosshair overflow-hidden"
          onMouseDown={handleTimelineClick}
        >
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-white/30 z-50 pointer-events-none"
            style={{ left: `${(playbackTime / videoDuration) * 100}%` }}
          >
            <div className="absolute -top-0.5 -left-0.75 w-1.75 h-1.75 bg-white rounded-full" />
          </div>

          {/* Time ticks */}
          {Array.from({
            length: Math.min(Math.floor(videoDuration / 5) + 1, 25),
          }).map((_, i) => {
            const t = i * 5;
            return (
              <div
                key={t}
                className="absolute top-0 bottom-0 w-px bg-white/4 pointer-events-none"
                style={{ left: `${(t / videoDuration) * 100}%` }}
              >
                <span className="absolute bottom-1 left-1 text-[8px] text-white/20 font-mono">
                  {formatDur(t)}
                </span>
              </div>
            );
          })}

          {/* Empty state */}
          {zoomEvents.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white/20 pointer-events-none">
              Click timeline to seek · Add zoom cuts with "Add Cut"
            </div>
          )}

          {/* Zoom blocks */}
          {zoomEvents.map((evt) => {
            const leftPct = (evt.start / videoDuration) * 100;
            const widthPct = ((evt.end - evt.start) / videoDuration) * 100;
            const isSelected = selectedEventId === evt.id;
            return (
              <div
                key={evt.id}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedEventId(evt.id);
                  if (playerRef.current)
                    playerRef.current.seekTo(Math.floor(evt.start * 30));
                  dragState.current = {
                    id: evt.id,
                    startMouseX: e.clientX,
                    origStart: evt.start,
                    origEnd: evt.end,
                  };
                }}
                className={`absolute top-2 bottom-2 rounded-lg cursor-grab active:cursor-grabbing flex items-center justify-center overflow-hidden transition-all ${isSelected ? "bg-teal-500/20 border border-teal-500/50 z-40" : "bg-white/[0.07] border border-white/10 z-30 hover:bg-white/12"}`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              >
                <span
                  className={`text-[9px] font-medium select-none truncate px-1 ${isSelected ? "text-teal-300" : "text-white/35"}`}
                >
                  {ZOOM_PRESETS.find((p) => p.id === evt.type)?.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
