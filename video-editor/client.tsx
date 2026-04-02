"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  X,
  Upload,
  Plus,
  Film,
  Music,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
type SidebarTool =
  | "upload"
  | "audio"
  | "text"
  | "captions"
  | "autozoom"
  | "transitions"
  | "filters"
  | "adjust";
type ActiveTool = "select" | "split";

interface MediaItem {
  id: string;
  name: string;
  url: string;
  duration: number; // seconds
  type: "vid" | "aud";
  size: string;
}

interface ClipStyle {
  scale: number;
  rotation: number;
  opacity: number;
  posX: number;
  posY: number;
  brightness: number;
  contrast: number;
  saturation: number;
  filter: string;
  filterStrength: number;
  speed: number;
  volume: number; // 0–100
}

const DEFAULT_CLIP_STYLE: ClipStyle = {
  scale: 100,
  rotation: 0,
  opacity: 100,
  posX: 0,
  posY: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  filter: "None",
  filterStrength: 100,
  speed: 10,
  volume: 100,
};

// ─── Auto Zoom ────────────────────────────────────────────────────────────────
interface AutoZoomDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  /** p = 0→1 progress through clip duration */
  getTransform: (p: number) => string;
}

const AUTO_ZOOMS: AutoZoomDef[] = [
  {
    id: "ken-burns",
    label: "Ken Burns",
    description: "Slow pan + zoom across clip",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="2"
          width="30"
          height="16"
          rx="2"
          fill="rgba(59,130,246,0.25)"
          stroke="rgba(59,130,246,0.6)"
          strokeWidth="1"
        />
        <rect
          x="4"
          y="5"
          width="14"
          height="10"
          rx="1.5"
          fill="rgba(20,184,166,0.5)"
          stroke="rgba(20,184,166,0.8)"
          strokeWidth="1"
        />
        <path
          d="M20 14l6-8"
          stroke="rgba(20,184,166,0.8)"
          strokeWidth="1.2"
          strokeDasharray="2 1.5"
          strokeLinecap="round"
        />
        <circle
          cx="26"
          cy="6"
          r="2.5"
          fill="none"
          stroke="rgba(20,184,166,0.9)"
          strokeWidth="1.2"
        />
      </svg>
    ),
    getTransform: (p) =>
      `scale(${(1 + p * 0.18).toFixed(4)}) translate(${(p * 12).toFixed(2)}px, ${(p * 6).toFixed(2)}px)`,
  },
  {
    id: "zoom-in",
    label: "Zoom In",
    description: "Gentle scale up over clip",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="4"
          width="30"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.2)"
          stroke="rgba(59,130,246,0.4)"
          strokeWidth="1"
        />
        <rect
          x="8"
          y="6"
          width="16"
          height="8"
          rx="1.5"
          fill="rgba(20,184,166,0.4)"
          stroke="rgba(20,184,166,0.7)"
          strokeWidth="1"
        />
        <path
          d="M16 3v3M13 5l3-2 3 2"
          stroke="rgba(20,184,166,0.9)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    getTransform: (p) => `scale(${(1 + p * 0.22).toFixed(4)})`,
  },
  {
    id: "zoom-out",
    label: "Zoom Out",
    description: "Scale down over clip",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="2"
          width="30"
          height="16"
          rx="2"
          fill="rgba(20,184,166,0.3)"
          stroke="rgba(20,184,166,0.6)"
          strokeWidth="1"
        />
        <rect
          x="8"
          y="6"
          width="16"
          height="8"
          rx="1.5"
          fill="rgba(59,130,246,0.35)"
          stroke="rgba(59,130,246,0.6)"
          strokeWidth="1"
        />
        <path
          d="M16 17v-3M13 15l3 2 3-2"
          stroke="rgba(59,130,246,0.9)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    getTransform: (p) => `scale(${(1.22 - p * 0.22).toFixed(4)})`,
  },
  {
    id: "pulse",
    label: "Pulse",
    description: "Quick zoom bounce at midpoint",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="4"
          width="30"
          height="12"
          rx="2"
          fill="rgba(99,102,241,0.2)"
          stroke="rgba(99,102,241,0.4)"
          strokeWidth="1"
        />
        <path
          d="M2 10 Q8 10 12 4 Q16 10 20 16 Q24 10 30 10"
          stroke="rgba(20,184,166,0.9)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
    getTransform: (p) => {
      const bell = Math.exp(-Math.pow((p - 0.5) * 4, 2));
      return `scale(${(1 + bell * 0.18).toFixed(4)})`;
    },
  },
  {
    id: "push-in",
    label: "Push In",
    description: "Fast zoom in at end of clip",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="4"
          width="30"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.2)"
          stroke="rgba(59,130,246,0.4)"
          strokeWidth="1"
        />
        <rect
          x="12"
          y="6"
          width="8"
          height="8"
          rx="1"
          fill="rgba(20,184,166,0.6)"
          stroke="rgba(20,184,166,0.9)"
          strokeWidth="1"
        />
        <path
          d="M24 10h5M26 8l3 2-3 2"
          stroke="rgba(20,184,166,0.9)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    getTransform: (p) => `scale(${(1 + p * p * 0.3).toFixed(4)})`,
  },
  {
    id: "pull-out",
    label: "Pull Out",
    description: "Fast zoom out at start",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="2"
          width="30"
          height="16"
          rx="2"
          fill="rgba(20,184,166,0.25)"
          stroke="rgba(20,184,166,0.5)"
          strokeWidth="1"
        />
        <rect
          x="12"
          y="6"
          width="8"
          height="8"
          rx="1"
          fill="rgba(59,130,246,0.5)"
          stroke="rgba(59,130,246,0.8)"
          strokeWidth="1"
        />
        <path
          d="M8 10H3M5 8L2 10l3 2"
          stroke="rgba(59,130,246,0.9)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    getTransform: (p) => {
      const ease = 1 - (1 - p) * (1 - p);
      return `scale(${(1.3 - ease * 0.3).toFixed(4)})`;
    },
  },
  {
    id: "drift-left",
    label: "Drift Left",
    description: "Pan slowly left while zoomed",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="4"
          width="30"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.15)"
          stroke="rgba(59,130,246,0.35)"
          strokeWidth="1"
        />
        <rect
          x="8"
          y="5"
          width="18"
          height="10"
          rx="1.5"
          fill="rgba(99,102,241,0.4)"
          stroke="rgba(99,102,241,0.7)"
          strokeWidth="1"
        />
        <path
          d="M18 10H6M9 7l-3 3 3 3"
          stroke="rgba(99,102,241,0.9)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    getTransform: (p) =>
      `scale(1.12) translate(${(-p * 14).toFixed(2)}px, 0px)`,
  },
  {
    id: "drift-right",
    label: "Drift Right",
    description: "Pan slowly right while zoomed",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="1"
          y="4"
          width="30"
          height="12"
          rx="2"
          fill="rgba(20,184,166,0.15)"
          stroke="rgba(20,184,166,0.35)"
          strokeWidth="1"
        />
        <rect
          x="6"
          y="5"
          width="18"
          height="10"
          rx="1.5"
          fill="rgba(20,184,166,0.4)"
          stroke="rgba(20,184,166,0.7)"
          strokeWidth="1"
        />
        <path
          d="M14 10h12M23 7l3 3-3 3"
          stroke="rgba(20,184,166,0.9)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    getTransform: (p) => `scale(1.12) translate(${(p * 14).toFixed(2)}px, 0px)`,
  },
];

// ─── Applied Auto Zoom (per-clip, multiple allowed) ──────────────────────────
interface AppliedAutoZoom {
  id: string; // unique instance id
  type: string; // AutoZoomDef id
  startSec: number; // seconds from clip start
  endSec: number; // seconds from clip start
}

interface Clip {
  id: string;
  name: string;
  trackId: string;
  start: number;
  end: number;
  type: "vid" | "aud" | "txt" | "fx";
  selected: boolean;
  url?: string;
  sourceDuration?: number;
  sourceOffset?: number;
  autoZooms?: AppliedAutoZoom[];
  style?: ClipStyle;
  mirrored?: boolean;
  reversed?: boolean;
  crop?: { top: number; right: number; bottom: number; left: number };
}

interface Track {
  id: string;
  label: string;
  type: "vid" | "aud" | "txt" | "fx";
}

interface TransitionDef {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  cssClass: string;
}

interface AppliedTransition {
  id: string;
  type: string;
  clipAId: string;
  clipBId: string;
  duration: number;
}

const TRANSITIONS: TransitionDef[] = [
  {
    id: "fade",
    label: "Fade",
    description: "Smooth opacity crossfade",
    cssClass: "transition-fade",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="14"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.8)"
        />
        <rect
          x="10"
          y="4"
          width="14"
          height="12"
          rx="2"
          fill="rgba(20,184,166,0.5)"
        />
        <rect
          x="18"
          y="4"
          width="14"
          height="12"
          rx="2"
          fill="rgba(20,184,166,0.9)"
        />
      </svg>
    ),
  },
  {
    id: "dissolve",
    label: "Dissolve",
    description: "Pixel-level dissolve",
    cssClass: "transition-dissolve",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="32"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.3)"
        />
        {[4, 8, 12, 16, 20, 24, 28].map((x, i) => (
          <rect
            key={i}
            x={x}
            y={i % 2 === 0 ? 5 : 9}
            width="3"
            height="3"
            rx="0.5"
            fill={i < 4 ? "rgba(59,130,246,0.9)" : "rgba(20,184,166,0.9)"}
          />
        ))}
      </svg>
    ),
  },
  {
    id: "slide-left",
    label: "Slide Left",
    description: "New clip slides in from right",
    cssClass: "transition-slide-left",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="14"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.8)"
        />
        <rect
          x="12"
          y="4"
          width="20"
          height="12"
          rx="2"
          fill="rgba(20,184,166,0.9)"
        />
        <path
          d="M20 10h8M25 7l3 3-3 3"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "slide-right",
    label: "Slide Right",
    description: "New clip slides in from left",
    cssClass: "transition-slide-right",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="18"
          y="4"
          width="14"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.8)"
        />
        <rect
          x="0"
          y="4"
          width="20"
          height="12"
          rx="2"
          fill="rgba(20,184,166,0.9)"
        />
        <path
          d="M12 10H4M7 7L4 10l3 3"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "zoom-in",
    label: "Zoom In",
    description: "Next clip zooms into frame",
    cssClass: "transition-zoom-in",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="32"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.4)"
        />
        <rect
          x="11"
          y="6"
          width="10"
          height="8"
          rx="1.5"
          fill="rgba(20,184,166,0.95)"
        />
      </svg>
    ),
  },
  {
    id: "zoom-out",
    label: "Zoom Out",
    description: "Current clip zooms out",
    cssClass: "transition-zoom-out",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="32"
          height="12"
          rx="2"
          fill="rgba(20,184,166,0.9)"
        />
        <rect
          x="6"
          y="2"
          width="20"
          height="16"
          rx="2"
          fill="rgba(59,130,246,0.5)"
        />
      </svg>
    ),
  },
  {
    id: "blur",
    label: "Blur",
    description: "Gaussian blur transition",
    cssClass: "transition-blur",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="14"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.8)"
        />
        <rect
          x="9"
          y="2"
          width="14"
          height="16"
          rx="4"
          fill="rgba(99,102,241,0.5)"
        />
        <rect
          x="18"
          y="4"
          width="14"
          height="12"
          rx="2"
          fill="rgba(20,184,166,0.8)"
        />
      </svg>
    ),
  },
  {
    id: "wipe-left",
    label: "Wipe Left",
    description: "Hard edge wipes left to right",
    cssClass: "transition-wipe-left",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="32"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.8)"
        />
        <rect
          x="16"
          y="4"
          width="16"
          height="12"
          rx="0"
          fill="rgba(20,184,166,0.9)"
        />
        <line x1="16" y1="3" x2="16" y2="17" stroke="white" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "flash",
    label: "Flash",
    description: "White flash between clips",
    cssClass: "transition-flash",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="32"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.5)"
        />
        <rect
          x="13"
          y="2"
          width="6"
          height="16"
          rx="2"
          fill="rgba(255,255,255,0.95)"
        />
      </svg>
    ),
  },
  {
    id: "cross-zoom",
    label: "Cross Zoom",
    description: "Both clips zoom through each other",
    cssClass: "transition-cross-zoom",
    icon: (
      <svg width="32" height="20" viewBox="0 0 32 20" fill="none">
        <rect
          x="0"
          y="4"
          width="32"
          height="12"
          rx="2"
          fill="rgba(59,130,246,0.4)"
        />
        <rect
          x="8"
          y="6"
          width="16"
          height="8"
          rx="2"
          fill="rgba(59,130,246,0.85)"
        />
        <rect
          x="12"
          y="7"
          width="8"
          height="6"
          rx="1.5"
          fill="rgba(20,184,166,0.95)"
        />
      </svg>
    ),
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_TOTAL_SEC = 120;
const MAX_CLIP_SEC = 120;
const LABEL_W = 56;
const FILTERS = [
  "None",
  "Vivid",
  "Matte",
  "B&W",
  "Warm",
  "Cool",
  "Fade",
  "Drama",
  "Neon",
];

const CLIP_COLORS: Record<
  Clip["type"],
  { bg: string; border: string; text: string; wave: string }
> = {
  vid: {
    bg: "rgba(37,99,235,0.72)",
    border: "rgba(59,130,246,0.7)",
    text: "#bfdbfe",
    wave: "#3b82f6",
  },
  aud: {
    bg: "rgba(5,150,105,0.72)",
    border: "rgba(16,185,129,0.7)",
    text: "#a7f3d0",
    wave: "#34d399",
  },
  txt: {
    bg: "rgba(109,40,217,0.72)",
    border: "rgba(139,92,246,0.7)",
    text: "#ddd6fe",
    wave: "#a78bfa",
  },
  fx: {
    bg: "rgba(161,58,8,0.72)",
    border: "rgba(217,119,6,0.6)",
    text: "#fde68a",
    wave: "#fbbf24",
  },
};

const waveCache: Record<string, number[]> = {};
function getWave(id: string) {
  if (!waveCache[id])
    waveCache[id] = Array.from({ length: 60 }, () => 4 + Math.random() * 20);
  return waveCache[id];
}
function fmtBytes(b: number) {
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + " KB";
  return (b / (1024 * 1024)).toFixed(1) + " MB";
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VideoEditorClient() {
  const router = useRouter();
  const [showBackModal, setShowBackModal] = useState(false);

  // playback
  const [playing, setPlaying] = useState(false);
  const [currentSec, setCurrentSec_] = useState(0);
  const setCurrentSec = (v: number) => {
    currentSecRef.current = v;
    setCurrentSec_(v);
  };
  const [playingClipId, setPlayingClipId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gapTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tools
  const [sidebarTool, setSidebarTool] = useState<SidebarTool>("upload");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");

  // media library
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio library
  const [audioItems, setAudioItems] = useState<MediaItem[]>([]);
  const [audioUploading, setAudioUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Transitions
  const [appliedTransitions, setAppliedTransitions] = useState<
    AppliedTransition[]
  >([]);
  const appliedTransitionsRef = useRef<AppliedTransition[]>([]);
  useEffect(() => {
    appliedTransitionsRef.current = appliedTransitions;
  }, [appliedTransitions]);
  const draggingTransitionRef = useRef<TransitionDef | null>(null);
  const [dragOverCutId, setDragOverCutId] = useState<string | null>(null);

  // Auto Zoom
  const draggingAutoZoomRef = useRef<AutoZoomDef | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);
  const autoZoomTransformRef = useRef<string>("");

  // zoom
  const [pxPerSec, setPxPerSec] = useState(20);

  // tracks
  const [tracks] = useState<Track[]>([
    { id: "trk-t", label: "Text", type: "txt" },
    { id: "trk-v", label: "Video 1", type: "vid" },
    { id: "trk-a", label: "Audio", type: "aud" },
  ]);

  const [clips, setClips] = useState<Clip[]>([]);

  // right panel
  const [globalStyle, setGlobalStyle] = useState<ClipStyle>({
    ...DEFAULT_CLIP_STYLE,
  });
  const [mobileTab, setMobileTab] = useState("Video");
  const [aspectRatio, setAspectRatio] = useState<
    "16:9" | "9:16" | "1:1" | "4:3"
  >("16:9");
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropDraft, setCropDraft] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });
  const [videoDims, setVideoDims] = useState({ w: 1920, h: 1080 });

  const totalSec = useMemo(() => {
    if (clips.length === 0) return DEFAULT_TOTAL_SEC;
    const furthest = clips.reduce((m, c) => Math.max(m, c.end), 0);
    const raw = Math.min(furthest + 5, MAX_CLIP_SEC);
    return Math.max(DEFAULT_TOTAL_SEC, Math.round(raw * 10) / 10);
  }, [clips]);

  const projectEnd = useMemo(() => {
    if (clips.length === 0) return DEFAULT_TOTAL_SEC;
    return Math.round(clips.reduce((m, c) => Math.max(m, c.end), 0) * 10) / 10;
  }, [clips]);

  // drag refs
  const laneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRAF = useRef<number | null>(null);
  const clipsRef = useRef<Clip[]>([]);
  const playingClipIdRef = useRef<string | null>(null);
  const totalSecRef = useRef<number>(DEFAULT_TOTAL_SEC);
  const projectEndRef = useRef<number>(DEFAULT_TOTAL_SEC);
  const pendingSeekRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentSecRef = useRef<number>(0);
  const activeSpeedRef = useRef<number>(10);
  const transitioningRef = useRef(false);
  const draggingMediaRef = useRef<MediaItem | null>(null);
  const wasPlayingRef = useRef(false);
  const dragState = useRef<{
    type: "move" | "trim-l" | "trim-r" | "playhead";
    clipId?: string;
    startX: number;
    origStart?: number;
    origEnd?: number;
    origPH?: number;
    sourceDuration?: number;
    origSourceOffset?: number;
    _lastClientX?: number;
  } | null>(null);

  // ── helpers ─────────────────────────────────────────────────────────────
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const fmt = (s: number) => `${pad(s / 60)}:${pad(s % 60)}`;
  const fmtTC = (s: number) => `00:${pad(s / 60)}:${pad(s % 60)}`;
  const secToPx = (s: number) => s * pxPerSec;
  const pxToSec = (px: number) => px / pxPerSec;
  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));
  const snap = (s: number) => Math.round(s * 10) / 10;

  const previewUrl = clips.find((c) => c.id === playingClipId)?.url ?? null;

  const setPlayingClip = useCallback((clip: Clip | null) => {
    const id = clip?.id ?? null;
    playingClipIdRef.current = id;
    setPlayingClipId(id);
  }, []);

  const TIMELINE_PAD_PX = 48;
  const totalW = secToPx(totalSec) + TIMELINE_PAD_PX;
  const selectedClip = clips.find((c) => c.selected) ?? null;

  const inVideoGap =
    clips.filter((c) => c.type === "vid" && c.url).length > 0 &&
    !clips.some(
      (c) =>
        c.type === "vid" &&
        c.url &&
        currentSec >= c.start &&
        currentSec < c.end,
    );

  const hasClips = clips.length > 0;
  const activeStyle: ClipStyle = selectedClip?.style ?? globalStyle;

  const playingVidClip = clips.find(
    (c) =>
      c.type === "vid" && c.url && currentSec >= c.start && currentSec < c.end,
  );
  const playingAudClip = clips.find(
    (c) =>
      c.type === "aud" && c.url && currentSec >= c.start && currentSec < c.end,
  );
  const playingClipStyle: ClipStyle =
    playingVidClip?.style ?? playingAudClip?.style ?? globalStyle;

  // ── Ripple helper ────────────────────────────────────────────────────────
  const rippleTrack = (
    allClips: Clip[],
    changedId: string,
    oldEnd: number,
    newEnd: number,
  ): Clip[] => {
    const delta = snap(newEnd - oldEnd);
    if (Math.abs(delta) < 0.01) return allClips;
    const changed = allClips.find((c) => c.id === changedId)!;
    const TOUCH_EPSILON = 0.15;
    const movers = new Set(
      allClips
        .filter(
          (c) =>
            c.trackId === changed.trackId &&
            c.id !== changedId &&
            c.start >= oldEnd - TOUCH_EPSILON,
        )
        .map((c) => c.id),
    );
    return allClips.map((c) => {
      if (!movers.has(c.id)) return c;
      const newStart = snap(Math.max(0, c.start + delta));
      const dur = Math.max(0.1, c.end - c.start);
      return { ...c, start: newStart, end: snap(newStart + dur) };
    });
  };

  const setStyleProp = <K extends keyof ClipStyle>(
    key: K,
    value: ClipStyle[K],
  ) => {
    if (!selectedClip) {
      if (key !== "speed")
        setGlobalStyle((prev) => ({ ...prev, [key]: value }));
      return;
    }
    setClips((prev) => {
      const target = prev.find((c) => c.id === selectedClip.id);
      if (!target) return prev;
      const newStyle: ClipStyle = {
        ...(target.style ?? { ...DEFAULT_CLIP_STYLE }),
        [key]: value,
      };
      let newEnd = target.end;
      if (key === "speed" && target.sourceDuration !== undefined) {
        const speedMult = (value as number) / 10;
        const realDuration = target.sourceDuration / speedMult;
        newEnd = snap(
          Math.min(
            Math.max(target.start + 0.1, target.start + realDuration),
            MAX_CLIP_SEC,
          ),
        );
      }
      const updated = prev.map((c) =>
        c.id === selectedClip.id ? { ...c, end: newEnd, style: newStyle } : c,
      );
      return rippleTrack(updated, selectedClip.id, target.end, newEnd);
    });
  };

  const resetClipStyle = () => {
    if (!selectedClip) return;
    setClips((prev) => {
      const target = prev.find((c) => c.id === selectedClip.id);
      if (!target) return prev;
      const restoredEnd =
        target.sourceDuration !== undefined
          ? snap(
              Math.min(
                Math.max(
                  target.start + 0.1,
                  target.start + target.sourceDuration,
                ),
                MAX_CLIP_SEC,
              ),
            )
          : Math.max(target.end, target.start + 0.1);
      const updated = prev.map((c) =>
        c.id === selectedClip.id
          ? { ...c, style: undefined, end: restoredEnd }
          : c,
      );
      return rippleTrack(updated, selectedClip.id, target.end, restoredEnd);
    });
  };

  const buildCSSFilter = (s: ClipStyle): string => {
    const t = (s.filterStrength ?? 100) / 100;
    const lerp = (neutral: number, full: number) =>
      neutral + (full - neutral) * t;
    type FilterDef = {
      saturate?: number;
      contrast?: number;
      brightness?: number;
      grayscale?: number;
      sepia?: number;
      hueRotate?: number;
    };
    const presetFull: Record<string, FilterDef> = {
      None: {},
      Vivid: { saturate: 1.8, contrast: 1.1 },
      Matte: { contrast: 0.9, saturate: 0.8, brightness: 1.05 },
      "B&W": { grayscale: 1 },
      Warm: { sepia: 0.3, saturate: 1.2 },
      Cool: { hueRotate: 20, saturate: 1.1 },
      Fade: { contrast: 0.85, brightness: 1.1, saturate: 0.9 },
      Drama: { contrast: 1.4, saturate: 1.3, brightness: 0.9 },
      Neon: { saturate: 2.0, brightness: 1.1, contrast: 1.2 },
    };
    const preset = presetFull[s.filter] ?? {};
    const parts: string[] = [];
    const br = 1 + s.brightness / 100;
    const cn = 1 + s.contrast / 100;
    const sa = 1 + s.saturation / 100;
    const finalBr = br * lerp(1, preset.brightness ?? 1);
    const finalCn = cn * lerp(1, preset.contrast ?? 1);
    const finalSa = sa * lerp(1, preset.saturate ?? 1);
    const finalGs = lerp(0, preset.grayscale ?? 0);
    const finalSe = lerp(0, preset.sepia ?? 0);
    const finalHr = lerp(0, preset.hueRotate ?? 0);
    if (Math.abs(finalBr - 1) > 0.001)
      parts.push(`brightness(${finalBr.toFixed(3)})`);
    if (Math.abs(finalCn - 1) > 0.001)
      parts.push(`contrast(${finalCn.toFixed(3)})`);
    if (Math.abs(finalSa - 1) > 0.001)
      parts.push(`saturate(${finalSa.toFixed(3)})`);
    if (finalGs > 0.001) parts.push(`grayscale(${finalGs.toFixed(3)})`);
    if (finalSe > 0.001) parts.push(`sepia(${finalSe.toFixed(3)})`);
    if (Math.abs(finalHr) > 0.1)
      parts.push(`hue-rotate(${finalHr.toFixed(1)}deg)`);
    return parts.join(" ");
  };

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);
  useEffect(() => {
    totalSecRef.current = totalSec;
  }, [totalSec]);
  useEffect(() => {
    projectEndRef.current = projectEnd;
  }, [projectEnd]);
  useEffect(() => {
    playingClipIdRef.current = playingClipId;
  }, [playingClipId]);

  useEffect(() => {
    if (currentSecRef.current > projectEnd) {
      const clamped = projectEnd;
      currentSecRef.current = clamped;
      setCurrentSec_(clamped);
      if (!playing && videoRef.current) {
        videoRef.current.pause();
        syncAudio(clamped, false);
      }
    }
  }, [projectEnd]);

  const playingClipStyleRef = useRef<ClipStyle>(globalStyle);
  useEffect(() => {
    playingClipStyleRef.current = playingClipStyle;
  }, [playingClipStyle]);

  // ── Canvas-based transition compositor ───────────────────────────────────
  const transitionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const transitionCanvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const transitionFramesRef = useRef<Map<string, ImageBitmap>>(new Map());
  const transitionFramesPendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const frames = transitionFramesRef.current;
    const pending = transitionFramesPendingRef.current;
    const vidClips = clipsRef.current
      .filter((c) => c.type === "vid" && c.url)
      .sort((a, b) => a.start - b.start);
    for (const [id] of frames) {
      if (!appliedTransitions.find((at) => at.id === id)) {
        frames.get(id)?.close();
        frames.delete(id);
        pending.delete(id);
      }
    }
    for (const at of appliedTransitions) {
      if (frames.has(at.id) || pending.has(at.id)) continue;
      const clipB = vidClips.find((c) => c.id === at.clipBId);
      if (!clipB?.url) continue;
      pending.add(at.id);
      const vid = document.createElement("video");
      vid.src = clipB.url;
      vid.muted = true;
      vid.preload = "auto";
      vid.playsInline = true;
      vid.crossOrigin = "anonymous";
      const captureFrame = async () => {
        try {
          const targetT = clipB.sourceOffset ?? 0;
          vid.currentTime = targetT;
          await new Promise<void>((res, rej) => {
            const onSeeked = () => {
              vid.removeEventListener("seeked", onSeeked);
              res();
            };
            const onErr = () => {
              vid.removeEventListener("error", onErr);
              rej();
            };
            vid.addEventListener("seeked", onSeeked);
            vid.addEventListener("error", onErr);
            setTimeout(rej, 5000);
          });
          const bitmap = await createImageBitmap(vid);
          frames.set(at.id, bitmap);
        } catch {
        } finally {
          pending.delete(at.id);
          vid.src = "";
          vid.remove();
        }
      };
      vid.addEventListener("loadedmetadata", captureFrame, { once: true });
      vid.load();
    }
  }, [appliedTransitions]);

  const preloadVideoRef = useRef<HTMLVideoElement | null>(null);
  const preloadedClipIdRef = useRef<string | null>(null);

  const tickTransitions = useCallback(
    (globalT: number, vOut: HTMLVideoElement) => {
      const vidClips = clipsRef.current
        .filter((c) => c.type === "vid" && c.url)
        .sort((a, b) => a.start - b.start);
      let foundTransition = false;
      for (let i = 0; i < vidClips.length - 1; i++) {
        const clipA = vidClips[i];
        const clipB = vidClips[i + 1];
        if (clipB.start - clipA.end > 0.15) continue;
        const at = appliedTransitionsRef.current.find(
          (t) => t.clipAId === clipA.id && t.clipBId === clipB.id,
        );
        if (!at) continue;
        const cut = clipA.end;
        const dist = globalT - cut;
        const PRELOAD_AHEAD = 1.0;
        if (
          dist >= -(at.duration + PRELOAD_AHEAD) &&
          preloadedClipIdRef.current !== clipB.id
        ) {
          if (!preloadVideoRef.current) {
            const pv = document.createElement("video");
            pv.muted = true;
            pv.preload = "auto";
            pv.playsInline = true;
            pv.style.cssText =
              "position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:-9999px;left:-9999px;";
            document.body.appendChild(pv);
            preloadVideoRef.current = pv;
          }
          const pv = preloadVideoRef.current;
          if (pv.dataset.src !== clipB.url) {
            pv.dataset.src = clipB.url!;
            pv.src = clipB.url!;
            const targetOffset = clipB.sourceOffset ?? 0;
            pv.onloadedmetadata = () => {
              pv.currentTime = targetOffset;
            };
            pv.load();
          }
          preloadedClipIdRef.current = clipB.id;
        }
        if (dist < -at.duration || dist > 0) continue;
        foundTransition = true;
        const p = Math.max(0, Math.min(1, (dist + at.duration) / at.duration));
        const ep = p * p * (3 - 2 * p);
        const previewEl = vOut.parentElement;
        const rect = previewEl?.getBoundingClientRect();
        if (!rect) continue;
        let wrapper = (transitionCanvasRef.current as any)?._wrapper as
          | HTMLDivElement
          | undefined;
        let canvas = transitionCanvasRef.current;
        if (!canvas) {
          const newWrapper = document.createElement("div");
          newWrapper.style.cssText =
            "position:fixed;pointer-events:none;z-index:9999;overflow:hidden;border-radius:12px;";
          const newCanvas = document.createElement("canvas");
          newCanvas.style.cssText =
            "position:absolute;top:0;left:0;width:100%;height:100%;transform-origin:center center;";
          newWrapper.appendChild(newCanvas);
          document.body.appendChild(newWrapper);
          transitionCanvasRef.current = newCanvas;
          (newCanvas as any)._wrapper = newWrapper;
          transitionCanvasCtxRef.current = newCanvas.getContext("2d");
          canvas = newCanvas;
          wrapper = newWrapper;
        }
        if (!wrapper) wrapper = (canvas as any)._wrapper as HTMLDivElement;
        if (!wrapper) continue;
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (canvas.width !== w) canvas.width = w;
        if (canvas.height !== h) canvas.height = h;
        wrapper.style.top = `${rect.top}px`;
        wrapper.style.left = `${rect.left}px`;
        wrapper.style.width = `${rect.width}px`;
        wrapper.style.height = `${rect.height}px`;
        const ctx = transitionCanvasCtxRef.current!;
        const frame = transitionFramesRef.current.get(at.id);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (frame) {
          ctx.globalAlpha = 1;
          ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        }
        const o = (v: number) => v.toFixed(3);
        const pct = (v: number) => v.toFixed(1) + "%";
        canvas.style.transform = "none";
        canvas.style.clipPath = "none";
        canvas.style.filter = "none";
        switch (at.type) {
          case "fade":
          case "dissolve":
            vOut.style.opacity = o(1 - ep);
            vOut.style.transform = vOut.style.filter = vOut.style.clipPath = "";
            canvas.style.opacity = o(ep);
            break;
          case "blur":
            vOut.style.opacity = o(1 - ep);
            vOut.style.filter = `blur(${(ep * 10).toFixed(1)}px)`;
            vOut.style.transform = vOut.style.clipPath = "";
            canvas.style.opacity = o(ep);
            canvas.style.filter = `blur(${((1 - ep) * 10).toFixed(1)}px)`;
            break;
          case "slide-left":
            vOut.style.opacity = "1";
            vOut.style.clipPath = `inset(0 ${pct(ep * 100)} 0 0)`;
            vOut.style.transform = vOut.style.filter = "";
            canvas.style.opacity = "1";
            canvas.style.clipPath = `inset(0 0 0 ${pct((1 - ep) * 100)})`;
            break;
          case "slide-right":
            vOut.style.opacity = "1";
            vOut.style.clipPath = `inset(0 0 0 ${pct(ep * 100)})`;
            vOut.style.transform = vOut.style.filter = "";
            canvas.style.opacity = "1";
            canvas.style.clipPath = `inset(0 ${pct((1 - ep) * 100)} 0 0)`;
            break;
          case "wipe-left":
            vOut.style.opacity = "1";
            vOut.style.transform = vOut.style.filter = vOut.style.clipPath = "";
            canvas.style.opacity = "1";
            canvas.style.clipPath = `inset(0 ${pct((1 - ep) * 100)} 0 0)`;
            break;
          case "zoom-in":
            vOut.style.opacity = o(1 - ep);
            vOut.style.transform = `scale(${(1 + ep * 0.2).toFixed(3)})`;
            vOut.style.filter = vOut.style.clipPath = "";
            canvas.style.opacity = o(ep);
            canvas.style.transform = `scale(${(0.85 + ep * 0.15).toFixed(3)})`;
            break;
          case "zoom-out":
            vOut.style.opacity = o(1 - ep);
            vOut.style.transform = `scale(${(1 - ep * 0.15).toFixed(3)})`;
            vOut.style.filter = vOut.style.clipPath = "";
            canvas.style.opacity = o(ep);
            canvas.style.transform = `scale(${(1.18 - ep * 0.18).toFixed(3)})`;
            break;
          case "flash": {
            const fl = ep < 0.5 ? ep * 2 : (1 - ep) * 2;
            vOut.style.opacity = o(1 - ep);
            vOut.style.filter = `brightness(${(1 + fl * 4).toFixed(2)})`;
            vOut.style.transform = vOut.style.clipPath = "";
            canvas.style.opacity = o(ep);
            canvas.style.filter = `brightness(${(1 + fl * 4).toFixed(2)})`;
            break;
          }
          case "cross-zoom": {
            const zs = (1 + ep * 0.4).toFixed(3);
            vOut.style.opacity = o(1 - ep);
            vOut.style.transform = `scale(${zs})`;
            vOut.style.filter = vOut.style.clipPath = "";
            canvas.style.opacity = o(ep);
            canvas.style.transform = `scale(${zs})`;
            break;
          }
          default:
            vOut.style.opacity = o(1 - ep);
            vOut.style.transform = vOut.style.filter = vOut.style.clipPath = "";
            canvas.style.opacity = o(ep);
        }
        break;
      }
      if (!foundTransition) {
        vOut.style.opacity =
          vOut.style.transform =
          vOut.style.filter =
          vOut.style.clipPath =
            "";
        if (transitionCanvasRef.current) {
          const wrapper = (transitionCanvasRef.current as any)?._wrapper as
            | HTMLDivElement
            | undefined;
          if (wrapper) wrapper.style.opacity = "0";
          else transitionCanvasRef.current.style.opacity = "0";
        }
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (transitionCanvasRef.current) {
        const wrapper = (transitionCanvasRef.current as any)?._wrapper as
          | HTMLDivElement
          | undefined;
        if (wrapper) wrapper.remove();
        else transitionCanvasRef.current.remove();
        transitionCanvasRef.current = null;
      }
      for (const [, bmp] of transitionFramesRef.current) bmp.close();
      transitionFramesRef.current.clear();
      if (preloadVideoRef.current) {
        preloadVideoRef.current.src = "";
        preloadVideoRef.current.remove();
        preloadVideoRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const speed = playingClipStyle.speed / 10;
    const volume = (playingClipStyle.volume ?? 100) / 100;
    activeSpeedRef.current = speed;
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      videoRef.current.volume = volume;
    }
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.volume =
        (playingAudClip?.style?.volume ?? globalStyle.volume ?? 100) / 100;
    }
  }, [
    playingClipStyle.speed,
    playingClipStyle.volume,
    playingAudClip?.style?.volume,
    globalStyle.volume,
  ]);

  // ── Audio sync helper ────────────────────────────────────────────────────
  const syncAudio = useCallback((globalT: number, shouldPlay: boolean) => {
    const audClips = clipsRef.current
      .filter((c) => c.type === "aud" && c.url)
      .sort((a, b) => a.start - b.start);
    const clip = audClips.find((c) => globalT >= c.start && globalT < c.end);
    if (!audioRef.current) return;
    if (!clip?.url) {
      audioRef.current.pause();
      return;
    }
    const offset = (clip.sourceOffset ?? 0) + Math.max(0, globalT - clip.start);
    const vol = (clip.style?.volume ?? globalStyle.volume ?? 100) / 100;
    if (audioRef.current.src !== clip.url) {
      audioRef.current.src = clip.url;
      audioRef.current.load();
      audioRef.current.onloadedmetadata = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = offset;
        audioRef.current.volume = vol;
        if (shouldPlay) audioRef.current.play().catch(() => {});
      };
    } else {
      audioRef.current.currentTime = offset;
      audioRef.current.volume = vol;
      if (shouldPlay) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, []);

  // ── Gap ticker ─────────────────────────────────────────────────────────────
  const stopGapTicker = useCallback(() => {
    if (gapTickerRef.current) {
      clearInterval(gapTickerRef.current);
      gapTickerRef.current = null;
    }
  }, []);

  const startGapTicker = useCallback(
    (fromT: number, nextClipStart: number, onArrive: () => void) => {
      stopGapTicker();
      gapTickerRef.current = setInterval(() => {
        const next = parseFloat((currentSecRef.current + 0.1).toFixed(1));
        if (next >= projectEndRef.current) {
          stopGapTicker();
          setCurrentSec(0);
          syncAudio(0, true);
          return;
        }
        setCurrentSec(next);
        const audClips = clipsRef.current
          .filter((c) => c.type === "aud" && c.url)
          .sort((a, b) => a.start - b.start);
        const audClip = audClips.find((c) => next >= c.start && next < c.end);
        if (audClip?.url) {
          if (
            !audioRef.current ||
            audioRef.current.paused ||
            audioRef.current.src !== audClip.url
          )
            syncAudio(next, true);
        } else if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        if (next >= nextClipStart) {
          stopGapTicker();
          onArrive();
        }
      }, 100);
    },
    [stopGapTicker, syncAudio],
  );

  // ── Central seek helper ───────────────────────────────────────────────────
  const seekTo = (globalT: number, clipsSnapshot?: Clip[]) => {
    const allClips = clipsSnapshot ?? clips;
    const vidClips = allClips
      .filter((c) => c.type === "vid" && c.url)
      .sort((a, b) => a.start - b.start);
    const clip = vidClips.find((c) => globalT >= c.start && globalT < c.end);
    setCurrentSec(parseFloat(globalT.toFixed(1)));
    syncAudio(parseFloat(globalT.toFixed(1)), false);
    if (!clip?.url) {
      if (videoRef.current) videoRef.current.pause();
      return;
    }
    const realOffset = Math.max(0, globalT - clip.start);
    const clipSpeed = (clip.style?.speed ?? globalStyle.speed) / 10;
    const videoOffset = ((clip.sourceOffset ?? 0) + realOffset) * clipSpeed;
    if (clip.url !== previewUrl || clip.id !== playingClipId) {
      setPlayingClip(clip);
      pendingSeekRef.current = videoOffset;
    } else if (videoRef.current) {
      videoRef.current.currentTime = videoOffset;
    }
  };

  // ── tickAutoZooms ─────────────────────────────────────────────────────────
  const tickAutoZooms = useCallback((globalT: number): string => {
    const clip = clipsRef.current
      .filter((c) => c.type === "vid" && c.url)
      .find((c) => c.id === playingClipIdRef.current);
    if (!clip?.autoZooms?.length) return "";
    const clipRelT = globalT - clip.start; // seconds into the clip
    const clipDur = clip.end - clip.start;
    if (clipDur <= 0) return "";
    // Find the first active zoom entry whose time range contains clipRelT
    const active = clip.autoZooms.find(
      (az: AppliedAutoZoom) => clipRelT >= az.startSec && clipRelT < az.endSec,
    );
    if (!active) return "";
    const def = AUTO_ZOOMS.find((az) => az.id === active.type);
    if (!def) return "";
    const zoneDur = active.endSec - active.startSec;
    if (zoneDur <= 0) return "";
    const p = Math.max(0, Math.min(1, (clipRelT - active.startSec) / zoneDur));
    return def.getTransform(p);
  }, []);

  // Reset auto zoom transform on video element back to base style
  const resetAutoZoomTransform = useCallback(() => {
    autoZoomTransformRef.current = "";
    if (videoRef.current) {
      const s = playingClipStyleRef.current;
      const mirror = playingClipIdRef.current
        ? clipsRef.current.find((c) => c.id === playingClipIdRef.current)
            ?.mirrored
          ? " scaleX(-1)"
          : ""
        : "";
      videoRef.current.style.transform = `translate(${s.posX}px, ${s.posY}px) scale(${s.scale / 100}) rotate(${s.rotation}deg)${mirror}`;
    }
  }, []);

  const togglePlay = () => {
    if (playing) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      clearInterval(playRef.current!);
      stopGapTicker();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      resetAutoZoomTransform();
      setPlaying(false);
      return;
    }
    const vidClips = clips
      .filter((c) => c.type === "vid" && c.url)
      .sort((a, b) => a.start - b.start);
    const activeClip = vidClips.find(
      (c) => currentSec >= c.start && currentSec < c.end,
    );
    const nextClip = vidClips.find((c) => c.start > currentSec);
    if (activeClip?.url) {
      syncAudio(currentSec, true);
      const realOffset = Math.max(0, currentSec - activeClip.start);
      const clipStyle = activeClip.style ?? globalStyle;
      const clipSpeed = clipStyle.speed / 10;
      const clipVolume = (clipStyle.volume ?? 100) / 100;
      const videoOffset =
        ((activeClip.sourceOffset ?? 0) + realOffset) * clipSpeed;
      const doPlay = () => {
        if (videoRef.current) {
          videoRef.current.currentTime = videoOffset;
          videoRef.current.playbackRate = clipSpeed;
          videoRef.current.volume = clipVolume;
          videoRef.current
            .play()
            .then(() => startRafTicker())
            .catch(() => {});
          setPlaying(true);
        }
      };
      if (playingClipId !== activeClip.id) {
        pendingSeekRef.current = videoOffset;
        setPlayingClip(activeClip);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current
              .play()
              .then(() => startRafTicker())
              .catch(() => {});
            setPlaying(true);
          }
        }, 120);
      } else {
        doPlay();
      }
    } else if (nextClip?.url) {
      setPlaying(true);
      syncAudio(currentSec, true);
      startGapTicker(currentSec, nextClip.start, () => {
        setPlayingClip(nextClip);
        pendingSeekRef.current = 0;
        syncAudio(nextClip.start, true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.playbackRate = activeStyle.speed / 10;
            videoRef.current
              .play()
              .then(() => startRafTicker())
              .catch(() => {});
          }
        }, 80);
      });
    } else {
      setPlaying(true);
      playRef.current = setInterval(() => {
        const next = parseFloat((currentSecRef.current + 0.1).toFixed(1));
        if (next >= projectEndRef.current) {
          setCurrentSec(0);
          if (audioRef.current) audioRef.current.pause();
          syncAudio(0, true);
        } else {
          setCurrentSec(next);
          if (audioRef.current) {
            const audClips = clipsRef.current
              .filter((c) => c.type === "aud" && c.url)
              .sort((a, b) => a.start - b.start);
            const audClip = audClips.find(
              (c) => next >= c.start && next < c.end,
            );
            if (audClip?.url) {
              if (audioRef.current.src !== audClip.url) syncAudio(next, true);
              else if (audioRef.current.paused)
                audioRef.current.play().catch(() => {});
            } else if (!audioRef.current.paused) audioRef.current.pause();
          }
        }
      }, 100);
    }
  };

  useEffect(
    () => () => {
      clearInterval(playRef.current!);
      clearInterval(gapTickerRef.current!);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    },
    [],
  );

  const startRafTicker = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    let audioSyncFrame = 0;
    const tick = () => {
      if (!videoRef.current || videoRef.current.paused) {
        animFrameRef.current = null;
        return;
      }
      const videoT = videoRef.current.currentTime;
      const vidClips = clipsRef.current
        .filter((c) => c.type === "vid" && c.url)
        .sort((a, b) => a.start - b.start);
      const loadedClip = vidClips.find(
        (c) => c.id === playingClipIdRef.current,
      );
      const playbackRate = videoRef.current.playbackRate || 1;
      const realT = videoT / playbackRate;
      const clipRelT = realT - (loadedClip?.sourceOffset ?? 0);
      const globalT = loadedClip ? loadedClip.start + clipRelT : realT;
      const projEnd = projectEndRef.current;
      const clamped = Math.min(globalT, projEnd);
      const clipEnd = loadedClip?.end ?? projEnd;

      if (globalT >= clipEnd || globalT >= projEnd) {
        videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
        animFrameRef.current = null;
        if (globalT >= projEnd) {
          currentSecRef.current = 0;
          setCurrentSec(0);
          animFrameRef.current = null;
          const firstVidClip = vidClips[0];
          if (firstVidClip?.url) {
            transitioningRef.current = true;
            syncAudio(0, true);
            const loopSpeed =
              (firstVidClip.style ?? playingClipStyleRef.current).speed / 10;
            const loopOffset = (firstVidClip.sourceOffset ?? 0) * loopSpeed;
            if (firstVidClip.url === loadedClip?.url) {
              playingClipIdRef.current = firstVidClip.id;
              setPlayingClipId(firstVidClip.id);
            } else {
              setPlayingClip(firstVidClip);
              pendingSeekRef.current = loopOffset;
            }
            setTimeout(() => {
              transitioningRef.current = false;
              if (videoRef.current) {
                videoRef.current.currentTime = loopOffset;
                videoRef.current.playbackRate = loopSpeed;
                videoRef.current
                  .play()
                  .then(() => startRafTicker())
                  .catch(() => {});
              }
            }, 50);
          } else {
            setCurrentSec(0);
          }
          return;
        }
        const nextClip = vidClips.find(
          (c) => c.start >= clipEnd && c.id !== loadedClip?.id,
        );
        if (!nextClip?.url) {
          currentSecRef.current = Math.min(clipEnd, projectEnd);
          setCurrentSec(Math.min(clipEnd, projectEnd));
          resetAutoZoomTransform();
          setPlaying(false);
          return;
        }
        const gapSize = nextClip.start - clipEnd;
        if (gapSize <= 0.05) {
          transitioningRef.current = true;
          setCurrentSec(nextClip.start);
          syncAudio(nextClip.start, true);
          const nextSpeed =
            (nextClip.style ?? playingClipStyleRef.current).speed / 10;
          const nextVideoOffset = (nextClip.sourceOffset ?? 0) * nextSpeed;
          const doHandoff = () => {
            if (!videoRef.current) return;
            videoRef.current.playbackRate = nextSpeed;
            videoRef.current
              .play()
              .then(() => {
                transitioningRef.current = false;
                startRafTicker();
              })
              .catch(() => {
                transitioningRef.current = false;
              });
          };
          if (nextClip.url === loadedClip?.url) {
            playingClipIdRef.current = nextClip.id;
            setPlayingClipId(nextClip.id);
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.currentTime = nextVideoOffset;
                videoRef.current.playbackRate = nextSpeed;
              }
              doHandoff();
            }, 32);
          } else {
            setPlayingClip(nextClip);
            pendingSeekRef.current = nextVideoOffset;
            setTimeout(doHandoff, 100);
          }
        } else {
          transitioningRef.current = true;
          setCurrentSec(clipEnd);
          startGapTicker(clipEnd, nextClip.start, () => {
            setPlayingClip(nextClip);
            pendingSeekRef.current = 0;
            syncAudio(nextClip.start, true);
            setTimeout(() => {
              transitioningRef.current = false;
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current
                  .play()
                  .then(() => startRafTicker())
                  .catch(() => {});
              }
            }, 50);
          });
        }
        return;
      }

      if (Math.abs(clamped - currentSecRef.current) >= 0.033) {
        currentSecRef.current = clamped;
        setCurrentSec(clamped);
      }

      // ── Auto Zoom — write transform directly to DOM every frame ───────────
      const azT = tickAutoZooms(globalT);
      autoZoomTransformRef.current = azT;
      if (videoRef.current) {
        const s = playingClipStyleRef.current;
        const base = `translate(${s.posX}px, ${s.posY}px) scale(${s.scale / 100}) rotate(${s.rotation}deg)`;
        const mirror = clipsRef.current.find(
          (c) => c.id === playingClipIdRef.current,
        )?.mirrored
          ? " scaleX(-1)"
          : "";
        videoRef.current.style.transform = azT
          ? `${base}${mirror} ${azT}`
          : `${base}${mirror}`;
      }

      // ── Transition compositor ──────────────────────────────────────────────
      tickTransitions(globalT, videoRef.current);

      audioSyncFrame++;
      if (audioSyncFrame >= 10 && audioRef.current) {
        audioSyncFrame = 0;
        const audClips = clipsRef.current
          .filter((c) => c.type === "aud" && c.url)
          .sort((a, b) => a.start - b.start);
        const audClip = audClips.find(
          (c) => clamped >= c.start && clamped < c.end,
        );
        if (audClip?.url && audioRef.current.src === audClip.url) {
          const expectedOffset =
            (audClip.sourceOffset ?? 0) + (clamped - audClip.start);
          const drift = Math.abs(audioRef.current.currentTime - expectedOffset);
          if (drift > 0.2) audioRef.current.currentTime = expectedOffset;
        }
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [
    syncAudio,
    startGapTicker,
    tickTransitions,
    tickAutoZooms,
    resetAutoZoomTransform,
  ]);

  const onVideoTimeUpdate = () => {};

  const onVideoLoadedMetadata = () => {
    if (!videoRef.current) return;
    const w = videoRef.current.videoWidth;
    const h = videoRef.current.videoHeight;
    if (w && h) {
      setVideoDims({ w, h });
      const r = w / h;
      if (r > 1.6) setAspectRatio("16:9");
      else if (r < 0.65) setAspectRatio("9:16");
      else if (r > 1.2) setAspectRatio("4:3");
      else setAspectRatio("1:1");
    }
    videoRef.current.playbackRate = playingClipStyleRef.current.speed / 10;
    videoRef.current.volume = (playingClipStyleRef.current.volume ?? 100) / 100;
    if (pendingSeekRef.current !== null) {
      videoRef.current.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = null;
    }
  };

  const onVideoEnded = () => {
    if (transitioningRef.current) return;
    if (!videoRef.current) return;
    const vidClips = clips
      .filter((c) => c.type === "vid" && c.url)
      .sort((a, b) => a.start - b.start);
    const currentClip = vidClips.find((c) => c.id === playingClipId);
    if (!currentClip) {
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    const nextClip = vidClips.find(
      (c) => c.start >= currentClip.end && c.id !== currentClip.id,
    );
    if (nextClip?.url) {
      const gapSize = nextClip.start - currentClip.end;
      if (gapSize <= 0.05) {
        transitioningRef.current = true;
        setCurrentSec(nextClip.start);
        syncAudio(nextClip.start, true);
        const nextSpeed = (nextClip.style ?? globalStyle).speed / 10;
        const nextVideoOffset = (nextClip.sourceOffset ?? 0) * nextSpeed;
        const doHandoff = () => {
          if (!videoRef.current) return;
          videoRef.current.playbackRate = nextSpeed;
          videoRef.current
            .play()
            .then(() => {
              transitioningRef.current = false;
              startRafTicker();
            })
            .catch(() => {
              transitioningRef.current = false;
            });
        };
        if (nextClip.url === currentClip.url) {
          playingClipIdRef.current = nextClip.id;
          setPlayingClipId(nextClip.id);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = nextVideoOffset;
              videoRef.current.playbackRate = nextSpeed;
            }
            doHandoff();
          }, 32);
        } else {
          setPlayingClip(nextClip);
          pendingSeekRef.current = nextVideoOffset;
          setTimeout(doHandoff, 100);
        }
      } else {
        transitioningRef.current = true;
        setCurrentSec(currentClip.end);
        startGapTicker(currentClip.end, nextClip.start, () => {
          setPlayingClip(nextClip);
          pendingSeekRef.current = 0;
          syncAudio(nextClip.start, true);
          setTimeout(() => {
            transitioningRef.current = false;
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.playbackRate =
                playingClipStyleRef.current.speed / 10;
              videoRef.current
                .play()
                .then(() => startRafTicker())
                .catch(() => {});
            }
          }, 80);
        });
      }
    } else {
      const vidClips2 = clips
        .filter((c) => c.type === "vid" && c.url)
        .sort((a, b) => a.start - b.start);
      const firstClip = vidClips2[0];
      if (firstClip?.url) {
        transitioningRef.current = true;
        setCurrentSec(0);
        setPlayingClip(firstClip);
        pendingSeekRef.current = 0;
        syncAudio(0, true);
        setTimeout(() => {
          transitioningRef.current = false;
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.playbackRate =
              playingClipStyleRef.current.speed / 10;
            videoRef.current
              .play()
              .then(() => startRafTicker())
              .catch(() => {});
          }
        }, 80);
      } else {
        setCurrentSec(0);
        if (audioRef.current) audioRef.current.pause();
        syncAudio(0, true);
      }
    }
  };

  // ── keyboard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === " ") {
        e.preventDefault();
        if (hasClips) togglePlay();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        duplicateSelected();
      }
      if (e.key === "s" || e.key === "S")
        setActiveTool((t) => (t === "split" ? "select" : "split"));
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, hasClips]);

  // ── Ctrl + wheel = timeline zoom ─────────────────────────────────────────
  useEffect(() => {
    const el = timelineScrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      setPxPerSec((p) =>
        Math.min(60, Math.max(8, p + (e.deltaY > 0 ? -2 : 2))),
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── media upload ─────────────────────────────────────────────────────────
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    let added = 0;
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      const isAudio = file.type.startsWith("audio/");
      if (!isVideo && !isAudio) {
        toast.error(`${file.name} is not a video or audio file`);
        continue;
      }
      const url = URL.createObjectURL(file);
      const rawDuration = await getMediaDuration(url, isVideo);
      const duration = Math.min(rawDuration, MAX_CLIP_SEC);
      if (rawDuration > MAX_CLIP_SEC)
        toast.warning(
          `"${file.name}" is ${Math.floor(rawDuration / 60)}m ${Math.round(rawDuration % 60)}s — trimmed to 2 min`,
        );
      const item: MediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        url,
        duration,
        type: isVideo ? "vid" : "aud",
        size: fmtBytes(file.size),
      };
      setMediaItems((prev) => [item, ...prev]);
      added++;
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (added > 0)
      toast.success(`${added} file${added > 1 ? "s" : ""} added to library`);
  };

  const getMediaDuration = (url: string, isVideo: boolean): Promise<number> =>
    new Promise((resolve) => {
      const el = document.createElement(isVideo ? "video" : "audio");
      el.preload = "metadata";
      el.onloadedmetadata = () => resolve(el.duration || 10);
      el.onerror = () => resolve(10);
      el.src = url;
    });

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    handleFileInput({
      target: { files: e.dataTransfer.files, value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>);
  };

  const addToTimeline = (item: MediaItem) => {
    const trackId = item.type === "vid" ? "trk-v" : "trk-a";
    const trackClips = clips.filter((c) => c.trackId === trackId);
    const start = snap(trackClips.reduce((m, c) => Math.max(m, c.end), 0));
    const clampedDur = Math.min(item.duration, MAX_CLIP_SEC);
    const newClip: Clip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: item.name,
      trackId,
      start,
      end: snap(start + clampedDur),
      type: item.type,
      selected: true,
      url: item.url,
      sourceDuration: clampedDur,
    };
    setClips((prev) => {
      const updated = [
        ...prev.map((c) => ({ ...c, selected: false })),
        newClip,
      ];
      if (item.type === "vid") {
        const fv = updated
          .filter((c) => c.type === "vid" && c.url)
          .sort((a, b) => a.start - b.start)[0];
        if (fv?.url) setTimeout(() => setPlayingClip(fv), 0);
      }
      return updated;
    });
    if (clips.filter((c) => c.type === item.type).length === 0)
      setCurrentSec(0);
    toast.success(`Added "${item.name}" to timeline`);
  };

  const removeMediaItem = (id: string) => {
    const item = mediaItems.find((m) => m.id === id);
    if (item) URL.revokeObjectURL(item.url);
    setMediaItems((prev) => prev.filter((m) => m.id !== id));
  };

  const handleAudioFiles = async (files: File[]) => {
    setAudioUploading(true);
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith("audio/")) {
        toast.error(`${file.name} is not an audio file`);
        continue;
      }
      const url = URL.createObjectURL(file);
      const rawDuration = await getMediaDuration(url, false);
      const duration = Math.min(rawDuration, MAX_CLIP_SEC);
      if (rawDuration > MAX_CLIP_SEC)
        toast.warning(
          `"${file.name}" is ${Math.floor(rawDuration / 60)}m ${Math.round(rawDuration % 60)}s — trimmed to 2 min`,
        );
      setAudioItems((prev) => [
        {
          id: `audio-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          url,
          duration,
          type: "aud",
          size: fmtBytes(file.size),
        },
        ...prev,
      ]);
      added++;
    }
    setAudioUploading(false);
    if (added > 0)
      toast.success(`${added} audio file${added > 1 ? "s" : ""} added`);
  };

  const addAudioToTimeline = (item: MediaItem) => {
    const trackClips = clips.filter((c) => c.trackId === "trk-a");
    const start = snap(trackClips.reduce((m, c) => Math.max(m, c.end), 0));
    const clampedDur = Math.min(item.duration, MAX_CLIP_SEC);
    setClips((prev) => [
      ...prev.map((c) => ({ ...c, selected: false })),
      {
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: item.name,
        trackId: "trk-a",
        start,
        end: snap(start + clampedDur),
        type: "aud",
        selected: true,
        url: item.url,
        sourceDuration: clampedDur,
      },
    ]);
    toast.success(`Added "${item.name}" to timeline`);
  };

  const removeAudioItem = (id: string) => {
    const item = audioItems.find((m) => m.id === id);
    if (item) URL.revokeObjectURL(item.url);
    setAudioItems((prev) => prev.filter((m) => m.id !== id));
  };

  // ── clip ops ──────────────────────────────────────────────────────────────
  const selectClip = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClips((prev) => prev.map((c) => ({ ...c, selected: c.id === id })));
  };
  const deselectAll = () =>
    setClips((prev) => prev.map((c) => ({ ...c, selected: false })));

  const deleteSelected = () => {
    if (playing) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      clearInterval(playRef.current!);
      stopGapTicker();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setPlaying(false);
    }
    setClips((prev) => {
      const remaining = prev.filter((c) => !c.selected);
      const firstVid = remaining
        .filter((c) => c.type === "vid" && c.url)
        .sort((a, b) => a.start - b.start)[0];
      setTimeout(() => {
        setPlayingClip(firstVid ?? null);
        setCurrentSec(0);
        if (videoRef.current) videoRef.current.pause();
        if (audioRef.current) audioRef.current.pause();
      }, 0);
      return remaining;
    });
    toast.success("Deleted");
  };

  const duplicateSelected = () => {
    setClips((prev) => {
      const selected = prev.filter((c) => c.selected);
      if (!selected.length) return prev;
      const dupes: Clip[] = selected
        .map((c) => {
          const dur = c.end - c.start;
          const newStart = Math.min(c.end, MAX_CLIP_SEC);
          const newEnd = Math.min(snap(newStart + dur), MAX_CLIP_SEC);
          if (newStart >= MAX_CLIP_SEC || newEnd <= newStart + 0.1) {
            toast.error(
              `No room to duplicate "${c.name}" — project is at 2-min limit`,
            );
            return null;
          }
          return {
            ...c,
            id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            start: newStart,
            end: newEnd,
            selected: true,
            style: c.style ? { ...c.style } : undefined,
          };
        })
        .filter(Boolean) as Clip[];
      if (!dupes.length) return prev;
      const deselected = prev.map((c) => ({ ...c, selected: false }));
      toast.success(
        `Duplicated ${dupes.length} clip${dupes.length > 1 ? "s" : ""}`,
      );
      return [...deselected, ...dupes];
    });
  };

  const splitAtPlayhead = () => {
    const t = currentSec;
    const splitMap = new Map<string, { a: string; b: string }>();
    setClips((prev) => {
      const next: Clip[] = [];
      prev.forEach((c) => {
        if (c.selected && t > c.start + 0.1 && t < c.end - 0.1) {
          const idA = c.id + "-a";
          const idB = c.id + "-b";
          splitMap.set(c.id, { a: idA, b: idB });
          next.push({ ...c, id: idA, end: t, selected: false });
          const leftTrimmed = t - c.start;
          next.push({
            ...c,
            id: idB,
            start: t,
            selected: true,
            sourceOffset: (c.sourceOffset ?? 0) + leftTrimmed,
            sourceDuration:
              c.sourceDuration !== undefined
                ? c.sourceDuration - leftTrimmed
                : undefined,
          });
        } else next.push(c);
      });
      return next;
    });
    if (splitMap.size > 0) {
      setAppliedTransitions((prev) =>
        prev
          .map((tr) => {
            const splitA = splitMap.get(tr.clipAId);
            const splitB = splitMap.get(tr.clipBId);
            return {
              ...tr,
              clipAId: splitA ? splitA.b : tr.clipAId,
              clipBId: splitB ? splitB.a : tr.clipBId,
            };
          })
          .filter((tr) => tr.clipAId !== tr.clipBId),
      );
    }
    toast.success("Split at playhead");
  };

  // ── drag: playhead ───────────────────────────────────────────────────────
  const startPlayheadDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = {
      type: "playhead",
      startX: e.clientX,
      origPH: currentSec,
    };
    wasPlayingRef.current = playing;
    if (playing) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      stopGapTicker();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
    const EDGE_ZONE = 60;
    const SCROLL_SPD = 8;
    const scrollLoop = () => {
      const el = timelineScrollRef.current;
      if (!el || !dragState.current) {
        autoScrollRAF.current = null;
        return;
      }
      const rect = el.getBoundingClientRect();
      const mx = dragState.current._lastClientX ?? rect.left + rect.width / 2;
      const distLeft = mx - rect.left;
      const distRight = rect.right - mx;
      if (distLeft < EDGE_ZONE)
        el.scrollLeft -= SCROLL_SPD * (1 - distLeft / EDGE_ZONE);
      if (distRight < EDGE_ZONE)
        el.scrollLeft += SCROLL_SPD * (1 - distRight / EDGE_ZONE);
      autoScrollRAF.current = requestAnimationFrame(scrollLoop);
    };
    autoScrollRAF.current = requestAnimationFrame(scrollLoop);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // ── drag: clip ───────────────────────────────────────────────────────────
  const startClipDrag = (
    e: React.MouseEvent,
    clipId: string,
    mode: "move" | "trim-l" | "trim-r",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const clip = clips.find((c) => c.id === clipId)!;
    if (activeTool === "split") {
      splitClip(clipId, e);
      return;
    }
    setClips((prev) => prev.map((c) => ({ ...c, selected: c.id === clipId })));
    dragState.current = {
      type: mode,
      clipId,
      startX: e.clientX,
      origStart: clip.start,
      origEnd: clip.end,
      sourceDuration: clip.sourceDuration,
      origSourceOffset: clip.sourceOffset ?? 0,
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const splitClip = (clipId: string, e: React.MouseEvent) => {
    const clip = clips.find((c) => c.id === clipId);
    if (!clip) return;
    const lane = laneRefs.current[clip.trackId];
    if (!lane) return;
    const x = e.clientX - lane.getBoundingClientRect().left;
    const t = snap(clamp(pxToSec(x), 0, totalSec));
    if (t <= clip.start + 0.1 || t >= clip.end - 0.1) return;
    const idA = clipId + "-a";
    const idB = clipId + "-b";
    setClips((prev) => {
      const next: Clip[] = [];
      prev.forEach((c) => {
        if (c.id === clipId) {
          next.push({ ...c, id: idA, end: t, selected: false });
          const leftTrimmed = t - c.start;
          next.push({
            ...c,
            id: idB,
            start: t,
            selected: true,
            sourceOffset: (c.sourceOffset ?? 0) + leftTrimmed,
            sourceDuration:
              c.sourceDuration !== undefined
                ? c.sourceDuration - leftTrimmed
                : undefined,
          });
        } else next.push(c);
      });
      return next;
    });
    setAppliedTransitions((prev) =>
      prev
        .map((tr) => ({
          ...tr,
          clipAId: tr.clipAId === clipId ? idB : tr.clipAId,
          clipBId: tr.clipBId === clipId ? idA : tr.clipBId,
        }))
        .filter((tr) => tr.clipAId !== tr.clipBId),
    );
    toast.success("Split");
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      ds._lastClientX = e.clientX;
      const dSec = pxToSec(e.clientX - ds.startX);
      if (ds.type === "playhead") {
        const t = snap(clamp((ds.origPH ?? 0) + dSec, 0, totalSecRef.current));
        seekTo(t);
        return;
      }
      setClips((prev) => {
        const target = prev.find((c) => c.id === ds.clipId);
        if (!target) return prev;
        const dur = (ds.origEnd ?? 0) - (ds.origStart ?? 0);
        const srcDur = ds.sourceDuration;
        const sameTrack = prev
          .filter((c) => c.trackId === target.trackId && c.id !== ds.clipId)
          .sort((a, b) => a.start - b.start);
        const leftNeighbour = sameTrack
          .filter((c) => c.end <= (ds.origStart ?? 0) + 0.05)
          .slice(-1)[0];
        const rightNeighbour = sameTrack.find(
          (c) => c.start >= (ds.origEnd ?? 0) - 0.05,
        );
        if (ds.type === "move") {
          const minStart = leftNeighbour ? snap(leftNeighbour.end) : 0;
          const maxStart = rightNeighbour
            ? snap(rightNeighbour.start - dur)
            : MAX_CLIP_SEC - dur;
          const ns = snap(
            clamp((ds.origStart ?? 0) + dSec, minStart, maxStart),
          );
          return prev.map((c) =>
            c.id === ds.clipId ? { ...c, start: ns, end: ns + dur } : c,
          );
        }
        if (ds.type === "trim-l") {
          const maxStart =
            srcDur !== undefined ? Math.max(0, (ds.origEnd ?? 0) - srcDur) : 0;
          const hardMin = leftNeighbour ? snap(leftNeighbour.end) : 0;
          const newStart = snap(
            clamp(
              (ds.origStart ?? 0) + dSec,
              Math.max(maxStart, hardMin),
              (ds.origEnd ?? 0) - 0.5,
            ),
          );
          const origSourceOffset = ds.origSourceOffset ?? 0;
          const trimmedExtra = newStart - (ds.origStart ?? 0);
          return prev.map((c) =>
            c.id === ds.clipId
              ? {
                  ...c,
                  start: newStart,
                  sourceOffset: Math.max(0, origSourceOffset + trimmedExtra),
                }
              : c,
          );
        }
        if (ds.type === "trim-r") {
          const srcMax =
            srcDur !== undefined
              ? snap((ds.origStart ?? 0) + srcDur)
              : MAX_CLIP_SEC;
          const hardMax = rightNeighbour
            ? snap(rightNeighbour.start)
            : MAX_CLIP_SEC;
          const maxEnd = Math.min(srcMax, hardMax);
          const newEnd = snap(
            clamp((ds.origEnd ?? 0) + dSec, (ds.origStart ?? 0) + 0.5, maxEnd),
          );
          return prev.map((c) =>
            c.id === ds.clipId ? { ...c, end: newEnd } : c,
          );
        }
        return prev;
      });
    },
    [pxPerSec],
  );

  const onMouseUp = useCallback(() => {
    const wasPlayhead = dragState.current?.type === "playhead";
    dragState.current = null;
    if (autoScrollRAF.current) {
      cancelAnimationFrame(autoScrollRAF.current);
      autoScrollRAF.current = null;
    }
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    if (wasPlayhead && wasPlayingRef.current) {
      wasPlayingRef.current = false;
      const t = currentSecRef.current;
      const vidClips = clipsRef.current
        .filter((c) => c.type === "vid" && c.url)
        .sort((a, b) => a.start - b.start);
      const activeClip = vidClips.find((c) => t >= c.start && t < c.end);
      const nextClip = vidClips.find((c) => c.start > t);
      syncAudio(t, true);
      if (activeClip?.url) {
        const clipStyle = activeClip.style ?? globalStyle;
        const clipSpeed = clipStyle.speed / 10;
        const clipVolume = (clipStyle.volume ?? 100) / 100;
        const videoOffset =
          ((activeClip.sourceOffset ?? 0) + Math.max(0, t - activeClip.start)) *
          clipSpeed;
        const doResume = () => {
          if (!videoRef.current) return;
          videoRef.current.currentTime = videoOffset;
          videoRef.current.playbackRate = clipSpeed;
          videoRef.current.volume = clipVolume;
          videoRef.current
            .play()
            .then(() => startRafTicker())
            .catch(() => {});
        };
        if (playingClipIdRef.current !== activeClip.id) {
          setPlayingClip(activeClip);
          pendingSeekRef.current = videoOffset;
          setTimeout(doResume, 80);
        } else {
          doResume();
        }
      } else if (nextClip?.url) {
        startGapTicker(t, nextClip.start, () => {
          setPlayingClip(nextClip);
          pendingSeekRef.current = 0;
          syncAudio(nextClip.start, true);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = 0;
              videoRef.current.playbackRate =
                playingClipStyleRef.current.speed / 10;
              videoRef.current
                .play()
                .then(() => startRafTicker())
                .catch(() => {});
            }
          }, 80);
        });
      }
    }
  }, [onMouseMove, syncAudio, startGapTicker, startRafTicker]);

  const onLaneClick = (e: React.MouseEvent, trackId: string) => {
    if ((e.target as HTMLElement).closest(".clip-el")) return;
    const lane = laneRefs.current[trackId];
    if (!lane) return;
    const t = snap(
      clamp(
        pxToSec(e.clientX - lane.getBoundingClientRect().left),
        0,
        totalSecRef.current,
      ),
    );
    seekTo(t);
    deselectAll();
  };

  const rulerMarks = useMemo(() => {
    const interval = pxPerSec >= 30 ? 1 : pxPerSec >= 15 ? 2 : 5;
    const marks = [];
    for (let i = 0; i <= totalSec; i += interval) marks.push(i);
    if (marks[marks.length - 1] < totalSec) marks.push(totalSec);
    return marks;
  }, [pxPerSec, totalSec]);

  // ── sidebar items ────────────────────────────────────────────────────────
  const sidebarItems: {
    id: SidebarTool;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "upload",
      label: "Upload",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path
            d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "audio",
      label: "Audio",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path
            d="M9 18V5l12-2v13"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="6"
            cy="18"
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle
            cx="18"
            cy="16"
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      ),
    },
    {
      id: "text",
      label: "Text",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path
            d="M4 7V4h16v3M9 20h6M12 4v16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "captions",
      label: "Captions",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M7 12h4M7 15h7M13 12h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "autozoom",
      label: "Auto Zoom",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M11 8v6M8 11h6M20 20l-3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "transitions",
      label: "Transitions",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path
            d="M4 4h6v6H4zM14 14h6v6h-6zM10 7h4M7 10v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    {
      id: "filters",
      label: "Filters",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path
            d="M12 3a9 9 0 100 18A9 9 0 0012 3z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M12 3a4.5 4.5 0 010 18A4.5 4.5 0 0112 3z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M3 12h18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      id: "adjust",
      label: "Adjust",
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
          <path
            d="M4 6h16M4 12h16M4 18h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="8" cy="6" r="2" fill="currentColor" />
          <circle cx="16" cy="12" r="2" fill="currentColor" />
          <circle cx="10" cy="18" r="2" fill="currentColor" />
        </svg>
      ),
    },
  ];

  const trackDotColor: Record<Track["type"], string> = {
    vid: "bg-blue-500",
    aud: "bg-teal-500",
    txt: "bg-violet-500",
    fx: "bg-amber-500",
  };
  const ratioMap: Record<string, string> = {
    "16:9": "16/9",
    "9:16": "9/16",
    "1:1": "1/1",
    "4:3": "4/3",
  };
  const ratioMaxW: Record<string, number> = {
    "16:9": 560,
    "9:16": 200,
    "1:1": 320,
    "4:3": 420,
  };
  const ratioMaxH: Record<string, number> = {
    "16:9": 315,
    "9:16": 355,
    "1:1": 320,
    "4:3": 315,
  };
  const trackLaneBg: Record<Track["type"], string> = {
    vid: "rgba(37,99,235,0.04)",
    aud: "rgba(20,184,166,0.04)",
    txt: "rgba(109,40,217,0.04)",
    fx: "rgba(217,119,6,0.04)",
  };

  const handleSidebarClick = (id: SidebarTool) => {
    if (sidebarTool === id && drawerOpen) setDrawerOpen(false);
    else {
      setSidebarTool(id);
      setDrawerOpen(true);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-950 text-gray-200 overflow-hidden select-none">
      {/* BACK CONFIRMATION MODAL */}
      {showBackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    stroke="#f87171"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Leave the editor?
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Your project will not be saved.
                </p>
              </div>
            </div>
            <p className="text-[12px] text-slate-400 leading-relaxed">
              All clips, edits, and timeline changes will be lost if you go back
              now.
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={() => setShowBackModal(false)}
                className="flex-1 py-2 text-[12px] rounded-lg bg-slate-800 border border-white/5 text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
              >
                Stay here
              </button>
              <button
                onClick={() => {
                  setShowBackModal(false);
                  router.push("/dashboard");
                }}
                className="flex-1 py-2 text-[12px] rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all font-semibold"
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CROP MODAL */}
      {showCropModal && selectedClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 w-96 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Crop Clip</p>
              <button
                onClick={() => setShowCropModal(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                Presets
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Free", ratio: null },
                  { label: "1:1", ratio: [1, 1] },
                  { label: "16:9", ratio: [16, 9] },
                  { label: "9:16", ratio: [9, 16] },
                  { label: "4:3", ratio: [4, 3] },
                  { label: "3:4", ratio: [3, 4] },
                ].map(({ label, ratio }) => {
                  const getPresetCrop = () => {
                    if (!ratio) return { top: 0, right: 0, bottom: 0, left: 0 };
                    const srcW = videoDims.w;
                    const srcH = videoDims.h;
                    const tgtRatio = ratio[0] / ratio[1];
                    const srcRatio = srcW / srcH;
                    if (Math.abs(tgtRatio - srcRatio) < 0.01)
                      return { top: 0, right: 0, bottom: 0, left: 0 };
                    if (tgtRatio < srcRatio) {
                      const newW = srcH * tgtRatio;
                      const chopPx = (srcW - newW) / 2;
                      const chopPct =
                        Math.round((chopPx / srcW) * 100 * 10) / 10;
                      return {
                        top: 0,
                        bottom: 0,
                        left: chopPct,
                        right: chopPct,
                      };
                    } else {
                      const newH = srcW / tgtRatio;
                      const chopPx = (srcH - newH) / 2;
                      const chopPct =
                        Math.round((chopPx / srcH) * 100 * 10) / 10;
                      return {
                        top: chopPct,
                        bottom: chopPct,
                        left: 0,
                        right: 0,
                      };
                    }
                  };
                  const preset = getPresetCrop();
                  const isActive =
                    cropDraft.top === preset.top &&
                    cropDraft.bottom === preset.bottom &&
                    cropDraft.left === preset.left &&
                    cropDraft.right === preset.right;
                  return (
                    <button
                      key={label}
                      onClick={() => setCropDraft(preset)}
                      className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-lg border text-[10px] font-semibold transition-all ${isActive ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "bg-slate-800/60 border-white/5 text-slate-400 hover:border-white/15 hover:text-white"}`}
                    >
                      <div className="flex items-center justify-center w-8 h-6">
                        {label === "Free" ? (
                          <svg
                            width="18"
                            height="14"
                            fill="none"
                            viewBox="0 0 18 14"
                          >
                            <rect
                              x="1"
                              y="1"
                              width="16"
                              height="12"
                              rx="1.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeDasharray="3 2"
                            />
                          </svg>
                        ) : (
                          <div
                            className={`border-2 rounded-sm ${isActive ? "border-teal-400" : "border-slate-500"}`}
                            style={{
                              width:
                                ratio![0] >= ratio![1]
                                  ? 20
                                  : Math.round((20 * ratio![0]) / ratio![1]),
                              height:
                                ratio![1] >= ratio![0]
                                  ? 14
                                  : Math.round((14 * ratio![1]) / ratio![0]),
                            }}
                          />
                        )}
                      </div>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="relative w-full bg-slate-800 rounded-lg overflow-hidden border border-white/10"
              style={{
                aspectRatio: `${videoDims.w}/${videoDims.h}`,
                maxHeight: 180,
              }}
            >
              <div className="absolute inset-0 bg-black/50" />
              <div
                className="absolute bg-transparent border-2 border-teal-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
                style={{
                  top: `${cropDraft.top}%`,
                  right: `${cropDraft.right}%`,
                  bottom: `${cropDraft.bottom}%`,
                  left: `${cropDraft.left}%`,
                }}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/3 left-0 right-0 border-t border-white/20" />
                  <div className="absolute top-2/3 left-0 right-0 border-t border-white/20" />
                  <div className="absolute left-1/3 top-0 bottom-0 border-l border-white/20" />
                  <div className="absolute left-2/3 top-0 bottom-0 border-l border-white/20" />
                </div>
                {[
                  ["top-0 left-0", "border-t-2 border-l-2"],
                  ["top-0 right-0", "border-t-2 border-r-2"],
                  ["bottom-0 left-0", "border-b-2 border-l-2"],
                  ["bottom-0 right-0", "border-b-2 border-r-2"],
                ].map(([pos, borders]) => (
                  <div
                    key={pos}
                    className={`absolute w-3 h-3 ${pos} ${borders} border-teal-300`}
                  />
                ))}
              </div>
              <div className="absolute bottom-1.5 right-2 text-[9px] font-mono text-white/60 pointer-events-none">
                {100 - cropDraft.left - cropDraft.right}% ×{" "}
                {100 - cropDraft.top - cropDraft.bottom}%
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {(["top", "bottom", "left", "right"] as const).map((side) => (
                <div key={side}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-slate-400 capitalize">
                      {side}
                    </span>
                    <span className="text-[10px] font-mono text-teal-400">
                      {cropDraft[side]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={49}
                    value={cropDraft[side]}
                    onChange={(e) =>
                      setCropDraft((prev) => ({
                        ...prev,
                        [side]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-teal-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  setCropDraft({ top: 0, right: 0, bottom: 0, left: 0 })
                }
                className="flex-1 py-2 text-[12px] rounded-lg bg-slate-800 border border-white/5 text-slate-400 hover:text-white transition-all"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  setClips((prev) =>
                    prev.map((c) =>
                      c.id === selectedClip.id
                        ? { ...c, crop: { ...cropDraft } }
                        : c,
                    ),
                  );
                  setShowCropModal(false);
                  toast.success("Crop applied");
                }}
                className="flex-1 py-2 text-[12px] rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 hover:bg-teal-500/30 transition-all font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 h-12 bg-slate-900/80 backdrop-blur-sm border-b border-white/5 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBackModal(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/80 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="DeepShark AI"
              className="h-6 w-auto object-contain"
            />
            <span className="text-sm font-semibold text-white hidden sm:block">
              DeepShark AI
            </span>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-white/10 text-gray-500 bg-transparent px-1.5 py-0"
          >
            {aspectRatio}
          </Badge>
        </div>
        <Button
          size="sm"
          disabled={!hasClips}
          className="h-8 px-4 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs rounded-md shadow-lg shadow-teal-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Download className="w-3 h-3 mr-1.5" />
          Export
        </Button>
      </div>

      {/* MAIN */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {/* LEFT ICON SIDEBAR */}
        <div className="w-14 bg-slate-900/60 border-r border-white/5 flex flex-col items-center py-3 gap-1 shrink-0 z-20">
          {sidebarItems.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => handleSidebarClick(id)}
              className={`w-10 h-10 flex flex-col items-center justify-center gap-1 rounded-lg transition-all border ${sidebarTool === id && drawerOpen ? "bg-teal-500/15 border-teal-500/40 text-teal-400" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5"}`}
            >
              {icon}
              <span className="text-[8px] leading-none text-center">
                {label}
              </span>
            </button>
          ))}
        </div>

        {/* DRAWER */}
        <div
          className={`shrink-0 bg-slate-900/95 border-r border-white/5 flex flex-col z-10 transition-all duration-300 overflow-hidden ${drawerOpen ? "w-64" : "w-0"}`}
        >
          {drawerOpen && (
            <>
              <div className="flex items-center justify-between px-3 h-11 border-b border-white/5 shrink-0">
                <span className="text-xs font-semibold text-white capitalize">
                  {sidebarTool === "autozoom" ? "Auto Zoom" : sidebarTool}
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Upload drawer */}
              {sidebarTool === "upload" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div
                    className="mx-3 mt-3 mb-2 border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      {uploading ? (
                        <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 text-teal-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 text-center leading-tight">
                      {uploading
                        ? "Adding files..."
                        : "Drop video or audio\nor click to browse"}
                    </p>
                    <p className="text-[9px] text-gray-600">
                      MP4, MOV, AVI, MP3, WAV
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,audio/*"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                  />
                  {mediaItems.length > 0 && (
                    <div className="flex gap-1 px-3 mb-2 shrink-0">
                      {["All", "Video", "Audio"].map((tab) => (
                        <button
                          key={tab}
                          className="px-2 py-0.5 text-[10px] rounded bg-slate-800 border border-white/5 text-gray-400 hover:text-white transition-all"
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    {mediaItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-center">
                        <Film className="w-8 h-8 text-slate-700 mb-2" />
                        <p className="text-[11px] text-slate-600">
                          No media yet
                        </p>
                        <p className="text-[10px] text-slate-700">
                          Upload files to get started
                        </p>
                      </div>
                    ) : (
                      mediaItems.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => {
                            draggingMediaRef.current = item;
                          }}
                          onDragEnd={() => {
                            draggingMediaRef.current = null;
                          }}
                          className="group relative bg-slate-800/60 border border-white/5 rounded-lg overflow-hidden hover:border-white/10 transition-all cursor-grab active:cursor-grabbing"
                          onClick={() => addToTimeline(item)}
                        >
                          <div className="flex items-center gap-2.5 p-2.5">
                            <div
                              className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${item.type === "vid" ? "bg-blue-500/20" : "bg-teal-500/20"}`}
                            >
                              {item.type === "vid" ? (
                                <Film className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Music className="w-5 h-5 text-teal-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-white truncate">
                                {item.name}
                              </p>
                              <p className="text-[9px] text-gray-500 mt-0.5">
                                {fmt(item.duration)} · {item.size}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMediaItem(item.id);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <div className="w-6 h-6 flex items-center justify-center rounded bg-teal-500/20 text-teal-400">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                          {item.type === "aud" && (
                            <div className="flex items-center h-6 px-2.5 pb-1 gap-px overflow-hidden opacity-30">
                              {getWave(item.id).map((h, i) => (
                                <div
                                  key={i}
                                  style={{
                                    flexShrink: 0,
                                    width: 2,
                                    height: h * 0.6,
                                    background: "#34d399",
                                    borderRadius: 1,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/5 transition-colors rounded-lg pointer-events-none" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Audio drawer */}
              {sidebarTool === "audio" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div
                    className="mx-3 mt-3 mb-2 border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-teal-500/40 hover:bg-teal-500/5 transition-all shrink-0"
                    onClick={() => audioInputRef.current?.click()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const files = Array.from(e.dataTransfer.files).filter(
                        (f) => f.type.startsWith("audio/"),
                      );
                      if (!files.length) {
                        toast.error("Please drop audio files only");
                        return;
                      }
                      handleAudioFiles(files);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <div className="w-9 h-9 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      {audioUploading ? (
                        <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Music className="w-4 h-4 text-teal-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 text-center leading-tight">
                      {audioUploading
                        ? "Adding audio..."
                        : "Drop audio files or click to browse"}
                    </p>
                    <p className="text-[9px] text-gray-600">
                      MP3, WAV, AAC, OGG, M4A
                    </p>
                  </div>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length) handleAudioFiles(files);
                      if (audioInputRef.current)
                        audioInputRef.current.value = "";
                    }}
                  />
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    {audioItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-center">
                        <Music className="w-8 h-8 text-slate-700 mb-2" />
                        <p className="text-[11px] text-slate-600">
                          No audio yet
                        </p>
                        <p className="text-[10px] text-slate-700">
                          Upload to add background music or SFX
                        </p>
                      </div>
                    ) : (
                      audioItems.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => {
                            draggingMediaRef.current = item;
                          }}
                          onDragEnd={() => {
                            draggingMediaRef.current = null;
                          }}
                          className="group relative bg-slate-800/60 border border-white/5 rounded-lg overflow-hidden hover:border-teal-500/20 transition-all cursor-grab active:cursor-grabbing"
                          onClick={() => addAudioToTimeline(item)}
                        >
                          <div className="flex items-center gap-2.5 p-2.5">
                            <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 bg-teal-500/15 border border-teal-500/20">
                              <Music className="w-5 h-5 text-teal-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-white truncate">
                                {item.name}
                              </p>
                              <p className="text-[9px] text-gray-500 mt-0.5">
                                {fmt(item.duration)} · {item.size}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAudioItem(item.id);
                                }}
                                className="w-6 h-6 flex items-center justify-center rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                              <div className="w-6 h-6 flex items-center justify-center rounded bg-teal-500/20 text-teal-400">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center h-7 px-2.5 pb-1.5 gap-px overflow-hidden opacity-40">
                            {getWave(item.id).map((h, i) => (
                              <div
                                key={i}
                                style={{
                                  flexShrink: 0,
                                  width: 2,
                                  height: h * 0.55,
                                  background: "#34d399",
                                  borderRadius: 1,
                                }}
                              />
                            ))}
                          </div>
                          <div className="absolute inset-0 bg-teal-500/0 group-hover:bg-teal-500/4 transition-colors rounded-lg pointer-events-none" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Auto Zoom drawer */}
              {sidebarTool === "autozoom" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-3 pt-3 pb-2 shrink-0">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Drag onto a{" "}
                      <span className="text-blue-400 font-semibold">
                        video clip
                      </span>{" "}
                      to add a zoom effect. Multiple effects can be stacked at
                      different positions.
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    {AUTO_ZOOMS.map((az) => (
                      <div
                        key={az.id}
                        draggable
                        onDragStart={() => {
                          draggingAutoZoomRef.current = az;
                        }}
                        onDragEnd={() => {
                          draggingAutoZoomRef.current = null;
                          setDragOverClipId(null);
                        }}
                        className="group flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-slate-800/60 hover:border-teal-500/30 hover:bg-slate-800 transition-all cursor-grab active:cursor-grabbing select-none"
                      >
                        <div className="shrink-0 w-8 h-5 flex items-center justify-center">
                          {az.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-white">
                            {az.label}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {az.description}
                          </p>
                        </div>
                        {selectedClip?.type === "vid" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!selectedClip) return;
                              const clipDur =
                                selectedClip.end - selectedClip.start;
                              const existing = selectedClip.autoZooms ?? [];
                              // Place new effect after the last one, or at clip start if none
                              const lastEnd = existing.reduce(
                                (m: number, e2: AppliedAutoZoom) =>
                                  Math.max(m, e2.endSec),
                                0,
                              );
                              const newStart =
                                existing.length > 0
                                  ? Math.min(lastEnd, clipDur - 1)
                                  : 0;
                              const newEnd = Math.min(
                                newStart +
                                  Math.max(2, clipDur / (existing.length + 1)),
                                clipDur,
                              );
                              if (newStart >= newEnd) {
                                toast.error(
                                  "No room for another effect on this clip",
                                );
                                return;
                              }
                              const newEntry: AppliedAutoZoom = {
                                id: `az-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                type: az.id,
                                startSec: Math.round(newStart * 10) / 10,
                                endSec: Math.round(newEnd * 10) / 10,
                              };
                              setClips((prev) =>
                                prev.map((c) =>
                                  c.id === selectedClip.id
                                    ? {
                                        ...c,
                                        autoZooms: [
                                          ...(c.autoZooms ?? []),
                                          newEntry,
                                        ],
                                      }
                                    : c,
                                ),
                              );
                              toast.success(
                                `${az.label} added to "${selectedClip.name}"`,
                              );
                            }}
                            className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-slate-700 text-slate-400 hover:bg-teal-500/20 hover:text-teal-300 opacity-0 group-hover:opacity-100 transition-all"
                            title="Add to selected clip"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Applied effects on selected clip */}
                  {selectedClip?.type === "vid" &&
                    (selectedClip.autoZooms?.length ?? 0) > 0 && (
                      <div className="border-t border-white/5 px-3 py-3 shrink-0 max-h-52 overflow-y-auto">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                            On: {selectedClip.name}
                          </p>
                          <button
                            onClick={() =>
                              setClips((prev) =>
                                prev.map((c) =>
                                  c.id === selectedClip.id
                                    ? { ...c, autoZooms: [] }
                                    : c,
                                ),
                              )
                            }
                            className="text-[9px] text-slate-600 hover:text-red-400 transition-colors"
                          >
                            Clear all
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(selectedClip.autoZooms ?? []).map(
                            (entry: AppliedAutoZoom, idx: number) => {
                              const def = AUTO_ZOOMS.find(
                                (az) => az.id === entry.type,
                              );
                              const clipDur =
                                selectedClip.end - selectedClip.start;
                              return (
                                <div
                                  key={entry.id}
                                  className="bg-slate-800/80 rounded-lg border border-white/5 p-2 space-y-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-semibold text-teal-300 flex-1 truncate">
                                      {def?.label ?? entry.type}
                                    </span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      {entry.startSec.toFixed(1)}s–
                                      {entry.endSec.toFixed(1)}s
                                    </span>
                                    <button
                                      onClick={() =>
                                        setClips((prev) =>
                                          prev.map((c) =>
                                            c.id === selectedClip.id
                                              ? {
                                                  ...c,
                                                  autoZooms: (
                                                    c.autoZooms ?? []
                                                  ).filter(
                                                    (e: AppliedAutoZoom) =>
                                                      e.id !== entry.id,
                                                  ),
                                                }
                                              : c,
                                          ),
                                        )
                                      }
                                      className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {/* Visual bar showing position within clip */}
                                  <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                      className="absolute h-full rounded-full bg-teal-500/70"
                                      style={{
                                        left: `${(entry.startSec / clipDur) * 100}%`,
                                        width: `${((entry.endSec - entry.startSec) / clipDur) * 100}%`,
                                      }}
                                    />
                                  </div>
                                  {/* Start / End sliders */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <div className="flex justify-between mb-0.5">
                                        <span className="text-[9px] text-slate-500">
                                          Start
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">
                                          {entry.startSec.toFixed(1)}s
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0}
                                        max={Math.max(0, entry.endSec - 0.5)}
                                        step={0.1}
                                        value={entry.startSec}
                                        onChange={(
                                          e: React.ChangeEvent<HTMLInputElement>,
                                        ) => {
                                          const v = parseFloat(e.target.value);
                                          setClips((prev) =>
                                            prev.map((c) =>
                                              c.id === selectedClip.id
                                                ? {
                                                    ...c,
                                                    autoZooms: (
                                                      c.autoZooms ?? []
                                                    ).map(
                                                      (az: AppliedAutoZoom) =>
                                                        az.id === entry.id
                                                          ? {
                                                              ...az,
                                                              startSec: v,
                                                            }
                                                          : az,
                                                    ),
                                                  }
                                                : c,
                                            ),
                                          );
                                        }}
                                        className="w-full accent-teal-500"
                                      />
                                    </div>
                                    <div>
                                      <div className="flex justify-between mb-0.5">
                                        <span className="text-[9px] text-slate-500">
                                          End
                                        </span>
                                        <span className="text-[9px] font-mono text-slate-400">
                                          {entry.endSec.toFixed(1)}s
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={Math.min(
                                          entry.startSec + 0.5,
                                          clipDur,
                                        )}
                                        max={clipDur}
                                        step={0.1}
                                        value={entry.endSec}
                                        onChange={(
                                          e: React.ChangeEvent<HTMLInputElement>,
                                        ) => {
                                          const v = parseFloat(e.target.value);
                                          setClips((prev) =>
                                            prev.map((c) =>
                                              c.id === selectedClip.id
                                                ? {
                                                    ...c,
                                                    autoZooms: (
                                                      c.autoZooms ?? []
                                                    ).map(
                                                      (az: AppliedAutoZoom) =>
                                                        az.id === entry.id
                                                          ? { ...az, endSec: v }
                                                          : az,
                                                    ),
                                                  }
                                                : c,
                                            ),
                                          );
                                        }}
                                        className="w-full accent-teal-500"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            },
                          )}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Transitions drawer */}
              {sidebarTool === "transitions" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="px-3 pt-3 pb-2 shrink-0">
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      Drag a transition onto the{" "}
                      <span className="text-teal-400 font-semibold">
                        cut point
                      </span>{" "}
                      between two touching clips on the video track.
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
                    {TRANSITIONS.map((tr) => (
                      <div
                        key={tr.id}
                        draggable
                        onDragStart={() => {
                          draggingTransitionRef.current = tr;
                        }}
                        onDragEnd={() => {
                          draggingTransitionRef.current = null;
                          setDragOverCutId(null);
                        }}
                        className="group flex items-center gap-3 p-2.5 rounded-xl border border-white/5 bg-slate-800/60 hover:border-teal-500/30 hover:bg-slate-800 transition-all cursor-grab active:cursor-grabbing select-none"
                      >
                        <div className="shrink-0 w-8 h-5 flex items-center justify-center">
                          {tr.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-white">
                            {tr.label}
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            {tr.description}
                          </p>
                        </div>
                        <svg
                          width="10"
                          height="10"
                          fill="none"
                          viewBox="0 0 24 24"
                          className="text-slate-600 group-hover:text-teal-500 transition-colors shrink-0"
                        >
                          <path
                            d="M5 12h14M12 5l7 7-7 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    ))}
                  </div>
                  {appliedTransitions.length > 0 && (
                    <div className="border-t border-white/5 px-3 py-3 shrink-0">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                        Applied ({appliedTransitions.length})
                      </p>
                      <div className="space-y-1.5">
                        {appliedTransitions.map((at) => {
                          const def = TRANSITIONS.find((t) => t.id === at.type);
                          return (
                            <div
                              key={at.id}
                              className="flex items-center gap-2 text-[10px]"
                            >
                              <span className="text-white font-medium flex-1 truncate">
                                {def?.label ?? at.type}
                              </span>
                              <span className="text-slate-500 font-mono">
                                {at.duration}s
                              </span>
                              <button
                                onClick={() =>
                                  setAppliedTransitions((prev) =>
                                    prev.filter((t) => t.id !== at.id),
                                  )
                                }
                                className="text-slate-600 hover:text-red-400 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Filters drawer */}
              {sidebarTool === "filters" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div
                    className={`mx-3 mt-3 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-2 border shrink-0 ${selectedClip ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-slate-800/60 border-white/5 text-slate-400"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${selectedClip ? "bg-teal-400" : "bg-slate-500"}`}
                    />
                    <span className="truncate font-medium text-[10px]">
                      {selectedClip
                        ? `Clip: ${selectedClip.name}`
                        : "Global — all clips"}
                    </span>
                    {selectedClip?.style?.filter &&
                      selectedClip.style.filter !== "None" && (
                        <button
                          onClick={resetClipStyle}
                          className="ml-auto text-[9px] text-slate-500 hover:text-red-400 transition-colors shrink-0 underline"
                        >
                          Reset
                        </button>
                      )}
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-3">
                    <div className="grid grid-cols-2 gap-2">
                      {FILTERS.map((f) => {
                        const isActive = activeStyle.filter === f;
                        const previewFilter: Record<string, string> = {
                          None: "none",
                          Vivid: "saturate(2) contrast(1.1)",
                          Matte:
                            "contrast(0.85) saturate(0.7) brightness(1.05)",
                          "B&W": "grayscale(1)",
                          Warm: "sepia(0.4) saturate(1.3)",
                          Cool: "hue-rotate(20deg) saturate(1.2)",
                          Fade: "contrast(0.8) brightness(1.15) saturate(0.85)",
                          Drama: "contrast(1.5) saturate(1.4) brightness(0.88)",
                          Neon: "saturate(2.5) brightness(1.1) contrast(1.2)",
                        };
                        return (
                          <button
                            key={f}
                            onClick={() => setStyleProp("filter", f)}
                            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${isActive ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "bg-slate-800/50 border-white/5 text-gray-400 hover:border-white/15 hover:bg-slate-800"}`}
                          >
                            <div
                              className="w-full h-12 rounded-lg overflow-hidden bg-linear-to-br from-blue-500 via-teal-400 to-violet-500 relative shrink-0"
                              style={{ filter: previewFilter[f] ?? "none" }}
                            >
                              <div className="absolute inset-0 flex flex-col">
                                <div className="flex-1 bg-linear-to-b from-sky-400 to-sky-300" />
                                <div className="h-1/3 bg-linear-to-b from-green-600 to-green-700" />
                              </div>
                              <div className="absolute top-1.5 right-2 w-3 h-3 rounded-full bg-yellow-300 opacity-90" />
                            </div>
                            <span className="text-[10px] font-medium">{f}</span>
                          </button>
                        );
                      })}
                    </div>
                    {activeStyle.filter !== "None" && (
                      <div className="mt-3 p-3 bg-slate-800/50 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] text-slate-400 font-medium">
                            Strength
                          </span>
                          <span className="text-[10px] font-mono text-teal-400">
                            {activeStyle.filterStrength ?? 100}%
                          </span>
                        </div>
                        <SliderRow
                          label=""
                          value={activeStyle.filterStrength ?? 100}
                          onChange={(v) => setStyleProp("filterStrength", v)}
                          min={0}
                          max={100}
                        />
                        <div className="flex gap-2 mt-2">
                          <div className="flex-1 h-8 rounded overflow-hidden relative">
                            <div className="absolute inset-0 flex flex-col">
                              <div className="flex-1 bg-linear-to-b from-sky-400 to-sky-300" />
                              <div className="h-1/3 bg-linear-to-b from-green-600 to-green-700" />
                            </div>
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-300" />
                            <span className="absolute bottom-0.5 left-1 text-[8px] text-white/60">
                              Before
                            </span>
                          </div>
                          <div
                            className="flex-1 h-8 rounded overflow-hidden relative"
                            style={{
                              filter: buildCSSFilter({ ...activeStyle }),
                            }}
                          >
                            <div className="absolute inset-0 flex flex-col">
                              <div className="flex-1 bg-linear-to-b from-sky-400 to-sky-300" />
                              <div className="h-1/3 bg-linear-to-b from-green-600 to-green-700" />
                            </div>
                            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-300" />
                            <span className="absolute bottom-0.5 left-1 text-[8px] text-white/60">
                              After
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Adjust drawer */}
              {sidebarTool === "adjust" && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div
                    className={`mx-3 mt-3 mb-2 px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-2 border shrink-0 ${selectedClip ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-slate-800/60 border-white/5 text-slate-400"}`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${selectedClip ? "bg-teal-400" : "bg-slate-500"}`}
                    />
                    <span className="truncate font-medium text-[10px]">
                      {selectedClip
                        ? `Clip: ${selectedClip.name}`
                        : "Global — all clips"}
                    </span>
                    {selectedClip?.style && (
                      <button
                        onClick={resetClipStyle}
                        className="ml-auto text-[9px] text-slate-500 hover:text-red-400 transition-colors shrink-0 underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 mt-1">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">
                      Color
                    </p>
                    <SliderRow
                      label="Brightness"
                      value={activeStyle.brightness}
                      onChange={(v) => setStyleProp("brightness", v)}
                      min={-100}
                      max={100}
                    />
                    <SliderRow
                      label="Contrast"
                      value={activeStyle.contrast}
                      onChange={(v) => setStyleProp("contrast", v)}
                      min={-100}
                      max={100}
                    />
                    <SliderRow
                      label="Saturation"
                      value={activeStyle.saturation}
                      onChange={(v) => setStyleProp("saturation", v)}
                      min={-100}
                      max={100}
                    />
                    <div className="mt-4 space-y-2">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">
                        Levels
                      </p>
                      {[
                        {
                          label: "Brightness",
                          val: activeStyle.brightness,
                          color: "#fbbf24",
                        },
                        {
                          label: "Contrast",
                          val: activeStyle.contrast,
                          color: "#60a5fa",
                        },
                        {
                          label: "Saturation",
                          val: activeStyle.saturation,
                          color: "#34d399",
                        },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-500 w-16 shrink-0">
                            {label}
                          </span>
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.abs(val)}%`,
                                background: color,
                                marginLeft:
                                  val < 0
                                    ? `${50 - Math.abs(val) / 2}%`
                                    : "50%",
                              }}
                            />
                          </div>
                          <span
                            className="text-[9px] font-mono w-7 text-right shrink-0"
                            style={{ color: val !== 0 ? color : "#475569" }}
                          >
                            {val > 0 ? "+" : ""}
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                    {(activeStyle.brightness !== 0 ||
                      activeStyle.contrast !== 0 ||
                      activeStyle.saturation !== 0) && (
                      <button
                        onClick={() => {
                          setStyleProp("brightness", 0);
                          setStyleProp("contrast", 0);
                          setStyleProp("saturation", 0);
                        }}
                        className="w-full mt-3 py-1.5 text-[11px] rounded bg-slate-800/60 border border-white/5 text-slate-400 hover:text-white transition-all"
                      >
                        Reset Adjustments
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Placeholder for remaining tabs (text, captions) */}
              {sidebarTool !== "upload" &&
                sidebarTool !== "audio" &&
                sidebarTool !== "autozoom" &&
                sidebarTool !== "transitions" &&
                sidebarTool !== "filters" &&
                sidebarTool !== "adjust" && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-600">
                      {sidebarItems.find((s) => s.id === sidebarTool)?.icon}
                    </div>
                    <p className="text-[12px] text-slate-500 capitalize">
                      {sidebarTool}
                    </p>
                    <p className="text-[11px] text-slate-700">Coming soon</p>
                  </div>
                )}
            </>
          )}
        </div>

        {/* PREVIEW */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 min-w-0 p-4 gap-4 overflow-hidden">
          <div
            className="relative bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 shrink-0 transition-all duration-300"
            style={{
              aspectRatio: ratioMap[aspectRatio],
              width: "100%",
              maxWidth: ratioMaxW[aspectRatio],
              maxHeight: ratioMaxH[aspectRatio],
            }}
          >
            <video
              ref={videoRef}
              src={previewUrl ?? undefined}
              className="absolute inset-0 w-full h-full object-contain"
              onTimeUpdate={onVideoTimeUpdate}
              onEnded={onVideoEnded}
              onLoadedMetadata={onVideoLoadedMetadata}
              playsInline
              style={{
                transform: `translate(${playingClipStyle.posX}px, ${playingClipStyle.posY}px) scale(${playingClipStyle.scale / 100}) rotate(${playingClipStyle.rotation}deg)${playingVidClip?.mirrored ? " scaleX(-1)" : ""}`,
                opacity: playingClipStyle.opacity / 100,
                filter: buildCSSFilter(playingClipStyle),
                clipPath: (() => {
                  const crop = playingVidClip?.crop;
                  if (!crop || Object.values(crop).every((v) => v === 0))
                    return undefined;
                  return `inset(${crop.top}% ${crop.right}% ${crop.bottom}% ${crop.left}%)`;
                })(),
                display: previewUrl ? "block" : "none",
                zIndex: 1,
              }}
            />
            {!previewUrl && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-700"
                style={{ zIndex: 1 }}
              >
                <svg
                  width="44"
                  height="44"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="opacity-25"
                >
                  <path
                    d="M15 10l4.553-2.276A1 1 0 0121 8.67v6.66a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                    stroke="#14b8a6"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="text-sm text-slate-600">
                  Upload a video to preview
                </p>
              </div>
            )}
            {inVideoGap && previewUrl && (
              <div
                className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-2 pointer-events-none"
                style={{ zIndex: 3 }}
              >
                <svg
                  width="28"
                  height="28"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="opacity-20"
                >
                  <rect
                    x="2"
                    y="2"
                    width="20"
                    height="20"
                    rx="3"
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M8 12h8M12 8v8"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-[11px] text-white/20 font-mono">gap</span>
              </div>
            )}
            <audio ref={audioRef} className="hidden" />
            <div className="absolute bottom-2.5 left-3 font-mono text-[11px] text-white/50 bg-black/60 px-2 py-0.5 rounded pointer-events-none">
              {fmtTC(currentSec)}
            </div>
            {selectedClip && (
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-teal-400 font-mono pointer-events-none">
                {selectedClip.name} ·{" "}
                {fmt(selectedClip.end - selectedClip.start)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-52 xl:w-60 bg-slate-900/60 border-l border-white/5 flex-col shrink-0 overflow-y-auto hidden lg:flex min-h-0">
          <RightSection title="Canvas Ratio">
            <div className="grid grid-cols-2 gap-1.5">
              {(["16:9", "9:16", "1:1", "4:3"] as const).map((r) => {
                const labels: Record<string, string> = {
                  "16:9": "Landscape",
                  "9:16": "Portrait",
                  "1:1": "Square",
                  "4:3": "Classic",
                };
                return (
                  <button
                    key={r}
                    onClick={() => setAspectRatio(r)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-lg border transition-all ${aspectRatio === r ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "bg-slate-800/50 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-800"}`}
                  >
                    <div
                      className={`border-2 rounded-sm ${aspectRatio === r ? "border-teal-400" : "border-slate-600"}`}
                      style={{
                        width:
                          r === "9:16"
                            ? 12
                            : r === "1:1"
                              ? 16
                              : r === "4:3"
                                ? 18
                                : 20,
                        height:
                          r === "9:16"
                            ? 20
                            : r === "1:1"
                              ? 16
                              : r === "4:3"
                                ? 14
                                : 12,
                      }}
                    />
                    <span className="text-[10px] font-semibold">{r}</span>
                    <span className="text-[9px] opacity-60">{labels[r]}</span>
                  </button>
                );
              })}
            </div>
          </RightSection>

          <div
            className={`mx-3 mt-3 mb-1 px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-2 border shrink-0 ${selectedClip ? "bg-teal-500/10 border-teal-500/30 text-teal-400" : "bg-slate-800/60 border-white/5 text-slate-400"}`}
          >
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${selectedClip ? "bg-teal-400" : "bg-slate-500"}`}
            />
            <span className="truncate font-medium">
              {selectedClip
                ? `Clip: ${selectedClip.name}`
                : "Global — all clips"}
            </span>
            {selectedClip?.style && (
              <button
                onClick={resetClipStyle}
                className="ml-auto text-[9px] text-slate-500 hover:text-red-400 transition-colors shrink-0 underline"
              >
                Reset
              </button>
            )}
          </div>

          <RightSection title="Transform">
            <SliderRow
              label="Pos X"
              value={activeStyle.posX}
              onChange={(v) => setStyleProp("posX", v)}
              min={-300}
              max={300}
              unit="px"
            />
            <SliderRow
              label="Pos Y"
              value={activeStyle.posY}
              onChange={(v) => setStyleProp("posY", v)}
              min={-300}
              max={300}
              unit="px"
            />
            <SliderRow
              label="Scale"
              value={activeStyle.scale}
              onChange={(v) => setStyleProp("scale", v)}
              min={10}
              max={200}
              unit="%"
            />
            <SliderRow
              label="Rotation"
              value={activeStyle.rotation}
              onChange={(v) => setStyleProp("rotation", v)}
              min={-180}
              max={180}
              unit="°"
            />
            <SliderRow
              label="Opacity"
              value={activeStyle.opacity}
              onChange={(v) => setStyleProp("opacity", v)}
              min={0}
              max={100}
              unit="%"
            />
          </RightSection>

          {selectedClip && (
            <RightSection title="Speed">
              <SliderRow
                label="Playback"
                value={activeStyle.speed}
                onChange={(v) => setStyleProp("speed", v)}
                min={1}
                max={40}
                display={(activeStyle.speed / 10).toFixed(1) + "x"}
              />
              <div className="flex gap-1 mt-2 flex-wrap">
                {[0.5, 1, 1.5, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyleProp("speed", s * 10)}
                    className={`flex-1 py-1 text-[10px] rounded border transition-all ${activeStyle.speed === s * 10 ? "bg-teal-500/20 border-teal-500/40 text-teal-300 font-semibold" : "bg-slate-800/60 border-white/5 text-gray-400 hover:text-gray-200"}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </RightSection>
          )}

          <RightSection title="Volume">
            <div
              className={`mb-2.5 px-2 py-1 rounded-md text-[10px] flex items-center gap-1.5 ${selectedClip ? "bg-teal-500/10 text-teal-400" : "bg-slate-800/50 text-slate-500"}`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedClip ? "bg-teal-400" : "bg-slate-600"}`}
              />
              <span className="truncate">
                {selectedClip ? "Clip volume" : "Global volume"}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                className="shrink-0 text-slate-500"
              >
                {(activeStyle.volume ?? 100) === 0 ? (
                  <path
                    d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (activeStyle.volume ?? 100) < 50 ? (
                  <path
                    d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
              <div className="flex-1">
                <SliderRow
                  label=""
                  value={activeStyle.volume ?? 100}
                  onChange={(v) => setStyleProp("volume", v)}
                  min={0}
                  max={100}
                  unit="%"
                />
              </div>
            </div>
            <div className="flex gap-1 mt-1">
              {[0, 25, 50, 75, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setStyleProp("volume", v)}
                  className={`flex-1 py-0.5 text-[9px] rounded border transition-all ${(activeStyle.volume ?? 100) === v ? "bg-teal-500/20 border-teal-500/40 text-teal-300 font-semibold" : "bg-slate-800/60 border-white/5 text-gray-400 hover:text-gray-200"}`}
                >
                  {v === 0 ? "🔇" : `${v}%`}
                </button>
              ))}
            </div>
          </RightSection>

          {selectedClip && (
            <RightSection title="Clip Info">
              <div className="space-y-1.5">
                <p className="text-[11px] text-white truncate font-medium">
                  {selectedClip.name}
                </p>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Start</span>
                  <span className="font-mono text-white">
                    {fmt(selectedClip.start)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>End</span>
                  <span className="font-mono text-white">
                    {fmt(selectedClip.end)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Duration</span>
                  <span className="font-mono text-teal-400">
                    {fmt(selectedClip.end - selectedClip.start)}
                  </span>
                </div>
                {selectedClip.style?.speed !== undefined &&
                  selectedClip.style.speed !== 10 && (
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Speed</span>
                      <span className="font-mono text-amber-400">
                        {(selectedClip.style.speed / 10).toFixed(1)}x
                      </span>
                    </div>
                  )}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {selectedClip.mirrored && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-teal-500/20 text-teal-300 border border-teal-500/20">
                      Mirrored
                    </span>
                  )}
                  {selectedClip.reversed && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-teal-500/20 text-teal-300 border border-teal-500/20">
                      Reversed
                    </span>
                  )}
                  {(selectedClip.autoZooms?.length ?? 0) > 0 && (
                    <span className="px-1.5 py-0.5 text-[9px] rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">
                      Zoom ×{selectedClip.autoZooms!.length}
                    </span>
                  )}
                  {selectedClip.crop &&
                    Object.values(selectedClip.crop).some(
                      (v: number) => v > 0,
                    ) && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-teal-500/20 text-teal-300 border border-teal-500/20">
                        Cropped
                      </span>
                    )}
                  {selectedClip.style?.filter &&
                    selectedClip.style.filter !== "None" && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-violet-500/20 text-violet-300 border border-violet-500/20">
                        {selectedClip.style.filter}
                      </span>
                    )}
                  {selectedClip.style?.scale !== undefined &&
                    selectedClip.style.scale !== 100 && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-blue-500/20 text-blue-300 border border-blue-500/20">
                        Scale {selectedClip.style.scale}%
                      </span>
                    )}
                  {selectedClip.style?.opacity !== undefined &&
                    selectedClip.style.opacity !== 100 && (
                      <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-500/20 text-amber-300 border border-amber-500/20">
                        Opacity {selectedClip.style.opacity}%
                      </span>
                    )}
                </div>
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={resetClipStyle}
                    className="flex-1 py-1.5 text-[11px] rounded bg-slate-700/50 border border-white/5 text-slate-400 hover:text-white transition-all"
                  >
                    Reset Style
                  </button>
                  <button
                    onClick={deleteSelected}
                    className="flex-1 py-1.5 text-[11px] rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </RightSection>
          )}
        </div>
      </div>

      {/* TIMELINE */}
      <div
        className="shrink-0 bg-slate-900/80 backdrop-blur-sm border-t border-white/5"
        style={{ height: 260 }}
      >
        {/* Timeline Navbar */}
        <div className="flex items-center px-3 h-11 border-b border-white/5 shrink-0 gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={splitAtPlayhead}
              disabled={!selectedClip}
              title="Split clip at playhead (S)"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded bg-slate-800/80 border border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-700/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                <path
                  d="M12 2v20M4 8l3 3-3 3M20 8l-3 3 3 3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Split
            </button>
            <button
              onClick={() => {
                if (!selectedClip) return;
                if (
                  currentSec <= selectedClip.start ||
                  currentSec >= selectedClip.end - 0.1
                )
                  return;
                const trimmed = snap(currentSec) - selectedClip.start;
                setClips((prev) =>
                  prev.map((c) =>
                    c.id === selectedClip.id
                      ? {
                          ...c,
                          start: snap(currentSec),
                          sourceOffset: (c.sourceOffset ?? 0) + trimmed,
                        }
                      : c,
                  ),
                );
                toast.success("Trimmed left edge");
              }}
              disabled={!selectedClip}
              title="Trim left edge to playhead"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded bg-slate-800/80 border border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-700/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                <path
                  d="M17 3H7l6 9-6 9h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Trim ←
            </button>
            <button
              onClick={() => {
                if (!selectedClip) return;
                if (
                  currentSec <= selectedClip.start + 0.1 ||
                  currentSec >= selectedClip.end
                )
                  return;
                setClips((prev) =>
                  prev.map((c) =>
                    c.id === selectedClip.id
                      ? { ...c, end: snap(currentSec) }
                      : c,
                  ),
                );
                toast.success("Trimmed right edge");
              }}
              disabled={!selectedClip}
              title="Trim right edge to playhead"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded bg-slate-800/80 border border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-700/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                <path
                  d="M7 3h10L11 12l6 9H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Trim →
            </button>
            {selectedClip && (
              <button
                onClick={deleteSelected}
                title="Delete selected clip (Del)"
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
            {selectedClip && (
              <div className="w-px h-5 bg-white/10 shrink-0 mx-0.5" />
            )}
            {selectedClip?.type === "vid" && (
              <button
                onClick={() => {
                  const c = selectedClip.crop ?? {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  };
                  setCropDraft({ ...c });
                  setShowCropModal(true);
                }}
                title="Crop selected clip"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border transition-all shrink-0 ${selectedClip.crop && Object.values(selectedClip.crop).some((v: number) => v > 0) ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "bg-slate-800/80 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-700/80"}`}
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M6 2v14a2 2 0 002 2h14M2 6h14a2 2 0 012 2v14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Crop
              </button>
            )}
            {selectedClip?.type === "vid" && (
              <button
                onClick={() => {
                  setClips((prev) =>
                    prev.map((c) =>
                      c.id === selectedClip.id
                        ? { ...c, mirrored: !c.mirrored }
                        : c,
                    ),
                  );
                  toast.success(
                    selectedClip.mirrored ? "Mirror removed" : "Mirrored",
                  );
                }}
                title="Mirror selected clip horizontally"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border transition-all shrink-0 ${selectedClip.mirrored ? "bg-teal-500/15 border-teal-500/40 text-teal-300" : "bg-slate-800/80 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-700/80"}`}
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 3v18M3 7l4 5-4 5M21 7l-4 5 4 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Mirror
              </button>
            )}
            {selectedClip?.type === "vid" && selectedClip.url && (
              <button
                onClick={async () => {
                  const tid = toast.loading("Extracting audio…");
                  try {
                    const response = await fetch(selectedClip.url!);
                    const arrayBuffer = await response.arrayBuffer();
                    const audioCtx = new AudioContext();
                    const audioBuffer =
                      await audioCtx.decodeAudioData(arrayBuffer);
                    const offlineCtx = new OfflineAudioContext(
                      audioBuffer.numberOfChannels,
                      audioBuffer.length,
                      audioBuffer.sampleRate,
                    );
                    const source = offlineCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(offlineCtx.destination);
                    source.start(0);
                    const rendered = await offlineCtx.startRendering();
                    const wavBuffer = audioBufferToWav(rendered);
                    const blob = new Blob([wavBuffer], { type: "audio/wav" });
                    const blobUrl = URL.createObjectURL(blob);
                    const baseName = selectedClip.name.replace(/\.[^.]+$/, "");
                    const newAudioClip: Clip = {
                      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                      name: `${baseName}_audio.wav`,
                      trackId: "trk-a",
                      start: selectedClip.start,
                      end: selectedClip.end,
                      type: "aud",
                      selected: false,
                      url: blobUrl,
                      sourceDuration: selectedClip.end - selectedClip.start,
                    };
                    setClips((prev) => [
                      ...prev.map((c) => ({ ...c, selected: false })),
                      newAudioClip,
                    ]);
                    toast.dismiss(tid);
                    toast.success("Audio extracted and added to audio track");
                    audioCtx.close();
                  } catch {
                    toast.dismiss(tid);
                    toast.error("No audio track found in this clip");
                  }
                }}
                title="Extract audio and add to audio track"
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border transition-all shrink-0 bg-slate-800/80 border-white/5 text-gray-400 hover:text-gray-200 hover:bg-slate-700/80"
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M9 18V5l12-2v13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="6"
                    cy="18"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <circle
                    cx="18"
                    cy="16"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
                Extract Audio
              </button>
            )}
            {selectedClip?.type === "aud" && selectedClip.url && (
              <button
                onClick={async () => {
                  const tid = toast.loading("Preparing download…");
                  try {
                    const a = document.createElement("a");
                    a.href = selectedClip.url!;
                    a.download = selectedClip.name.endsWith(".wav")
                      ? selectedClip.name
                      : selectedClip.name.replace(/\.[^.]+$/, "") + ".wav";
                    a.click();
                    toast.dismiss(tid);
                    toast.success("Audio downloaded");
                  } catch {
                    toast.dismiss(tid);
                    toast.error("Download failed");
                  }
                }}
                title="Download selected audio clip"
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded border transition-all shrink-0 bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20 hover:text-teal-300"
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Download
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 mx-auto shrink-0">
            <TlCtrlBtn disabled={!hasClips} onClick={() => seekTo(0)}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                <path
                  d="M19 20L9 12l10-8v16zM5 4v16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </TlCtrlBtn>
            <TlCtrlBtn
              disabled={!hasClips}
              onClick={() => seekTo(Math.max(0, currentSec - 5))}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                <path
                  d="M11 19l-7-7 7-7M18 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </TlCtrlBtn>
            <button
              onClick={hasClips ? togglePlay : undefined}
              disabled={!hasClips}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none active:scale-95 bg-teal-500 hover:bg-teal-400 shadow-md shadow-teal-500/30 disabled:active:scale-100"
            >
              {playing ? (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" fill="#000" />
                  <rect x="14" y="4" width="4" height="16" rx="1" fill="#000" />
                </svg>
              ) : (
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24">
                  <path d="M6 4l14 8-14 8V4z" fill="#000" />
                </svg>
              )}
            </button>
            <TlCtrlBtn
              disabled={!hasClips}
              onClick={() => seekTo(Math.min(totalSec, currentSec + 5))}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                <path
                  d="M13 5l7 7-7 7M6 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </TlCtrlBtn>
            <TlCtrlBtn disabled={!hasClips} onClick={() => seekTo(totalSec)}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24">
                <path
                  d="M5 4l10 8-10 8V4zM19 4v16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </TlCtrlBtn>
            <span className="font-mono text-[11px] text-gray-400 tabular-nums px-1 hidden sm:block">
              {fmt(currentSec)} / {fmt(totalSec)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setPxPerSec((p) => Math.max(8, p - 4))}
              className="w-6 h-6 rounded bg-slate-800 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white text-sm transition-all"
            >
              −
            </button>
            <span className="text-[11px] text-gray-400 min-w-8 text-center font-mono">
              {Math.round((pxPerSec / 20) * 100)}%
            </span>
            <button
              onClick={() => setPxPerSec((p) => Math.min(60, p + 4))}
              className="w-6 h-6 rounded bg-slate-800 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white text-sm transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Tracks */}
        <div
          ref={timelineScrollRef}
          className="overflow-x-auto overflow-y-auto h-54"
          style={{ cursor: activeTool === "split" ? "col-resize" : "default" }}
        >
          <div
            style={{
              width: totalW + LABEL_W + 16,
              minWidth: "100%",
              position: "relative",
              paddingBottom: 8,
            }}
          >
            {/* Ruler */}
            <div
              className="flex items-end sticky top-0 z-10 bg-slate-900/95"
              style={{ height: 24, paddingLeft: LABEL_W }}
            >
              <div className="relative flex-1" style={{ height: 24 }}>
                {rulerMarks.map((i) => {
                  const isMajor = i % 5 === 0;
                  return (
                    <div
                      key={i}
                      className="absolute bottom-0 flex flex-col items-center"
                      style={{ left: secToPx(i) }}
                    >
                      {isMajor && (
                        <span className="text-[9px] text-slate-500 font-mono mb-0.5 whitespace-nowrap select-none">
                          {fmt(i)}
                        </span>
                      )}
                      <div
                        style={{
                          width: 1,
                          height: isMajor ? 10 : 5,
                          background: isMajor ? "#475569" : "#1e293b",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none"
              style={{ left: LABEL_W + secToPx(currentSec) }}
            >
              <div
                style={{
                  width: 1,
                  height: "100%",
                  background: "rgba(20,184,166,0.85)",
                }}
              />
              <div
                className="absolute top-0 -left-1.75 w-3.75 h-3.75 cursor-grab active:cursor-grabbing pointer-events-auto"
                style={{
                  background: "#14b8a6",
                  clipPath: "polygon(50% 0%,100% 40%,100% 100%,0 100%,0 40%)",
                  zIndex: 40,
                }}
                onMouseDown={startPlayheadDrag}
              />
            </div>

            {/* Track rows */}
            {tracks.map((track) => {
              const trackClips = clips.filter((c) => c.trackId === track.id);
              return (
                <div
                  key={track.id}
                  className="flex items-center"
                  style={{ height: 40, marginBottom: 2 }}
                >
                  <div
                    className="shrink-0 flex flex-col items-end justify-center pr-2 gap-0.5"
                    style={{ width: LABEL_W }}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${trackDotColor[track.type]}`}
                    />
                    <span className="text-[9px] text-slate-500 whitespace-nowrap">
                      {track.label}
                    </span>
                  </div>
                  <div
                    ref={(el) => {
                      laneRefs.current[track.id] = el;
                    }}
                    className="relative shrink-0 h-full rounded-md"
                    style={{
                      width: totalW,
                      background: trackLaneBg[track.type],
                      cursor: activeTool === "split" ? "col-resize" : "default",
                    }}
                    onClick={(e) => onLaneClick(e, track.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      // Auto Zoom drop onto lane (fallback for drops that miss clip bodies)
                      if (track.type === "vid" && draggingAutoZoomRef.current) {
                        const az = draggingAutoZoomRef.current;
                        const lane = laneRefs.current[track.id];
                        if (!lane) return;
                        const dropSec = pxToSec(
                          e.clientX - lane.getBoundingClientRect().left,
                        );
                        const targetClip = trackClips.find(
                          (c) => dropSec >= c.start && dropSec < c.end,
                        );
                        if (!targetClip) {
                          toast.error("Drop onto a video clip, not a gap");
                          draggingAutoZoomRef.current = null;
                          setDragOverClipId(null);
                          return;
                        }
                        const clipDur = targetClip.end - targetClip.start;
                        const dropInClip = dropSec - targetClip.start;
                        const segDur = Math.min(
                          Math.max(1, clipDur / 3),
                          clipDur,
                        );
                        const newStart =
                          Math.round(
                            Math.max(
                              0,
                              Math.min(
                                dropInClip - segDur / 2,
                                clipDur - segDur,
                              ),
                            ) * 10,
                          ) / 10;
                        const newEnd =
                          Math.round(
                            Math.min(newStart + segDur, clipDur) * 10,
                          ) / 10;
                        const newEntry: AppliedAutoZoom = {
                          id: `az-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                          type: az.id,
                          startSec: newStart,
                          endSec: newEnd,
                        };
                        setClips((prev) =>
                          prev.map((c) =>
                            c.id === targetClip.id
                              ? {
                                  ...c,
                                  autoZooms: [...(c.autoZooms ?? []), newEntry],
                                }
                              : c,
                          ),
                        );
                        draggingAutoZoomRef.current = null;
                        setDragOverClipId(null);
                        toast.success(
                          `${az.label} added to "${targetClip.name}"`,
                        );
                        return;
                      }
                      // Media drop
                      const item = draggingMediaRef.current;
                      if (!item) return;
                      const compatible =
                        (track.type === "vid" &&
                          (item.type === "vid" || item.type === "aud")) ||
                        (track.type === "aud" && item.type === "aud");
                      if (!compatible) {
                        toast.error(
                          `Can't drop ${item.type === "vid" ? "video" : "audio"} onto a ${track.label} track`,
                        );
                        return;
                      }
                      const lane = laneRefs.current[track.id];
                      if (!lane) return;
                      const dropSec = snap(
                        Math.max(
                          0,
                          Math.min(
                            pxToSec(
                              e.clientX - lane.getBoundingClientRect().left,
                            ),
                            totalSec,
                          ),
                        ),
                      );
                      const clampedDur = Math.min(item.duration, MAX_CLIP_SEC);
                      const newClip: Clip = {
                        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        name: item.name,
                        trackId: track.id,
                        start: dropSec,
                        end: snap(dropSec + clampedDur),
                        type:
                          item.type === "vid" && track.type === "vid"
                            ? "vid"
                            : "aud",
                        selected: true,
                        url: item.url,
                        sourceDuration: clampedDur,
                      };
                      setClips((prev) => {
                        const updated = [
                          ...prev.map((c) => ({ ...c, selected: false })),
                          newClip,
                        ];
                        if (item.type === "vid") {
                          const fv = updated
                            .filter((c) => c.type === "vid" && c.url)
                            .sort((a, b) => a.start - b.start)[0];
                          if (fv) setTimeout(() => setPlayingClip(fv), 0);
                        }
                        return updated;
                      });
                      draggingMediaRef.current = null;
                      toast.success(
                        `Dropped "${item.name}" at ${fmt(dropSec)}`,
                      );
                    }}
                  >
                    {/* Gap indicators + transition cut-point drop zones */}
                    {(() => {
                      const sorted = trackClips
                        .slice()
                        .sort((a, b) => a.start - b.start);
                      const elements: React.ReactNode[] = [];
                      for (let i = 1; i < sorted.length; i++) {
                        const prev = sorted[i - 1];
                        const curr = sorted[i];
                        const gap = curr.start - prev.end;
                        const cutKey = `${prev.id}__${curr.id}`;
                        if (gap > 0.15) {
                          elements.push(
                            <div
                              key={`gap-${prev.id}`}
                              className="absolute top-1 bottom-1 pointer-events-none"
                              style={{
                                left: secToPx(prev.end),
                                width: secToPx(gap),
                                background:
                                  "repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 3px, transparent 3px, transparent 8px)",
                                border: "1px dashed rgba(255,255,255,0.08)",
                                borderRadius: 4,
                              }}
                            >
                              {secToPx(gap) > 30 && (
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-white/20 font-mono select-none">
                                  gap
                                </span>
                              )}
                            </div>,
                          );
                        } else if (track.type === "vid") {
                          const existing = appliedTransitions.find(
                            (t) =>
                              t.clipAId === prev.id && t.clipBId === curr.id,
                          );
                          const isOver = dragOverCutId === cutKey;
                          const CUT_W = 24;
                          const cutX = secToPx(prev.end) - CUT_W / 2;
                          elements.push(
                            <div
                              key={`cut-${cutKey}`}
                              className="absolute top-0 bottom-0 flex items-center justify-center"
                              style={{
                                left: cutX,
                                width: CUT_W,
                                zIndex: 30,
                                pointerEvents: "auto",
                              }}
                              onDragOver={(e) => {
                                if (!draggingTransitionRef.current) return;
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverCutId(cutKey);
                              }}
                              onDragLeave={() => setDragOverCutId(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDragOverCutId(null);
                                const tr = draggingTransitionRef.current;
                                if (!tr) return;
                                setAppliedTransitions((prev2) => {
                                  const filtered = prev2.filter(
                                    (t) =>
                                      !(
                                        t.clipAId === prev.id &&
                                        t.clipBId === curr.id
                                      ),
                                  );
                                  return [
                                    ...filtered,
                                    {
                                      id: `tr-${Date.now()}`,
                                      type: tr.id,
                                      clipAId: prev.id,
                                      clipBId: curr.id,
                                      duration: 0.3,
                                    },
                                  ];
                                });
                                toast.success(`${tr.label} transition applied`);
                              }}
                            >
                              <div
                                className="absolute top-0 bottom-0"
                                style={{
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  width: isOver ? 2 : existing ? 2 : 1,
                                  background: isOver
                                    ? "#14b8a6"
                                    : existing
                                      ? "rgba(167,139,250,0.9)"
                                      : "rgba(255,255,255,0.18)",
                                  transition: "background 0.15s, width 0.1s",
                                }}
                              />
                              {existing && (
                                <div
                                  className="absolute flex items-center gap-0.5 px-1.5 py-0.5 rounded-md cursor-pointer select-none"
                                  style={{
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    background: "rgba(109,40,217,0.92)",
                                    border: "1px solid rgba(167,139,250,0.55)",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                    whiteSpace: "nowrap",
                                    zIndex: 40,
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAppliedTransitions((p) =>
                                      p.filter(
                                        (t) =>
                                          !(
                                            t.clipAId === prev.id &&
                                            t.clipBId === curr.id
                                          ),
                                      ),
                                    );
                                    toast.success("Transition removed");
                                  }}
                                  title="Click to remove"
                                >
                                  <span className="text-[8px] font-bold text-white">
                                    {TRANSITIONS.find(
                                      (t) => t.id === existing.type,
                                    )?.label ?? existing.type}
                                  </span>
                                  <X className="w-2 h-2 text-violet-300 ml-0.5" />
                                </div>
                              )}
                              {isOver && !existing && (
                                <div
                                  className="absolute flex items-center justify-center rounded-full"
                                  style={{
                                    top: "50%",
                                    left: "50%",
                                    transform: "translate(-50%,-50%)",
                                    width: 18,
                                    height: 18,
                                    background: "rgba(20,184,166,0.9)",
                                    border: "2px solid #14b8a6",
                                    zIndex: 40,
                                  }}
                                >
                                  <svg
                                    width="8"
                                    height="8"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      d="M12 5v14M5 12h14"
                                      stroke="white"
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>,
                          );
                        }
                      }
                      return elements;
                    })()}

                    {trackClips.map((clip) => {
                      const col = CLIP_COLORS[clip.type];
                      const left = secToPx(clip.start);
                      const width = secToPx(clip.end - clip.start);
                      const wave = getWave(clip.id);
                      const clipSpeed = clip.style?.speed;
                      const showSpeedBadge =
                        clipSpeed !== undefined && clipSpeed !== 10;
                      const isAzTarget = dragOverClipId === clip.id;
                      return (
                        <div
                          key={clip.id}
                          className="clip-el absolute top-1 bottom-1 rounded group"
                          style={{
                            left,
                            width,
                            background: col.bg,
                            border: `1px solid ${clip.selected ? "rgba(20,184,166,0.9)" : isAzTarget ? "rgba(20,184,166,0.7)" : col.border}`,
                            boxShadow: clip.selected
                              ? "0 0 0 1px rgba(20,184,166,0.35),0 0 8px rgba(20,184,166,0.15)"
                              : isAzTarget
                                ? "0 0 0 2px rgba(20,184,166,0.4)"
                                : "none",
                            cursor:
                              activeTool === "split" ? "col-resize" : "grab",
                            zIndex: clip.selected ? 5 : 2,
                            transition: "border 0.1s, box-shadow 0.1s",
                          }}
                          onMouseDown={(e) => startClipDrag(e, clip.id, "move")}
                          onClick={(e) => selectClip(clip.id, e)}
                          onDragOver={(e) => {
                            if (
                              draggingAutoZoomRef.current &&
                              clip.type === "vid"
                            ) {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverClipId(clip.id);
                            }
                          }}
                          onDragLeave={() => {
                            if (dragOverClipId === clip.id)
                              setDragOverClipId(null);
                          }}
                          onDrop={(e) => {
                            if (!draggingAutoZoomRef.current) return;
                            e.preventDefault();
                            e.stopPropagation();
                            const az = draggingAutoZoomRef.current;
                            const clipDur = clip.end - clip.start;
                            const segDur = Math.min(
                              Math.max(1, clipDur / 3),
                              clipDur,
                            );
                            // Position the new effect at the end of existing ones, or full clip if none
                            const lastEnd = (clip.autoZooms ?? []).reduce(
                              (m: number, e2: AppliedAutoZoom) =>
                                Math.max(m, e2.endSec),
                              0,
                            );
                            const newStart = clip.autoZooms?.length
                              ? Math.min(lastEnd, clipDur - 0.5)
                              : 0;
                            const newEnd = Math.min(newStart + segDur, clipDur);
                            const newEntry: AppliedAutoZoom = {
                              id: `az-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                              type: az.id,
                              startSec: Math.round(newStart * 10) / 10,
                              endSec: Math.round(newEnd * 10) / 10,
                            };
                            setClips((prev) =>
                              prev.map((c) =>
                                c.id === clip.id
                                  ? {
                                      ...c,
                                      autoZooms: [
                                        ...(c.autoZooms ?? []),
                                        newEntry,
                                      ],
                                    }
                                  : c,
                              ),
                            );
                            draggingAutoZoomRef.current = null;
                            setDragOverClipId(null);
                            toast.success(
                              `${az.label} added to "${clip.name}"`,
                            );
                          }}
                        >
                          {clip.type === "vid" && width > 0 && (
                            <div className="absolute inset-0 flex overflow-hidden rounded opacity-15 pointer-events-none">
                              {[
                                ...Array(Math.max(1, Math.ceil(width / 30))),
                              ].map((_, i) => (
                                <div
                                  key={i}
                                  style={{
                                    flexShrink: 0,
                                    width: 30,
                                    height: "100%",
                                    background:
                                      i % 2 === 0 ? "#1e3a8a" : "#1d4ed8",
                                    borderRight: "1px solid rgba(0,0,0,0.2)",
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          {clip.type === "aud" && (
                            <div
                              className="absolute inset-0 flex items-center px-1 overflow-hidden opacity-35 pointer-events-none"
                              style={{ gap: 1 }}
                            >
                              {wave.map((h, i) => (
                                <div
                                  key={i}
                                  style={{
                                    flexShrink: 0,
                                    width: 2,
                                    height: h,
                                    background: col.wave,
                                    borderRadius: 1,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <div
                            className="absolute top-0 left-0 bottom-0 rounded-l opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            style={{
                              width: 7,
                              cursor: "col-resize",
                              background: "rgba(255,255,255,0.3)",
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              startClipDrag(e, clip.id, "trim-l");
                            }}
                          />
                          <div
                            className="absolute top-0 right-0 bottom-0 rounded-r opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            style={{
                              width: 7,
                              cursor: "col-resize",
                              background: "rgba(255,255,255,0.3)",
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              startClipDrag(e, clip.id, "trim-r");
                            }}
                          />
                          <div className="relative flex items-center h-full px-2 gap-1.5 overflow-hidden pointer-events-none">
                            <span
                              className="text-[10px] font-medium whitespace-nowrap overflow-hidden text-ellipsis"
                              style={{ color: col.text }}
                            >
                              {clip.name}
                            </span>
                            {showSpeedBadge && width > 50 && (
                              <span
                                className="shrink-0 text-[8px] font-bold px-1 py-0.5 rounded"
                                style={{
                                  background: "rgba(251,191,36,0.25)",
                                  color: "#fbbf24",
                                }}
                              >
                                {(clipSpeed! / 10).toFixed(1)}x
                              </span>
                            )}
                            {width > 60 && (
                              <span
                                className="text-[9px] font-mono ml-auto shrink-0 opacity-55"
                                style={{ color: col.text }}
                              >
                                {fmt(clip.end - clip.start)}
                              </span>
                            )}
                          </div>
                          {activeTool === "split" && (
                            <div
                              className="absolute inset-0 rounded"
                              style={{
                                background: "rgba(20,184,166,0.08)",
                                border: "1px dashed rgba(20,184,166,0.4)",
                              }}
                            />
                          )}

                          {/* ── Auto Zoom overlay boxes ── rendered inside clip bar, positioned by time */}
                          {(clip.autoZooms ?? []).map((az: AppliedAutoZoom) => {
                            const def = AUTO_ZOOMS.find(
                              (d) => d.id === az.type,
                            );
                            const clipDur = clip.end - clip.start;
                            if (clipDur <= 0) return null;
                            const boxLeft = (az.startSec / clipDur) * width;
                            const boxW = Math.max(
                              6,
                              ((az.endSec - az.startSec) / clipDur) * width,
                            );
                            const isActive =
                              playingClipId === clip.id &&
                              currentSec >= clip.start + az.startSec &&
                              currentSec < clip.start + az.endSec;
                            return (
                              <div
                                key={az.id}
                                className="absolute pointer-events-auto group/az"
                                style={{
                                  left: boxLeft,
                                  width: boxW,
                                  top: 2,
                                  bottom: 2,
                                  zIndex: 8,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Open auto zoom drawer and select this clip
                                  setSidebarTool("autozoom");
                                  setDrawerOpen(true);
                                  setClips((prev) =>
                                    prev.map((c) => ({
                                      ...c,
                                      selected: c.id === clip.id,
                                    })),
                                  );
                                }}
                                title={`${def?.label ?? az.type} • ${az.startSec.toFixed(1)}s–${az.endSec.toFixed(1)}s (click to edit)`}
                              >
                                {/* Background bar */}
                                <div
                                  className="absolute inset-0 rounded-sm"
                                  style={{
                                    background: isActive
                                      ? "rgba(59,130,246,0.55)"
                                      : "rgba(59,130,246,0.32)",
                                    border: `1px solid ${isActive ? "rgba(147,197,253,0.9)" : "rgba(147,197,253,0.5)"}`,
                                    backdropFilter: "none",
                                  }}
                                />
                                {/* Label — only if wide enough */}
                                {boxW > 28 && (
                                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
                                    <span className="text-[7px] font-bold text-blue-200 whitespace-nowrap px-0.5 truncate leading-none">
                                      ↗
                                      {boxW > 50
                                        ? ` ${def?.label ?? az.type}`
                                        : ""}
                                    </span>
                                  </div>
                                )}
                                {/* Remove button on hover */}
                                <div
                                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 items-center justify-center hidden group-hover/az:flex z-10 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setClips((prev) =>
                                      prev.map((c) =>
                                        c.id === clip.id
                                          ? {
                                              ...c,
                                              autoZooms: (
                                                c.autoZooms ?? []
                                              ).filter(
                                                (a: AppliedAutoZoom) =>
                                                  a.id !== az.id,
                                              ),
                                            }
                                          : c,
                                      ),
                                    );
                                    toast.success(`${def?.label} removed`);
                                  }}
                                >
                                  <X className="w-2 h-2 text-white" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Add track */}
            <div
              className="flex items-center"
              style={{ height: 30, paddingLeft: LABEL_W }}
            >
              <button
                className="flex items-center justify-center gap-1.5 h-7 rounded-md border border-dashed border-white/10 text-slate-600 text-[11px] hover:border-teal-500/40 hover:text-teal-500/70 transition-all"
                style={{ width: totalW }}
              >
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24">
                  <path
                    d="M12 5v14M5 12h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Add track
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE NAV */}
      <div className="flex md:hidden bg-slate-900 border-t border-white/5 shrink-0">
        {["Video", "Audio", "Text", "FX", "Effects"].map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 text-[9px] transition-all ${mobileTab === tab ? "text-teal-400 bg-teal-500/10" : "text-slate-500"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <style>{`
        .clip-el:active { cursor: grabbing !important; }
        input[type=range] { accent-color: #14b8a6; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        @keyframes tr-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function TlCtrlBtn({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded bg-slate-800/80 hover:bg-slate-700 border border-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-slate-800/80 disabled:hover:text-gray-400"
    >
      {children}
    </button>
  );
}

function RightSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-3 border-b border-white/5">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
  min,
  max,
  unit,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit?: string;
  display?: string;
}) {
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-slate-400">{label}</span>
        <span className="text-[11px] font-mono text-white tabular-nums">
          {display ?? `${value}${unit ?? ""}`}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        className="**:[[role=slider]]:bg-teal-400 **:[[role=slider]]:border-teal-400 **:[[role=slider]]:w-3 **:[[role=slider]]:h-3 **:data-radix-slider-range:bg-teal-500"
      />
    </div>
  );
}

// ── WAV encoder ───────────────────────────────────────────────────────────────
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const wavSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(wavSize);
  const view = new DataView(arrayBuffer);
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(
        offset,
        sample < 0 ? sample * 0x8000 : sample * 0x7fff,
        true,
      );
      offset += 2;
    }
  }
  return arrayBuffer;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++)
    view.setUint8(offset + i, str.charCodeAt(i));
}
