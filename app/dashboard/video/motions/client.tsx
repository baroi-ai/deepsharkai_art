"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  Play,
  Code2,
  Copy,
  Check,
  Sparkles,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Bot,
  Download,
  Loader2,
  ChevronDown,
  ImageIcon,
  UploadCloud,
  Trash2,
  Search,
} from "lucide-react";

import { Player, PlayerRef } from "@remotion/player";
import * as Remotion from "remotion";
import { transform } from "@babel/standalone";

const GPT_URL =
  "https://chatgpt.com/g/g-69c95eca14408191bb0390ddd0b977c8-remotion-deepshark-ai";

const EXAMPLE_PROMPTS = [
  "A glowing neon circle that pulses and spins (16:9, 5s)",
  "3D text flying in from the left with shadow trail (9:16, 3s)",
  "Particles exploding from center like fireworks (1:1, 10s)",
  "Countdown timer from 5 to 0 with dramatic scale",
  "Liquid morphing blobs in teal and purple",
  "Cinematic title card with film grain effect",
];

const STARTER_CODE = `function MyComposition() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const loopFrame = frame % 150;

  const scale = spring({
    frame: loopFrame,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 10, stiffness: 100 }
  });

  const rotate = interpolate(loopFrame, [0, 150], [0, 360]);

  const glow = interpolate(
    Math.sin((loopFrame / 150) * Math.PI * 2),
    [-1, 1],
    [0.4, 1]
  );

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(circle at center, #020617, #020617 60%, #000)",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      {/* Rotating loading ring */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          border: "6px solid rgba(0,255,200,0.1)",
          borderTop: "6px solid rgba(0,255,200,0.9)",
          transform: \`rotate(\${rotate}deg)\`,
          boxShadow: \`0 0 30px rgba(0,255,200,\${glow})\`
        }}
      />

      {/* Glow pulse */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,255,200,0.3), transparent 70%)",
          filter: "blur(40px)",
          opacity: glow
        }}
      />

      {/* Logo */}
      <Img
        src={"/logo.png"}
        style={{
          width: 300,
          height: 300,
          transform: \`scale(\${scale}) rotate(\${rotate * 0.2}deg)\`,
          filter: \`drop-shadow(0 0 20px rgba(0,255,200,\${glow}))\`
        }}
      />

      {/* Loading text */}
      <div
        style={{
          position: "absolute",
          bottom: "15%",
          fontSize: 40,
          color: "rgba(200,255,240,0.9)",
          letterSpacing: 6,
          fontWeight: "bold",
          textShadow: \`0 0 10px rgba(0,255,200,\${glow})\`
        }}
      >
        LOADING
      </div>
    </AbsoluteFill>
  );
}`;

// ── Types ───────────────────────────────────────────────────────────────────
type Asset = {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  file: File;
};

// ── Compiler ────────────────────────────────────────────────────────────────
function compileCode(codeString: string, assets: Asset[] = []): React.FC {
  let safe = codeString
    .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?\n?/g, "")
    .replace(/export\s+default\s+\w+;?\n?/g, "")
    .replace(/export\s+(const|let|var|function|class)\s+/g, "$1 ")
    .replace(/\/mnt\/data\/[^"'`]+/g, "/logo.png"); // Silently fix ChatGPT internal paths

  // 🌟 Magic Asset Replacer
  assets.forEach((asset) => {
    const escapedName = asset.name.replace(/\./g, "\\.");
    const regex = new RegExp(`['"\`]\/?${escapedName}['"\`]`, "g");
    safe = safe.replace(regex, `"${asset.url}"`);
  });

  safe = safe.trim();

  const transpiled = transform(safe, {
    presets: ["react"],
    filename: "motion.jsx",
  }).code;

  const exec = new Function(
    "React",
    "Remotion",
    `
    const {
      AbsoluteFill, useCurrentFrame, useVideoConfig,
      spring, interpolate, Easing, Sequence, Series,
      Audio, Img, Video, Loop, random,
    } = Remotion;
    ${transpiled}
    if (typeof MyComposition === 'undefined')
      throw new Error('Component must be named MyComposition');
    return MyComposition;
  `,
  );

  return exec(React, Remotion);
}

// ── Export helpers ──────────────────────────────────────────────────────────

async function exportAnimation(
  containerRef: React.RefObject<HTMLDivElement | null>,
  playerRef: React.RefObject<PlayerRef | null>,
  durationFrames: number,
  fps: number,
  compWidth: number,
  compHeight: number,
  setExporting: (v: boolean) => void,
  setExportProgress: (p: number) => void,
) {
  setExporting(true);
  setExportProgress(0);

  try {
    if (!("VideoEncoder" in window)) {
      throw new Error(
        "Your browser does not support offline video encoding. Please use Chrome or Edge.",
      );
    }

    const root = containerRef.current;
    if (!root) throw new Error("Remotion player not found.");

    // Load dependencies if missing
    if (!(window as any).Mp4Muxer) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://unpkg.com/mp4-muxer/build/mp4-muxer.js";
        s.onload = () => res();
        s.onerror = () => rej(new Error("Failed to load mp4-muxer"));
        document.head.appendChild(s);
      });
    }

    if (!(window as any).htmlToImage) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src =
          "https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js";
        s.onload = () => res();
        s.onerror = () => rej(new Error("Failed to load html-to-image"));
        document.head.appendChild(s);
      });
    }

    const Mp4Muxer = (window as any).Mp4Muxer;
    const htmlToImage = (window as any).htmlToImage;
    const VideoEncoderAny = (window as any).VideoEncoder;
    const VideoFrameAny = (window as any).VideoFrame;

    // 🌟 SETUP MUXER
    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: {
        codec: "avc",
        width: compWidth,
        height: compHeight,
      },
      fastStart: "in-memory",
    });

    const videoEncoder = new VideoEncoderAny({
      output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
      error: (e: any) => console.error(e),
    });

    videoEncoder.configure({
      codec: "avc1.420028",
      width: compWidth,
      height: compHeight,
      bitrate: 10_000_000,
      framerate: fps,
    });

    playerRef.current?.pause();

    // 🌟 RESOLUTION FIX: Calculate the exact multiplier needed to stretch the DOM to 1080p/4k
    const rect = root.getBoundingClientRect();
    const scaleMultiplier = compWidth / rect.width;

    // 🌟 FRAME LOOP
    for (let frame = 0; frame < durationFrames; frame++) {
      playerRef.current?.seekTo(frame);

      // 🌟 SPEED FIX: Replace 100ms sleep with a double requestAnimationFrame.
      // This waits exactly 1 paint cycle (~16ms) for React to render the frame.
      // It makes the export 300% to 500% faster!
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );

      // 🌟 RESOLUTION FIX: Tell htmlToImage to multiply the pixel density
      const canvasElement = await htmlToImage.toCanvas(root, {
        width: rect.width,
        height: rect.height,
        pixelRatio: scaleMultiplier, // Forces the small div to render at the massive video resolution
        style: { margin: "0", padding: "0" },
      });

      const timestamp = Math.round((frame * 1000000) / fps);
      const videoFrame = new VideoFrameAny(canvasElement, { timestamp });

      videoEncoder.encode(videoFrame, { keyFrame: frame % 30 === 0 });
      videoFrame.close();

      setExportProgress(Math.round(((frame + 1) / durationFrames) * 95)); // Go to 95%
    }

    setExportProgress(98);
    await videoEncoder.flush();

    setExportProgress(99);
    muxer.finalize();

    const buffer = muxer.target.buffer;
    const blob = new Blob([buffer], { type: "video/mp4" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `deepshark-motion.mp4`;
    a.click();

    setExportProgress(100);
    toast.success("Download complete!");
  } catch (err: any) {
    toast.error(`Export failed: ${err.message}`);
  } finally {
    setExporting(false);
    setExportProgress(0);
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function MotionGeneratorPage() {
  const [code, setCode] = useState(STARTER_CODE);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [compiled, setCompiled] = useState<React.FC | null>(() => {
    try {
      return compileCode(STARTER_CODE, []);
    } catch {
      return null;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"editor" | "guide" | "assets">(
    "editor",
  );

  // Search State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Customization State
  const [ratio, setRatio] = useState<"16:9" | "9:16" | "1:1">("16:9");
  const [durationSec, setDurationSec] = useState<number>(5);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [openMenu, setOpenMenu] = useState<"ratio" | "duration" | null>(null);

  const playerRef = useRef<PlayerRef>(null as unknown as PlayerRef);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-naming counters
  const imageCountRef = useRef(0);
  const videoCountRef = useRef(0);

  useEffect(() => {
    const closeMenu = () => setOpenMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const FPS = 30;
  const DURATION_FRAMES = durationSec * FPS;

  const dimensions = {
    "16:9": { w: 1920, h: 1080 },
    "9:16": { w: 1080, h: 1920 },
    "1:1": { w: 1080, h: 1080 },
  }[ratio];

  const handleSearch = useCallback(
    (e?: React.KeyboardEvent) => {
      if (e) e.preventDefault();
      if (!searchQuery || !textareaRef.current) return;

      const text = code.toLowerCase();
      const query = searchQuery.toLowerCase();
      const currentPos = textareaRef.current.selectionEnd || 0;

      // Find next occurrence
      let nextIndex = text.indexOf(query, currentPos);

      // If not found, wrap around to the top
      if (nextIndex === -1) {
        nextIndex = text.indexOf(query);
        if (nextIndex === -1) {
          toast.error("Text not found in code");
          return;
        }
      }

      // 🌟 Focus the textarea so the browser natively highlights the text in blue!
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        nextIndex,
        nextIndex + query.length,
      );
      // (Removed the line that forced focus back to the search bar)

      // Auto-scroll logic based on line height
      const linesBefore = code.substring(0, nextIndex).split("\n").length;
      const lineHeight = 18.5; // Approximate line height
      textareaRef.current.scrollTop = Math.max(
        0,
        (linesBefore - 3) * lineHeight,
      );
    },
    [code, searchQuery],
  );

  const handleRun = useCallback(() => {
    try {
      if (code.includes("/mnt/data/")) {
        toast.warning(
          "ChatGPT internal image removed. Upload your file to the 'Assets' tab and reference its new name!",
          { duration: 8000 },
        );
      }

      // 🌟 NEW: Validate missing assets
      const requiredAssetsMatch =
        code.match(/\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|mp4|webm|gif|webp)/gi) ||
        [];
      const missingAssets = Array.from(
        new Set(
          requiredAssetsMatch.filter((path) => {
            if (path.toLowerCase() === "/logo.png") return false; // Ignore our default
            const filename = path.replace(/^\//, "");
            return !assets.some(
              (a) => a.name.toLowerCase() === filename.toLowerCase(),
            );
          }),
        ),
      );

      if (missingAssets.length > 0) {
        toast.warning(
          `You referenced ${missingAssets.join(", ")} but haven't uploaded it. Please add it in the Assets tab!`,
          { duration: 8000 },
        );
      } else if (!code.includes("/mnt/data/")) {
        toast.success("Animation running!");
      }

      const comp = compileCode(code, assets);
      setCompiled(() => comp);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setCompiled(null);
      toast.error("Fix the code error first");
    }
  }, [code, assets]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Run animation on CMD+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleRun();
      return;
    }

    // 🌟 Magic Find-Next Handler:
    // If the search bar is open and the highlighted text perfectly matches the search query,
    // pressing Enter will jump to the next result instead of making a new line!
    if (e.key === "Enter" && showSearch && searchQuery && textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;

      if (start !== end) {
        const selectedText = code.substring(start, end).toLowerCase();
        if (selectedText === searchQuery.toLowerCase()) {
          e.preventDefault(); // Stop it from making a gap/newline
          handleSearch(); // Jump to the next result!
        }
      }
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copied!");
  };

  const resetCode = () => {
    setCode(STARTER_CODE);
    setError(null);
    try {
      const comp = compileCode(STARTER_CODE, assets);
      setCompiled(() => comp);
    } catch {}
  };

  const handleExport = () => {
    if (!compiled) {
      toast.error("Run an animation first.");
      return;
    }
    exportAnimation(
      containerRef,
      playerRef,
      DURATION_FRAMES,
      FPS,
      dimensions.w,
      dimensions.h,
      setExporting,
      setExportProgress,
    );
  };

  // ── File Upload Handlers ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newAssets: Asset[] = [];
    Array.from(e.target.files).forEach((file) => {
      const isVideo = file.type.startsWith("video/");
      const type = isVideo ? "video" : "image";

      const extMatch = file.name.match(/\.([a-zA-Z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : isVideo ? "mp4" : "png";

      let autoName = "";
      if (isVideo) {
        videoCountRef.current += 1;
        autoName = `video${videoCountRef.current}.${ext}`;
      } else {
        imageCountRef.current += 1;
        autoName = `image${imageCountRef.current}.${ext}`;
      }

      newAssets.push({
        id: Math.random().toString(36).substring(2, 9),
        name: autoName,
        type,
        url: URL.createObjectURL(file),
        file,
      });
    });

    setAssets((prev) => [...prev, ...newAssets]);
    toast.success(`${newAssets.length} file(s) added!`);
    e.target.value = "";
  };

  const removeAsset = (id: string) => {
    setAssets((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((a) => a.id !== id);
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-transparent text-gray-200 overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="shrink-0 no-sidebar-swipe flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
          <span className="text-sm font-semibold text-white">
            Motion Generator
          </span>
          <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400">
            Free
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={GPT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open GPT</span>
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 transition-all active:scale-[0.97]"
          >
            <Play className="w-3 h-3" />
            <span>Run</span>
            <span className="hidden sm:inline text-[10px] text-teal-500/50 ml-0.5">
              ⌘↵
            </span>
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-white/[0.06] h-[52%] lg:h-full">
          {/* Tabs */}
          <div className="shrink-0 flex border-b border-white/[0.06]">
            {[
              { id: "editor", label: "Code Editor", icon: Code2 },
              { id: "guide", label: "How to Use", icon: Sparkles },
              { id: "assets", label: "Assets", icon: ImageIcon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-teal-400 text-white"
                    : "border-transparent text-white/35 hover:text-white/60"
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* ── EDITOR TAB ── */}
          {activeTab === "editor" && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Editor toolbar */}
              <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] bg-black/20">
                <span className="text-[10px] font-mono text-white/20">
                  MyComposition.jsx
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => {
                      setShowSearch(!showSearch);
                      if (!showSearch) {
                        setTimeout(
                          () => document.getElementById("searchInput")?.focus(),
                          50,
                        );
                      }
                    }}
                    title="Search in code"
                    className={`p-1.5 rounded transition-colors ${showSearch ? "bg-white/10 text-white" : "text-white/20 hover:text-white/50 hover:bg-white/5"}`}
                  >
                    <Search className="w-3 h-3" />
                  </button>
                  <button
                    onClick={resetCode}
                    title="Reset to example"
                    className="p-1.5 rounded text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    onClick={copyCode}
                    title="Copy code"
                    className="p-1.5 rounded text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-teal-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Mini Search Bar */}
              {showSearch && (
                <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border-b border-white/[0.04]">
                  <Search className="w-3 h-3 text-teal-400/50" />
                  <input
                    id="searchInput"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch(e);
                      if (e.key === "Escape") setShowSearch(false);
                    }}
                    placeholder="Search code... (Press Enter for next)"
                    className="bg-transparent border-none outline-none text-[11px] text-white/80 w-full placeholder:text-white/20 font-mono"
                  />
                  {searchQuery && (
                    <span className="text-[9px] text-white/30 whitespace-nowrap">
                      Enter to find next
                    </span>
                  )}
                </div>
              )}

              {/* Textarea */}
              <div className="flex-1 relative min-h-0">
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  onKeyDown={handleKeyDown}
                  spellCheck={false}
                  placeholder="Paste your Remotion code from the GPT here..."
                  className="absolute inset-0 w-full h-full bg-transparent resize-none font-mono text-[11.5px] leading-relaxed text-teal-300/80 p-4 focus:outline-none placeholder:text-white/10"
                  style={{ tabSize: 2, caretColor: "#14b8a6" }}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="shrink-0 flex items-start gap-2 px-3 py-2.5 bg-red-500/10 border-t border-red-500/20">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] text-red-400/80 font-mono leading-snug break-all">
                    {error}
                  </p>
                </div>
              )}

              {/* Footer hint */}
              <div className="shrink-0 px-3 py-2 border-t border-white/[0.04] bg-black/20">
                <p className="text-[10px] text-white/20 leading-relaxed">
                  Get code from the{" "}
                  <a
                    href={GPT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400/60 hover:text-teal-400 underline underline-offset-2 transition-colors"
                  >
                    DeepShark GPT
                  </a>{" "}
                  → paste here → press{" "}
                  <kbd className="px-1 py-0.5 rounded bg-white/10 font-mono text-[9px] text-white/40">
                    ⌘↵
                  </kbd>
                </p>
              </div>
            </div>
          )}

          {/* ── GUIDE TAB ── */}
          {activeTab === "guide" && (
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
              {/* GPT link card */}
              <a
                href={GPT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/15 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    Remotion DeepShark AI
                  </p>
                  <p className="text-[11px] text-teal-400/60 truncate">
                    ChatGPT Custom GPT · Free to use
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-teal-400/40 group-hover:text-teal-400 transition-colors shrink-0" />
              </a>

              {/* Steps */}
              {[
                {
                  n: "1",
                  title: "Open the GPT",
                  body: "Click the card above to open the Remotion DeepShark AI GPT in ChatGPT.",
                },
                {
                  n: "2",
                  title: "Describe your animation",
                  body: "Specify the aspect ratio and duration in your prompt! (e.g. 'Make a 9:16 video for 5 seconds').",
                },
                {
                  n: "3",
                  title: "Paste & Adjust Settings",
                  body: "Paste the code, select the matching Aspect Ratio/Duration below the player, and press Run.",
                },
              ].map(({ n, title, body }) => (
                <div
                  key={n}
                  className="flex gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                >
                  <div className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-[10px] font-bold text-teal-400 shrink-0 mt-0.5">
                    {n}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white mb-0.5">
                      {title}
                    </p>
                    <p className="text-[11px] text-white/40 leading-relaxed">
                      {body}
                    </p>
                  </div>
                </div>
              ))}

              {/* Example prompts */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
                  Example prompts to try
                </p>
                <div className="space-y-1.5">
                  {EXAMPLE_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        navigator.clipboard.writeText(p);
                        toast.success("Copied!");
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors text-left group"
                    >
                      <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-teal-400 shrink-0 transition-colors" />
                      <span className="text-[11px] text-white/40 group-hover:text-white/60 transition-colors flex-1">
                        {p}
                      </span>
                      <Copy className="w-2.5 h-2.5 text-white/0 group-hover:text-white/25 shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Available globals */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2.5">
                  Available in code
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "AbsoluteFill",
                    "useCurrentFrame",
                    "useVideoConfig",
                    "spring",
                    "interpolate",
                    "Easing",
                    "Sequence",
                    "Series",
                    "Loop",
                    "random",
                    "Audio",
                    "Img",
                    "Video",
                  ].map((g) => (
                    <span
                      key={g}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 border border-white/[0.06] text-teal-400/60"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── ASSETS TAB ── */}
          {activeTab === "assets" && (
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-6 text-center shadow-inner">
                <UploadCloud className="w-8 h-8 text-teal-400/60 mx-auto mb-2" />
                <p className="text-sm font-semibold text-white mb-1">
                  Upload Local Media
                </p>
                <p className="text-[11px] text-white/40 mb-4 max-w-xs mx-auto">
                  Upload images or videos directly from your PC. We will
                  automatically rename them so you can use them easily in your
                  code!
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold rounded-lg hover:bg-teal-500/30 transition-colors active:scale-95"
                >
                  Browse Files
                </button>
              </div>

              {assets.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative rounded-lg border border-white/[0.06] bg-black/40 overflow-hidden flex flex-col"
                    >
                      {/* Preview Box */}
                      <div className="aspect-video bg-black/50 flex items-center justify-center overflow-hidden">
                        {asset.type === "image" ? (
                          <img
                            src={asset.url}
                            alt={asset.name}
                            className="w-full h-full object-cover opacity-80"
                          />
                        ) : (
                          <video
                            src={asset.url}
                            className="w-full h-full object-cover opacity-80"
                          />
                        )}
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between p-2 bg-white/[0.03]">
                        <p className="text-[10px] font-mono text-teal-300 truncate pr-2">
                          /{asset.name}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`/${asset.name}`);
                              toast.success("Copied to clipboard!");
                            }}
                            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            title="Copy Name"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeAsset(asset.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Player */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-8 relative h-[48%] lg:h-full overflow-hidden">
          {/* Subtle grid bg */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-conic-gradient(rgba(255,255,255,.04) 0% 25%, transparent 0% 50%)",
              backgroundSize: "20px 20px",
            }}
          />

          {compiled ? (
            <div className="relative z-10 w-full max-w-2xl flex flex-col gap-2">
              {/* Player */}
              <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl flex items-center justify-center">
                <div
                  ref={containerRef} // 🌟 MOVED HERE: Now it captures the exact aspect ratio without black bars!
                  className="relative flex items-center justify-center bg-black overflow-hidden"
                  style={{
                    aspectRatio: `${dimensions.w} / ${dimensions.h}`,
                    maxHeight: "100%",
                    maxWidth: "100%",
                    height: "100%",
                  }}
                >
                  <Player
                    ref={playerRef}
                    component={compiled}
                    durationInFrames={DURATION_FRAMES}
                    fps={FPS}
                    compositionWidth={dimensions.w}
                    compositionHeight={dimensions.h}
                    style={{ width: "100%", height: "100%" }}
                    controls={!exporting} // 🌟 NEW: Completely removes the timeline/play buttons when exporting!
                    loop
                    autoPlay
                    acknowledgeRemotionLicense
                  />
                </div>
              </div>

              {/* Meta row WITH INTERACTIVE CONTROLS */}
              {/* 🌟 FIX: Added flex-wrap, gap-y-2, and w-full so it handles mobile gracefully */}
              <div className="flex flex-wrap items-center justify-between gap-x-1 gap-y-2 px-1 mt-2 w-full">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] text-white/50 font-mono shrink-0">
                  {/* Custom Aspect Ratio Selector */}
                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === "ratio" ? null : "ratio")
                      }
                      className="flex items-center gap-1 sm:gap-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.2] text-white/80 py-1 px-2 sm:px-2.5 rounded-lg transition-all outline-none"
                    >
                      <span className="text-[11px] font-medium whitespace-nowrap">
                        {/* 🌟 FIX: Show short name on mobile, long name on desktop */}
                        <span className="sm:hidden">{ratio}</span>
                        <span className="hidden sm:inline">
                          {ratio === "16:9"
                            ? "16:9 Landscape"
                            : ratio === "9:16"
                              ? "9:16 Vertical"
                              : "1:1 Square"}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-white/40 transition-transform duration-200 shrink-0 ${openMenu === "ratio" ? "rotate-180" : ""}`}
                      />
                    </button>

                    {openMenu === "ratio" && (
                      <div className="absolute bottom-full left-0 mb-1.5 w-32 sm:w-36 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95">
                        {[
                          { v: "16:9", l: "16:9 Landscape" },
                          { v: "9:16", l: "9:16 Vertical" },
                          { v: "1:1", l: "1:1 Square" },
                        ].map((opt) => (
                          <button
                            key={opt.v}
                            onClick={() => {
                              setRatio(opt.v as any);
                              setOpenMenu(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] whitespace-nowrap transition-colors ${ratio === opt.v ? "bg-teal-500/20 text-teal-300 font-medium" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                          >
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div
                    className="relative"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() =>
                        setOpenMenu(openMenu === "duration" ? null : "duration")
                      }
                      className="flex items-center gap-1 sm:gap-1.5 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.2] text-white/80 py-1 px-2 sm:px-2.5 rounded-lg transition-all outline-none"
                    >
                      <span className="text-[11px] font-medium whitespace-nowrap">
                        {durationSec}s
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-white/40 transition-transform duration-200 shrink-0 ${openMenu === "duration" ? "rotate-180" : ""}`}
                      />
                    </button>

                    {openMenu === "duration" && (
                      <div className="absolute bottom-full left-0 mb-1.5 w-16 sm:w-20 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 py-1 animate-in fade-in zoom-in-95">
                        {[3, 5, 10].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => {
                              setDurationSec(opt);
                              setOpenMenu(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${durationSec === opt ? "bg-teal-500/20 text-teal-300 font-medium" : "text-white/60 hover:bg-white/10 hover:text-white"}`}
                          >
                            {opt}s
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 🌟 FIX: Added ml-auto so buttons push right, whitespace-nowrap for text */}
                <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
                  <button
                    onClick={() => playerRef.current?.seekTo(0)}
                    className="text-[10px] text-white/25 hover:text-white/50 transition-colors px-2 py-1 rounded hover:bg-white/5 whitespace-nowrap"
                  >
                    Restart
                  </button>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors px-2 py-1 rounded hover:bg-white/5 whitespace-nowrap"
                  >
                    {copied ? (
                      <Check className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                    ) : (
                      <Copy className="w-2.5 h-2.5 shrink-0" />
                    )}
                    Copy
                  </button>

                  {/* ── EXPORT BUTTON ── */}
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    title="Export animation as WebM video"
                    className="flex items-center gap-1.5 text-[10px] font-medium text-teal-400/70 hover:text-teal-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2.5 py-1 rounded hover:bg-teal-500/10 border border-transparent hover:border-teal-500/20 whitespace-nowrap"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                        <span>{exportProgress}%</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-2.5 h-2.5 shrink-0" />
                        <span>Export</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="relative z-10 flex flex-col items-center gap-4 text-center px-4 max-w-xs">
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                <Play className="w-5 h-5 text-white/15 ml-0.5" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/25 mb-1.5">
                  No animation yet
                </p>
                <p className="text-xs text-white/15 leading-relaxed">
                  Open the GPT, describe your animation, paste the code, and hit
                  Run
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <a
                  href={GPT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 hover:bg-teal-500/25 transition-all"
                >
                  <Bot className="w-3.5 h-3.5" /> Open GPT
                </a>
                <button
                  onClick={() => {
                    resetCode();
                    setTimeout(handleRun, 50);
                  }}
                  className="text-xs text-white/20 hover:text-white/40 transition-colors underline underline-offset-2"
                >
                  Load example
                </button>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-start gap-2.5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-400 mb-0.5">
                  Compilation error
                </p>
                <p className="text-[10.5px] text-red-300/60 font-mono leading-snug break-all">
                  {error}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
