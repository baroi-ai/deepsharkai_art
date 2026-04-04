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
  Activity,
  Wand2,
  Clock,
  HardDrive,
  Scissors,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

import { Player, PlayerRef } from "@remotion/player";
import {
  AbsoluteFill,
  useVideoConfig,
  Video as RemotionVideo,
  Series,
} from "remotion";

const MAX_FILE_SIZE_MB = 500;
const MAX_DURATION_SEC = 3 * 60;

// ─── REMOTION PREVIEW COMPONENT ───────────────────────────────────────────────
const CutComposition: React.FC<{
  videoSrc: string;
  clips: { start: number; end: number }[];
}> = ({ videoSrc, clips }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill className="bg-black overflow-hidden">
      <Series>
        {clips.map((clip, i) => {
          const dur = Math.max(1, Math.round((clip.end - clip.start) * fps));
          const startFrom = Math.round(clip.start * fps);
          return (
            <Series.Sequence key={i} durationInFrames={dur}>
              <RemotionVideo
                src={videoSrc}
                startFrom={startFrom}
                endAt={startFrom + dur}
                acceptableTimeShiftInSeconds={1.0}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function SilenceRemoverPage() {
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState({ w: 1080, h: 1920 });
  const [videoDuration, setVideoDuration] = useState(0);

  // Result clips
  const [clips, setClips] = useState<{ start: number; end: number }[]>([]);
  const [isDone, setIsDone] = useState(false);

  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");

  // Settings
  const [thresholdDb, setThresholdDb] = useState(-35);
  const [minSilenceLen, setMinSilenceLen] = useState(0.5);
  const [padding, setPadding] = useState(0.1);

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Playback
  const [playbackTime, setPlaybackTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const rafRef = useRef<number | null>(null);

  const totalDuration = useMemo(
    () => clips.reduce((acc, c) => acc + (c.end - c.start), 0) || 0.1,
    [clips],
  );

  const playerInputProps = useMemo(
    () => ({ videoSrc: mediaSrc || "", clips }),
    [mediaSrc, clips],
  );

  const formatDur = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  // RAF sync
  const tick = useCallback(() => {
    if (playerRef.current) {
      setPlaybackTime(playerRef.current.getCurrentFrame() / 30);
      setIsPlaying(playerRef.current.isPlaying());
    }
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // ─── File upload ─────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/"))
      return toast.error("Invalid video file.");
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_SIZE_MB)
      return toast.error(`Too large. Max ${MAX_FILE_SIZE_MB}MB.`);
    if (mediaSrc) URL.revokeObjectURL(mediaSrc);
    const url = URL.createObjectURL(file);
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.muted = true;
    vid.onloadedmetadata = () => {
      if (vid.duration > MAX_DURATION_SEC) {
        toast.error("Too long. Max 3 minutes.");
        URL.revokeObjectURL(url);
        return;
      }
      setVideoDimensions({ w: vid.videoWidth, h: vid.videoHeight });
      setVideoDuration(vid.duration);
      setMediaFile(file);
      setMediaSrc(url);
      setClips([]);
      setIsDone(false);
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
    };
    vid.src = url;
  };

  // ─── Core: detect silence and build clip list ─────────────────────────────
  const runAnalysis = async () => {
    if (!mediaFile) return;
    setIsProcessing(true);
    setIsDone(false);
    setClips([]);

    try {
      setProgressText("Decoding audio...");
      const audioCtx = new AudioContext();
      const ab = await mediaFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(ab);
      audioCtx.close();
      const raw = audioBuffer.getChannelData(0);
      const sr = audioBuffer.sampleRate;

      setProgressText("Detecting silences...");

      // RMS per 50ms chunk → dB
      const chunkSec = 0.05;
      const chunkSize = Math.floor(sr * chunkSec);
      const totalChunks = Math.floor(raw.length / chunkSize);
      const silent = new Uint8Array(totalChunks);

      for (let i = 0; i < totalChunks; i++) {
        let sq = 0;
        const si = i * chunkSize;
        for (let j = 0; j < chunkSize; j++) {
          const a = raw[si + j];
          sq += a * a;
        }
        const db = 20 * Math.log10(Math.sqrt(sq / chunkSize) || 1e-10);
        if (db < thresholdDb) silent[i] = 1;
      }

      // Build speech segments
      const speech: { start: number; end: number }[] = [];
      let inSpeech = !silent[0];
      let segStart = inSpeech ? 0 : -1;

      for (let i = 1; i < totalChunks; i++) {
        if (inSpeech && silent[i]) {
          speech.push({ start: segStart, end: i * chunkSec });
          inSpeech = false;
        } else if (!inSpeech && !silent[i]) {
          segStart = i * chunkSec;
          inSpeech = true;
        }
      }
      if (inSpeech)
        speech.push({ start: segStart, end: totalChunks * chunkSec });

      if (speech.length === 0) {
        toast.error("No speech detected. Try lowering the threshold.");
        setIsProcessing(false);
        setProgressText("");
        return;
      }

      // Add padding around each segment
      const padded = speech.map((s) => ({
        start: Math.max(0, s.start - padding),
        end: Math.min(videoDuration, s.end + padding),
      }));

      // Merge segments where the gap is shorter than minSilenceLen
      const merged: { start: number; end: number }[] = [padded[0]];
      for (let i = 1; i < padded.length; i++) {
        const last = merged[merged.length - 1];
        const cur = padded[i];
        if (cur.start - last.end < minSilenceLen) {
          last.end = Math.max(last.end, cur.end);
        } else {
          merged.push({ ...cur });
        }
      }

      setClips(merged);
      setIsDone(true);

      const saved =
        videoDuration - merged.reduce((a, c) => a + (c.end - c.start), 0);
      toast.success(`Done! Removed ${saved.toFixed(1)}s of silence.`);
    } catch (err) {
      toast.error("Analysis failed. Try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
      setProgressText("");
    }
  };

  // ─── Export ───────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!mediaSrc || clips.length === 0) return;
    const wasPlaying = playerRef.current?.isPlaying() ?? false;
    playerRef.current?.pause();
    setIsExporting(true);
    setExportProgress(0);
    toast.info("Rendering...", { description: "Do not close this tab." });

    try {
      const FPS = 30;
      const canvas = document.createElement("canvas");
      canvas.width = videoDimensions.w;
      canvas.height = videoDimensions.h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Hidden DOM video (needed for audio capture in Chrome)
      const video = document.createElement("video");
      video.src = mediaSrc;
      video.muted = false;
      video.playsInline = true;
      video.preload = "auto";
      video.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
      document.body.appendChild(video);

      await new Promise<void>((res, rej) => {
        video.oncanplaythrough = () => res();
        video.onerror = () => rej(new Error("Load failed"));
        video.load();
      });

      const canvasStream = canvas.captureStream(FPS);
      try {
        const vs: MediaStream =
          typeof (video as any).captureStream === "function"
            ? (video as any).captureStream()
            : (video as any).mozCaptureStream();
        vs.getAudioTracks().forEach((t) => canvasStream.addTrack(t));
      } catch (_) {}

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

      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => {
          document.body.removeChild(video);
          const blob = new Blob(chunks, { type: mimeType.split(";")[0] });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "silence-removed.webm";
          a.click();
          URL.revokeObjectURL(url);
          resolve();
        };

        let clipIdx = 0;
        let rendered = 0;
        const total = totalDuration;

        const renderNext = () => {
          if (clipIdx >= clips.length) {
            recorder.stop();
            return;
          }
          const clip = clips[clipIdx];
          video.currentTime = clip.start;
          video.addEventListener(
            "seeked",
            function onSeeked() {
              video.removeEventListener("seeked", onSeeked);
              video
                .play()
                .then(() => {
                  const draw = (_: number, meta: any) => {
                    const t: number = meta ? meta.mediaTime : video.currentTime;
                    ctx.fillStyle = "#000";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    rendered += 1 / FPS;
                    setExportProgress(
                      Math.min(99, Math.round((rendered / total) * 100)),
                    );
                    if (t >= clip.end - 0.04) {
                      video.pause();
                      clipIdx++;
                      renderNext();
                      return;
                    }
                    if ("requestVideoFrameCallback" in video) {
                      (video as any).requestVideoFrameCallback(draw);
                    } else {
                      requestAnimationFrame(() => draw(0, null));
                    }
                  };
                  if ("requestVideoFrameCallback" in video) {
                    (video as any).requestVideoFrameCallback(draw);
                  } else {
                    requestAnimationFrame(() => draw(0, null));
                  }
                })
                .catch(reject);
            },
            { once: true },
          );
        };

        recorder.start();
        renderNext();
      });

      toast.success("Export complete!");
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      if (wasPlaying) playerRef.current?.play();
    }
  };

  // ─── UPLOAD SCREEN ────────────────────────────────────────────────────────
  if (!mediaSrc) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] text-gray-300">
        <div className="grow flex flex-col items-center justify-center p-6">
          <div className="flex flex-col items-center text-center max-w-sm gap-6">
            <Scissors className="h-16 w-16 opacity-20" />
            <div>
              <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                Silence Remover
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                Upload a video. We'll detect all silences and long pauses, cut
                them out, and give you a tighter video automatically.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <div className="flex-1 flex items-center gap-2 bg-white/3 border border-white/6 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-white/30 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white/50">
                    Max Length
                  </div>
                  <div className="text-[11px] text-white/30">3 minutes</div>
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

        <div className="w-full px-4 pb-4 pt-2">
          <div className="w-full max-w-4xl mx-auto flex items-center gap-3">
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
    <div className="no-sidebar-swipe flex flex-col lg:flex-row w-full h-[calc(100vh-64px)] text-gray-200 overflow-hidden bg-transparent">
      {/* LEFT: Video preview */}
      <div className="w-full h-[50%] lg:h-full lg:flex-1 flex flex-col items-center justify-center relative border-b border-white/5 lg:border-b-0 shrink-0">
        <div
          className="relative h-full max-h-[42vh] lg:max-h-[70vh] max-w-full bg-black rounded-2xl lg:rounded-3xl border border-white/10 shadow-2xl overflow-hidden group"
          style={{ aspectRatio: `${videoDimensions.w} / ${videoDimensions.h}` }}
        >
          {isDone && clips.length > 0 ? (
            <Player
              ref={playerRef}
              component={CutComposition}
              inputProps={playerInputProps}
              durationInFrames={Math.max(1, Math.floor(totalDuration * 30))}
              fps={30}
              compositionWidth={videoDimensions.w}
              compositionHeight={videoDimensions.h}
              style={{ width: "100%", height: "100%" }}
              loop
              acknowledgeRemotionLicense
            />
          ) : (
            // Show original video before processing
            <video
              src={mediaSrc}
              className="w-full h-full object-cover"
              playsInline
              muted
              loop
              autoPlay
            />
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <Activity className="w-10 h-10 text-teal-400 animate-pulse" />
              <div className="text-center">
                <p className="text-white font-semibold text-sm">
                  {progressText}
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Analyzing audio waveform...
                </p>
              </div>
            </div>
          )}

          {/* Export overlay */}
          {isExporting && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-white/60 animate-spin" />
              <div className="text-center">
                <p className="text-white font-bold text-lg">
                  {exportProgress}%
                </p>
                <p className="text-white/40 text-xs mt-1">
                  Do not close this tab
                </p>
              </div>
              {/* Progress bar */}
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded-full transition-all"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Play button hover */}
          {isDone && !isProcessing && !isExporting && (
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => {
                  if (playerRef.current)
                    isPlaying
                      ? playerRef.current.pause()
                      : playerRef.current.play();
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 rounded-xl p-3 lg:p-4 text-white backdrop-blur-sm transition"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 lg:w-9 lg:h-9" />
                ) : (
                  <Play className="w-7 h-7 lg:w-9 lg:h-9 ml-1" />
                )}
              </button>
            </div>
          )}

          {/* Export button */}
          {isDone && !isExporting && (
            <div className="absolute bottom-3 right-3 z-50">
              <button
                onClick={handleExport}
                className="h-8 lg:h-9 px-3 lg:px-4 text-white rounded-full flex items-center gap-1.5 border border-white/20 bg-white/10 hover:bg-white/20 text-[10px] lg:text-xs font-bold transition-all active:scale-95"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          )}
        </div>

        {/* Stats below video */}
        {isDone && (
          <div className="flex items-center gap-4 mt-4 text-[11px] font-mono text-white/30">
            <span>{formatDur(videoDuration)} original</span>
            <span className="text-white/10">→</span>
            <span className="text-teal-400 font-semibold">
              {formatDur(totalDuration)} trimmed
            </span>
            <span className="text-white/10">·</span>
            <span className="text-white/40">
              {formatDur(Math.max(0, videoDuration - totalDuration))} saved
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: Controls panel */}
      <div className="h-[50%] lg:h-full w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto scrollbar-hide bg-black/40 backdrop-blur-xl border-l border-white/5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <Scissors className="w-4 h-4 text-white/30" />
            Silence Remover
          </div>
          {isDone && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1 rounded-full text-teal-400 bg-teal-500/10 border border-teal-500/30">
              <CheckCircle2 className="w-3 h-3" /> {clips.length} clips
            </span>
          )}
        </div>

        {/* Main action */}
        <button
          onClick={runAnalysis}
          disabled={isProcessing || isExporting}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm mb-6 transition-all ${
            isProcessing
              ? "bg-white/5 border border-white/10 text-white/40 cursor-not-allowed"
              : "bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 hover:border-teal-500/60 active:scale-[0.98]"
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />{" "}
              {progressText || "Analyzing..."}
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />{" "}
              {isDone ? "Re-analyze" : "Remove Silences"}
            </>
          )}
        </button>

        {/* Settings */}
        <div className="bg-black/40 border border-white/10 rounded-xl p-4 lg:p-5 mb-5">
          <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-4">
            Detection Settings
          </p>
          <div className="space-y-5">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Silence Threshold</span>
                <span className="text-teal-400 font-mono font-semibold">
                  {thresholdDb} dB
                </span>
              </div>
              <Slider
                min={-60}
                max={-10}
                step={1}
                value={[thresholdDb]}
                onValueChange={([v]) => setThresholdDb(v)}
                disabled={isProcessing}
                className="**:data-radix-slider-range:bg-teal-500 **:[[role=slider]]:bg-white **:[[role=slider]]:border-teal-400"
              />
              <p className="text-[9px] text-white/20">
                Higher = cuts more aggressively
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Min Pause to Cut</span>
                <span className="font-mono text-white/35">
                  {minSilenceLen}s
                </span>
              </div>
              <Slider
                min={0.1}
                max={3.0}
                step={0.1}
                value={[minSilenceLen]}
                onValueChange={([v]) => setMinSilenceLen(v)}
                disabled={isProcessing}
                className="**:data-radix-slider-range:bg-gray-500 **:[[role=slider]]:bg-white"
              />
              <p className="text-[9px] text-white/20">
                Pauses shorter than this are kept
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] text-white/50">
                <span>Keep Around Words</span>
                <span className="font-mono text-white/35">{padding}s</span>
              </div>
              <Slider
                min={0.0}
                max={0.5}
                step={0.05}
                value={[padding]}
                onValueChange={([v]) => setPadding(v)}
                disabled={isProcessing}
                className="**:data-radix-slider-range:bg-gray-500 **:[[role=slider]]:bg-white"
              />
              <p className="text-[9px] text-white/20">
                Buffer before/after each word
              </p>
            </div>
          </div>
        </div>

        {/* Result summary */}
        {isDone && clips.length > 0 && (
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 mb-5">
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-3">
              Result
            </p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Original length</span>
                <span className="text-xs font-mono text-white/60">
                  {formatDur(videoDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">After cuts</span>
                <span className="text-xs font-mono text-teal-400 font-semibold">
                  {formatDur(totalDuration)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Segments kept</span>
                <span className="text-xs font-mono text-white/60">
                  {clips.length}
                </span>
              </div>

              {/* Visual bar */}
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full transition-all"
                  style={{
                    width: `${Math.max(5, (totalDuration / videoDuration) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[9px] text-white/20 text-center">
                {Math.round((totalDuration / videoDuration) * 100)}% of original
                kept
              </p>
            </div>
          </div>
        )}

        {/* Clip list */}
        {isDone && clips.length > 0 && (
          <div className="grow flex flex-col min-h-0">
            <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2">
              Kept Segments
            </p>
            <div className="overflow-y-auto space-y-1.5 pr-1 scrollbar-hide">
              {clips.map((clip, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/6 hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-[10px] text-white/30 font-mono w-5">
                    {i + 1}
                  </span>
                  <span className="text-[10px] font-mono text-white/50">
                    {formatDur(clip.start)} → {formatDur(clip.end)}
                  </span>
                  <span className="text-[10px] font-mono text-teal-400/70">
                    {formatDur(clip.end - clip.start)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-white/6 flex gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-white/20">
            <Clock className="w-3 h-3" /> Max 3 min
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/20">
            <HardDrive className="w-3 h-3" /> Max 500 MB
          </div>
          <div className="ml-auto">
            <button
              onClick={() => {
                setMediaFile(null);
                if (mediaSrc) URL.revokeObjectURL(mediaSrc);
                setMediaSrc(null);
                setClips([]);
                setIsDone(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-[10px] text-white/20 hover:text-white/50 transition-colors"
            >
              Change video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
