"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  UploadCloud,
  ImagePlus,
  XCircle,
  Paintbrush,
  Eraser,
  Trash2,
  Coins,
  Undo2,
  Paperclip,
  Crop,
  Check,
  X,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Square,
  RectangleHorizontal,
  Maximize2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Plus,
  Copy,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  Scissors,
  Zap,
  Brush,
  Undo,
  Eye,
  Layers,
  ChevronDown,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";
import { fal } from "@fal-ai/client";

fal.config({ proxyUrl: "/api/fal/proxy" });

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  urls: string[];
}

// ─── CROP ─────────────────────────────────────────────────────────────────────
interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
type AspectRatioOption = "free" | "1:1" | "4:3" | "16:9" | "3:4" | "9:16";
const ASPECT_RATIOS: {
  label: string;
  value: AspectRatioOption;
  icon: React.ReactNode;
}[] = [
  { label: "Free", value: "free", icon: <Maximize2 className="w-3 h-3" /> },
  { label: "1:1", value: "1:1", icon: <Square className="w-3 h-3" /> },
  {
    label: "4:3",
    value: "4:3",
    icon: <RectangleHorizontal className="w-3 h-3" />,
  },
  {
    label: "16:9",
    value: "16:9",
    icon: <RectangleHorizontal className="w-3 h-3" />,
  },
  {
    label: "3:4",
    value: "3:4",
    icon: <div className="w-2.5 h-3.5 border border-current rounded-sm" />,
  },
  {
    label: "9:16",
    value: "9:16",
    icon: <div className="w-2 h-3.5 border border-current rounded-sm" />,
  },
];
const getAspectRatioValue = (ratio: AspectRatioOption): number | null => {
  const map: Record<string, number> = {
    "1:1": 1,
    "4:3": 4 / 3,
    "16:9": 16 / 9,
    "3:4": 3 / 4,
    "9:16": 9 / 16,
  };
  return map[ratio] ?? null;
};

// ─── ADJUST ───────────────────────────────────────────────────────────────────
interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  hue: number;
  temperature: number;
  vignette: number;
}
const DEFAULT_ADJUSTMENTS: Adjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hue: 0,
  temperature: 0,
  vignette: 0,
};
interface FilterPreset {
  name: string;
  adjustments: Partial<Adjustments>;
  preview: string;
}
const FILTER_PRESETS: FilterPreset[] = [
  { name: "None", adjustments: {}, preview: "none" },
  {
    name: "Vivid",
    adjustments: { saturation: 150, contrast: 115, brightness: 105 },
    preview: "saturate(1.5) contrast(1.15) brightness(1.05)",
  },
  {
    name: "Matte",
    adjustments: { contrast: 85, saturation: 80, brightness: 108 },
    preview: "contrast(0.85) saturate(0.8) brightness(1.08)",
  },
  {
    name: "Chrome",
    adjustments: { contrast: 130, saturation: 110, brightness: 95 },
    preview: "contrast(1.3) saturate(1.1) brightness(0.95)",
  },
  {
    name: "Fade",
    adjustments: { contrast: 80, saturation: 70, brightness: 115 },
    preview: "contrast(0.8) saturate(0.7) brightness(1.15)",
  },
  {
    name: "Noir",
    adjustments: { saturation: 0, contrast: 130, brightness: 95 },
    preview: "grayscale(1) contrast(1.3) brightness(0.95)",
  },
  {
    name: "Warm",
    adjustments: { temperature: 40, saturation: 115, brightness: 105 },
    preview: "sepia(0.3) saturate(1.15) brightness(1.05)",
  },
  {
    name: "Golden",
    adjustments: { temperature: 60, saturation: 130, contrast: 110 },
    preview: "sepia(0.5) saturate(1.3) contrast(1.1) brightness(1.05)",
  },
  {
    name: "Dusk",
    adjustments: { hue: 20, saturation: 130, contrast: 110, brightness: 95 },
    preview: "hue-rotate(20deg) saturate(1.3) contrast(1.1) brightness(0.95)",
  },
  {
    name: "Mint",
    adjustments: { hue: -30, saturation: 120, brightness: 105 },
    preview: "hue-rotate(-30deg) saturate(1.2) brightness(1.05)",
  },
  {
    name: "Dramatic",
    adjustments: { contrast: 145, saturation: 120 },
    preview: "contrast(1.45) saturate(1.2) brightness(0.9)",
  },
  {
    name: "Cool",
    adjustments: { hue: 190, saturation: 80, brightness: 105 },
    preview: "hue-rotate(190deg) saturate(0.8) brightness(1.05)",
  },
];
const buildCssFilter = (adj: Adjustments): string =>
  [
    `brightness(${adj.brightness / 100})`,
    `contrast(${adj.contrast / 100})`,
    `saturate(${adj.saturation / 100})`,
    `hue-rotate(${adj.hue + adj.temperature * 0.4}deg)`,
    adj.blur > 0 ? `blur(${adj.blur * 0.05}px)` : "",
  ]
    .filter(Boolean)
    .join(" ");

const applyAdjustmentsToCanvas = (
  img: HTMLImageElement,
  adj: Adjustments,
): string => {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.filter = buildCssFilter(adj);
  ctx.drawImage(img, 0, 0);
  ctx.filter = "none";
  if (adj.vignette !== 0) {
    const s = adj.vignette / 100;
    const grad = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      Math.min(canvas.width, canvas.height) * 0.3,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height) * 0.75,
    );
    if (s > 0) {
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${s * 0.85})`);
    } else {
      grad.addColorStop(0, `rgba(255,255,255,${Math.abs(s) * 0.6})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas.toDataURL("image/jpeg", 0.95);
};
const ADJUST_SLIDERS = [
  {
    key: "brightness",
    label: "Brightness",
    min: 0,
    max: 200,
    step: 1,
    default: 100,
    unit: "",
  },
  {
    key: "contrast",
    label: "Contrast",
    min: 0,
    max: 200,
    step: 1,
    default: 100,
    unit: "",
  },
  {
    key: "saturation",
    label: "Saturation",
    min: 0,
    max: 200,
    step: 1,
    default: 100,
    unit: "",
  },
  {
    key: "hue",
    label: "Hue",
    min: -180,
    max: 180,
    step: 1,
    default: 0,
    unit: "°",
  },
  {
    key: "temperature",
    label: "Temperature",
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    unit: "",
  },
  {
    key: "blur",
    label: "Blur",
    min: 0,
    max: 100,
    step: 1,
    default: 0,
    unit: "",
  },
  {
    key: "vignette",
    label: "Vignette",
    min: -100,
    max: 100,
    step: 1,
    default: 0,
    unit: "",
  },
] as const;

// ─── TEXT TYPES ───────────────────────────────────────────────────────────────
type TextVariant = "h1" | "h2" | "p";
type TextAlign = "left" | "center" | "right";
type FontFamily =
  | "Inter"
  | "Playfair Display"
  | "Oswald"
  | "Pacifico"
  | "Space Mono"
  | "Bebas Neue"
  | "Montserrat"
  | "Roboto Slab";

interface TextLayer {
  id: string;
  text: string;
  variant: TextVariant;
  x: number;
  y: number;
  color: string;
  fontFamily: FontFamily;
  align: TextAlign;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: number;
  opacity: number;
  rotation: number;
  shadow: boolean;
  shadowColor: string;
  bgColor: string;
  bgOpacity: number;
  letterSpacing: number;
  strokeColor: string;
  strokeWidth: number;
  noWrap: boolean;
  maxWidth: number;
}

const VARIANT_DEFAULTS: Record<
  TextVariant,
  { fontSize: number; fontWeight: string }
> = {
  h1: { fontSize: 52, fontWeight: "800" },
  h2: { fontSize: 34, fontWeight: "700" },
  p: { fontSize: 17, fontWeight: "400" },
};
const FONT_FAMILIES: FontFamily[] = [
  "Inter",
  "Playfair Display",
  "Oswald",
  "Pacifico",
  "Space Mono",
  "Bebas Neue",
  "Montserrat",
  "Roboto Slab",
];
const TEXT_COLORS = [
  "#FFFFFF",
  "#000000",
  "#F9FAFB",
  "#111827",
  "#06B6D4",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#10B981",
  "#EF4444",
];

interface StylePreset {
  name: string;
  thumb: string;
  patch: Partial<TextLayer>;
}
const STYLE_PRESETS: StylePreset[] = [
  {
    name: "Clean White",
    thumb: "bg-gradient-to-br from-gray-900 to-gray-800",
    patch: {
      color: "#FFFFFF",
      fontFamily: "Inter",
      bold: false,
      italic: false,
      shadow: true,
      shadowColor: "#000000",
      bgColor: "",
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 0,
    },
  },
  {
    name: "Bold Black",
    thumb: "bg-white",
    patch: {
      color: "#000000",
      fontFamily: "Montserrat",
      bold: true,
      italic: false,
      shadow: false,
      bgColor: "",
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 2,
    },
  },
  {
    name: "Neon Cyan",
    thumb: "bg-gray-950",
    patch: {
      color: "#06B6D4",
      fontFamily: "Oswald",
      bold: true,
      italic: false,
      shadow: true,
      shadowColor: "#06B6D4",
      bgColor: "",
      strokeColor: "#06B6D4",
      strokeWidth: 1,
      letterSpacing: 3,
    },
  },
  {
    name: "Gold Luxury",
    thumb: "bg-gradient-to-br from-gray-900 to-black",
    patch: {
      color: "#F59E0B",
      fontFamily: "Playfair Display",
      bold: false,
      italic: true,
      shadow: true,
      shadowColor: "#000000",
      bgColor: "",
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 1,
    },
  },
  {
    name: "Pill Badge",
    thumb: "bg-gradient-to-br from-cyan-600 to-teal-600",
    patch: {
      color: "#000000",
      fontFamily: "Oswald",
      bold: true,
      italic: false,
      shadow: false,
      bgColor: "#06B6D4",
      bgOpacity: 100,
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 3,
      variant: "p" as TextVariant,
    },
  },
  {
    name: "Dark Tag",
    thumb: "bg-gray-800",
    patch: {
      color: "#FFFFFF",
      fontFamily: "Bebas Neue",
      bold: false,
      italic: false,
      shadow: false,
      bgColor: "#000000",
      bgOpacity: 85,
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 4,
    },
  },
  {
    name: "Outline",
    thumb: "bg-gradient-to-br from-purple-900 to-blue-900",
    patch: {
      color: "transparent",
      fontFamily: "Bebas Neue",
      bold: false,
      italic: false,
      shadow: false,
      bgColor: "",
      strokeColor: "#FFFFFF",
      strokeWidth: 2,
      letterSpacing: 5,
    },
  },
  {
    name: "Retro",
    thumb: "bg-amber-50",
    patch: {
      color: "#B45309",
      fontFamily: "Pacifico",
      bold: false,
      italic: false,
      shadow: true,
      shadowColor: "#92400E",
      bgColor: "",
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 0,
    },
  },
  {
    name: "Mono Code",
    thumb: "bg-gray-900",
    patch: {
      color: "#10B981",
      fontFamily: "Space Mono",
      bold: false,
      italic: false,
      shadow: false,
      bgColor: "#000000",
      bgOpacity: 90,
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 1,
    },
  },
  {
    name: "Serif Classic",
    thumb: "bg-stone-100",
    patch: {
      color: "#1C1917",
      fontFamily: "Roboto Slab",
      bold: false,
      italic: false,
      shadow: false,
      bgColor: "",
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 0,
    },
  },
  {
    name: "Fire Red",
    thumb: "bg-gradient-to-br from-red-900 to-orange-900",
    patch: {
      color: "#EF4444",
      fontFamily: "Bebas Neue",
      bold: false,
      italic: false,
      shadow: true,
      shadowColor: "#7F1D1D",
      bgColor: "",
      strokeColor: "#F97316",
      strokeWidth: 1,
      letterSpacing: 4,
    },
  },
  {
    name: "Pastel Pop",
    thumb: "bg-gradient-to-br from-pink-200 to-purple-200",
    patch: {
      color: "#7C3AED",
      fontFamily: "Pacifico",
      bold: false,
      italic: false,
      shadow: false,
      bgColor: "",
      strokeColor: "",
      strokeWidth: 0,
      letterSpacing: 0,
    },
  },
];

let _layerCounter = 0;
const makeLayer = (partial: Partial<TextLayer> = {}): TextLayer => ({
  id: `txt-${++_layerCounter}-${Math.random().toString(36).slice(2, 7)}`,
  text: "Your Text Here",
  variant: "h2",
  x: 50,
  y: 50,
  color: "#FFFFFF",
  fontFamily: "Inter",
  align: "center",
  bold: false,
  italic: false,
  underline: false,
  fontSize: 0,
  opacity: 100,
  rotation: 0,
  shadow: true,
  shadowColor: "#000000",
  bgColor: "",
  bgOpacity: 80,
  letterSpacing: 0,
  strokeColor: "",
  strokeWidth: 0,
  noWrap: true,
  maxWidth: 60,
  ...partial,
});

// ─── OVERLAY IMAGE ────────────────────────────────────────────────────────────
interface OverlayImage {
  id: string;
  src: string;
  x: number; // % of container
  y: number;
  width: number; // % of container
  height: number;
  opacity: number;
  rotation: number;
}

let _overlayCounter = 0;
const makeOverlay = (src: string): OverlayImage => ({
  id: `ov-${++_overlayCounter}-${Math.random().toString(36).slice(2, 6)}`,
  src,
  x: 20,
  y: 20,
  width: 40,
  height: 40,
  opacity: 100,
  rotation: 0,
});

// ─── OVERLAY NODE ─────────────────────────────────────────────────────────────
interface OverlayNodeProps {
  overlay: OverlayImage;
  selected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onUpdate: (p: Partial<OverlayImage>) => void;
  onDelete: () => void;
}

const OVERLAY_CORNERS = [
  { id: "nw", cx: 0, cy: 0 },
  { id: "ne", cx: 1, cy: 0 },
  { id: "se", cx: 1, cy: 1 },
  { id: "sw", cx: 0, cy: 1 },
] as const;

const OverlayNode: React.FC<OverlayNodeProps> = ({
  overlay,
  selected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  const onBodyMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    const rect = containerRef.current!.getBoundingClientRect();
    const ox = overlay.x,
      oy = overlay.y,
      sx = e.clientX,
      sy = e.clientY;
    const move = (ev: MouseEvent) => {
      onUpdate({
        x: Math.max(
          0,
          Math.min(
            100 - overlay.width,
            ox + ((ev.clientX - sx) / rect.width) * 100,
          ),
        ),
        y: Math.max(
          0,
          Math.min(
            100 - overlay.height,
            oy + ((ev.clientY - sy) / rect.height) * 100,
          ),
        ),
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onCornerMouseDown = (e: React.MouseEvent, cx: number, cy: number) => {
    e.stopPropagation();
    const rect = containerRef.current!.getBoundingClientRect();
    const sw = overlay.width,
      sh = overlay.height,
      sox = overlay.x,
      soy = overlay.y;
    const startX = e.clientX,
      startY = e.clientY;
    const move = (ev: MouseEvent) => {
      const dx = ((ev.clientX - startX) / rect.width) * 100;
      const dy = ((ev.clientY - startY) / rect.height) * 100;
      let nx = sox,
        ny = soy,
        nw = sw,
        nh = sh;
      if (cx === 0) {
        nx = sox + dx;
        nw = Math.max(5, sw - dx);
      } else {
        nw = Math.max(5, sw + dx);
      }
      if (cy === 0) {
        ny = soy + dy;
        nh = Math.max(5, sh - dy);
      } else {
        nh = Math.max(5, sh + dy);
      }
      onUpdate({ x: nx, y: ny, width: nw, height: nh });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodeRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    const cx = box.left + box.width / 2,
      cy = box.top + box.height / 2;
    const startAngle =
      Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const startRot = overlay.rotation;
    const move = (ev: MouseEvent) => {
      const angle =
        Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
      onUpdate({ rotation: Math.round(startRot + angle - startAngle) });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      ref={nodeRef}
      onMouseDown={onBodyMouseDown}
      style={{
        position: "absolute",
        left: `${overlay.x}%`,
        top: `${overlay.y}%`,
        width: `${overlay.width}%`,
        height: `${overlay.height}%`,
        transform: `rotate(${overlay.rotation}deg)`,
        opacity: overlay.opacity / 100,
        cursor: "move",
        userSelect: "none",
        zIndex: selected ? 40 : 30,
      }}
    >
      <img
        src={overlay.src}
        alt="overlay"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          pointerEvents: "none",
        }}
      />
      {selected && (
        <>
          <div
            className="absolute inset-0 border-2 border-cyan-400 rounded pointer-events-none"
            style={{ boxShadow: "0 0 0 1px rgba(6,182,212,0.3)" }}
          />
          {OVERLAY_CORNERS.map((h) => (
            <div
              key={h.id}
              onMouseDown={(e) => onCornerMouseDown(e, h.cx, h.cy)}
              style={{
                position: "absolute",
                left: `calc(${h.cx * 100}% - 5px)`,
                top: `calc(${h.cy * 100}% - 5px)`,
                width: 10,
                height: 10,
                background: "#fff",
                border: "2px solid #06B6D4",
                borderRadius: "50%",
                cursor:
                  h.id === "nw" || h.id === "se"
                    ? "nwse-resize"
                    : "nesw-resize",
                zIndex: 50,
              }}
            />
          ))}
          {/* rotation stem + handle */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "100%",
              width: 1.5,
              height: 16,
              background: "#06B6D4",
              transform: "translateX(-50%)",
              pointerEvents: "none",
            }}
          />
          <div
            onMouseDown={onRotateMouseDown}
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(100% + 16px)",
              transform: "translateX(-50%)",
              width: 12,
              height: 12,
              background: "#06B6D4",
              border: "2px solid #fff",
              borderRadius: "50%",
              cursor: "grab",
              zIndex: 50,
              boxShadow: "0 1px 6px rgba(6,182,212,0.7)",
            }}
          />
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              width: 20,
              height: 20,
              background: "#EF4444",
              border: "2px solid #fff",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              fontSize: 10,
              color: "#fff",
              fontWeight: "bold",
            }}
          >
            ×
          </button>
        </>
      )}
    </div>
  );
};

// ─── OVERLAY PANEL (shown in overlay mode) ────────────────────────────────────
interface OverlayPanelProps {
  overlays: OverlayImage[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, p: Partial<OverlayImage>) => void;
  onDelete: (id: string) => void;
  onAdd: (src: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

const OverlayPanel: React.FC<OverlayPanelProps> = ({
  overlays,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
  onAdd,
  onApply,
  onCancel,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const sel = overlays.find((o) => o.id === selectedId) ?? null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onAdd(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" /> Overlay Images
          </span>
          <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">
            {overlays.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* thumbnail row */}
          {overlays.map((o, i) => (
            <button
              key={o.id}
              onClick={() => onSelect(o.id)}
              className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all ${selectedId === o.id ? "border-cyan-400" : "border-gray-600 hover:border-gray-400"}`}
            >
              <img src={o.src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Image
          </button>
          {sel && (
            <button
              onClick={() => onDelete(sel.id)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {overlays.length === 0 ? (
        <div className="text-center py-6 text-gray-600 text-xs">
          Click <strong className="text-gray-500">Add Image</strong> to place an
          image over your photo.
        </div>
      ) : !sel ? (
        <div className="text-center py-4 text-gray-600 text-xs">
          Click an image on the canvas to select it.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            {
              label: "Opacity",
              val: sel.opacity,
              min: 10,
              max: 100,
              step: 1,
              key: "opacity",
            },
            {
              label: "Rotation",
              val: sel.rotation,
              min: -180,
              max: 180,
              step: 1,
              key: "rotation",
            },
            {
              label: "Width",
              val: sel.width,
              min: 5,
              max: 100,
              step: 1,
              key: "width",
            },
            {
              label: "Height",
              val: sel.height,
              min: 5,
              max: 100,
              step: 1,
              key: "height",
            },
          ].map((s) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 w-16 shrink-0">
                {s.label}
              </span>
              <Slider
                value={[s.val]}
                onValueChange={([v]) => onUpdate(sel.id, { [s.key]: v })}
                min={s.min}
                max={s.max}
                step={s.step}
                className="no-sidebar-swipe flex-1"
              />
              <span className="text-[10px] font-mono text-cyan-400/80 w-7 text-right shrink-0">
                {Math.round(s.val)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-9 px-4 rounded-full text-gray-400 hover:text-white border border-gray-700 text-xs gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          disabled={overlays.length === 0}
          className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-40"
        >
          <Check className="w-3.5 h-3.5" /> Apply Overlay
        </Button>
      </div>
    </div>
  );
};

// ─── SINGLE TEXT NODE ─────────────────────────────────────────────────────────
const RESIZE_HANDLES = [
  { id: "nw", x: 0, y: 0, cursor: "nw-resize" },
  { id: "n", x: 0.5, y: 0, cursor: "n-resize" },
  { id: "ne", x: 1, y: 0, cursor: "ne-resize" },
  { id: "e", x: 1, y: 0.5, cursor: "e-resize" },
  { id: "se", x: 1, y: 1, cursor: "se-resize" },
  { id: "s", x: 0.5, y: 1, cursor: "s-resize" },
  { id: "sw", x: 0, y: 1, cursor: "sw-resize" },
  { id: "w", x: 0, y: 0.5, cursor: "w-resize" },
] as const;

interface TextNodeProps {
  layer: TextLayer;
  selected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onUpdate: (p: Partial<TextLayer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const TextNode: React.FC<TextNodeProps> = ({
  layer,
  selected,
  containerRef,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
}) => {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(layer.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const def = VARIANT_DEFAULTS[layer.variant];
  const fs = layer.fontSize || def.fontSize;
  const fw = layer.bold ? "700" : def.fontWeight;
  const HD = 10;

  const onBodyMouseDown = (e: React.MouseEvent) => {
    if (editing) return;
    e.stopPropagation();
    onSelect();
    const rect = containerRef.current!.getBoundingClientRect();
    const ox = layer.x,
      oy = layer.y,
      sx = e.clientX,
      sy = e.clientY;
    const move = (ev: MouseEvent) => {
      onUpdate({
        x: Math.max(
          2,
          Math.min(98, ox + ((ev.clientX - sx) / rect.width) * 100),
        ),
        y: Math.max(
          2,
          Math.min(98, oy + ((ev.clientY - sy) / rect.height) * 100),
        ),
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onResizeMouseDown = (e: React.MouseEvent, handleId: string) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX,
      startFS = fs;
    const isHoriz = handleId.includes("e") || handleId.includes("w");
    const sign = handleId.includes("e") || handleId.includes("s") ? 1 : -1;
    const startY = e.clientY;
    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) * sign,
        dy = (ev.clientY - startY) * sign;
      const delta = isHoriz ? dx : dy;
      onUpdate({
        fontSize: Math.max(8, Math.min(200, Math.round(startFS + delta * 0.4))),
      });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const node = nodeRef.current;
    if (!node) return;
    const box = node.getBoundingClientRect();
    const cx = box.left + box.width / 2,
      cy = box.top + box.height / 2;
    const startAngle =
      Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    const startRot = layer.rotation;
    const move = (ev: MouseEvent) => {
      const angle =
        Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI);
      onUpdate({ rotation: Math.round(startRot + angle - startAngle) });
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const onDblClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditVal(layer.text);
    setEditing(true);
    setTimeout(() => {
      if (!inputRef.current) return;
      inputRef.current.focus();
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }, 20);
  };
  const commit = () => {
    setEditing(false);
    if (editVal.trim()) onUpdate({ text: editVal });
  };
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };
  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditVal(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const bgHex = layer.bgColor
    ? layer.bgColor +
      Math.round((layer.bgOpacity / 100) * 255)
        .toString(16)
        .padStart(2, "0")
    : "";
  const displayText = layer.noWrap
    ? layer.text.replace(/\n/g, " ")
    : layer.text;

  return (
    <div
      ref={nodeRef}
      onMouseDown={onBodyMouseDown}
      onDoubleClick={onDblClick}
      style={{
        position: "absolute",
        left: `${layer.x}%`,
        top: `${layer.y}%`,
        transform: `translate(-50%,-50%) rotate(${layer.rotation}deg)`,
        cursor: editing ? "text" : "move",
        userSelect: "none",
        zIndex: selected ? 50 : 20,
        opacity: layer.opacity / 100,
        fontFamily: `'${layer.fontFamily}',sans-serif`,
        fontSize: fs,
        fontWeight: fw,
        fontStyle: layer.italic ? "italic" : "normal",
        textDecoration: layer.underline ? "underline" : "none",
        color:
          layer.strokeWidth > 0 && layer.color === "transparent"
            ? "transparent"
            : layer.color,
        textAlign: layer.align,
        letterSpacing: layer.letterSpacing,
        textShadow: layer.shadow
          ? `2px 2px 8px ${layer.shadowColor}99,0 0 24px ${layer.shadowColor}44`
          : "none",
        WebkitTextStroke:
          layer.strokeWidth > 0
            ? `${layer.strokeWidth}px ${layer.strokeColor}`
            : "none",
        whiteSpace: layer.noWrap ? "nowrap" : "pre-wrap",
        maxWidth: layer.noWrap ? "none" : `${layer.maxWidth}%`,
        lineHeight: 1.25,
        padding: selected ? "6px 8px" : "0px",
        boxSizing: "border-box",
      }}
    >
      {selected && !editing && (
        <div
          className="absolute pointer-events-none"
          style={{
            inset: 0,
            border: "1.5px solid #7C3AED",
            borderRadius: 3,
            boxShadow: "0 0 0 1px rgba(124,58,237,0.25)",
          }}
        />
      )}
      {selected && !editing && (
        <div
          className="absolute flex items-center gap-0.5 bg-gray-900/90 backdrop-blur border border-gray-700 rounded-md px-1 py-0.5 shadow-lg"
          style={{
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            zIndex: 60,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 rounded hover:text-cyan-400 text-gray-400 transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded hover:text-red-400 text-gray-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      {selected &&
        !editing &&
        RESIZE_HANDLES.map((h) => (
          <div
            key={h.id}
            onMouseDown={(e) => onResizeMouseDown(e, h.id)}
            style={{
              position: "absolute",
              width: HD,
              height: HD,
              background: "#FFFFFF",
              border: "2px solid #7C3AED",
              borderRadius: "50%",
              cursor: h.cursor,
              zIndex: 70,
              left: `calc(${h.x * 100}% - ${HD / 2}px)`,
              top: `calc(${h.y * 100}% - ${HD / 2}px)`,
              boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
              pointerEvents: "all",
            }}
          />
        ))}
      {selected && !editing && (
        <>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "100%",
              width: 1.5,
              height: 18,
              background: "#7C3AED",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              zIndex: 65,
            }}
          />
          <div
            onMouseDown={onRotateMouseDown}
            title="Rotate"
            style={{
              position: "absolute",
              left: "50%",
              top: "calc(100% + 18px)",
              transform: "translateX(-50%)",
              width: 12,
              height: 12,
              background: "#7C3AED",
              border: "2px solid #fff",
              borderRadius: "50%",
              cursor: "grab",
              zIndex: 70,
              boxShadow: "0 1px 6px rgba(124,58,237,0.7)",
              pointerEvents: "all",
            }}
          />
        </>
      )}
      {editing ? (
        <div className="flex flex-col gap-1">
          <textarea
            ref={inputRef}
            value={editVal}
            onChange={handleEditChange}
            onBlur={commit}
            onKeyDown={handleEditKeyDown}
            style={{
              background: "rgba(0,0,0,0.6)",
              border: "2px solid #7C3AED",
              borderRadius: 4,
              color: layer.color === "transparent" ? "#fff" : layer.color,
              fontFamily: "inherit",
              fontSize: "inherit",
              fontWeight: "inherit",
              fontStyle: "inherit",
              textAlign: layer.align,
              letterSpacing: layer.letterSpacing,
              resize: "none",
              outline: "none",
              minWidth: 140,
              width: "100%",
              overflow: "hidden",
              padding: "6px 10px",
              lineHeight: 1.25,
              display: "block",
              whiteSpace: layer.noWrap ? "nowrap" : "pre-wrap",
            }}
            rows={1}
            className="no-sidebar-swipe"
          />
          <div
            style={{
              fontSize: 10,
              color: "rgba(124,58,237,0.8)",
              textAlign: "center",
              pointerEvents: "none",
              lineHeight: 1,
            }}
          >
            {layer.noWrap
              ? "Single line · Esc = done"
              : "Enter = new line · Shift+Enter or Esc = done"}
          </div>
        </div>
      ) : (
        <span
          style={
            bgHex
              ? { backgroundColor: bgHex, padding: "4px 14px", borderRadius: 6 }
              : {}
          }
        >
          {displayText}
        </span>
      )}
    </div>
  );
};

// ─── TEXT PANEL ───────────────────────────────────────────────────────────────
interface TextPanelProps {
  layers: TextLayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (p?: Partial<TextLayer>) => void;
  onUpdate: (id: string, p: Partial<TextLayer>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
  imageRef: React.RefObject<HTMLImageElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

const TextPanel: React.FC<TextPanelProps> = ({
  layers,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onDuplicate,
  onApply,
  onCancel,
  imageRef,
  containerRef,
}) => {
  const [tab, setTab] = useState<"presets" | "style">("presets");
  const sel = layers.find((l) => l.id === selectedId) ?? null;
  const upd = (p: Partial<TextLayer>) => {
    if (sel) onUpdate(sel.id, p);
  };

  const applyPreset = (preset: StylePreset) => {
    if (sel) {
      upd(preset.patch);
    } else {
      onAdd({ ...preset.patch, text: "Your Text Here" });
    }
    toast.success(`"${preset.name}" style applied`);
    setTab("style");
  };

  const handleApply = () => {
    if (!imageRef.current || !containerRef.current) return;
    const img = imageRef.current,
      container = containerRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const sx = img.naturalWidth / container.clientWidth,
      sy = img.naturalHeight / container.clientHeight;
    layers.forEach((layer) => {
      const def = VARIANT_DEFAULTS[layer.variant];
      const fs = (layer.fontSize || def.fontSize) * sx;
      const fw = layer.bold ? "700" : def.fontWeight;
      const x = (layer.x / 100) * img.naturalWidth,
        y = (layer.y / 100) * img.naturalHeight;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.globalAlpha = layer.opacity / 100;
      ctx.font = `${layer.italic ? "italic " : ""}${fw} ${fs}px '${layer.fontFamily}',sans-serif`;
      ctx.textAlign = layer.align as CanvasTextAlign;
      ctx.textBaseline = "middle";
      (ctx as any).letterSpacing = `${layer.letterSpacing}px`;
      if (layer.shadow) {
        ctx.shadowColor = layer.shadowColor + "99";
        ctx.shadowBlur = 10 * sx;
        ctx.shadowOffsetX = 2 * sx;
        ctx.shadowOffsetY = 2 * sy;
      }
      const lines = layer.noWrap
        ? [layer.text.replace(/\n/g, " ")]
        : layer.text.split("\n");
      const lh = fs * 1.25;
      lines.forEach((line, i) => {
        const ly = (i - (lines.length - 1) / 2) * lh;
        if (layer.bgColor) {
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          const m = ctx.measureText(line),
            pad = 14 * sx,
            bh = fs + 10 * sy;
          const bx =
            layer.align === "center"
              ? -m.width / 2 - pad
              : layer.align === "right"
                ? -m.width - pad
                : -pad;
          ctx.fillStyle =
            layer.bgColor +
            Math.round((layer.bgOpacity / 100) * 255)
              .toString(16)
              .padStart(2, "0");
          ctx.fillRect(bx, ly - bh / 2, m.width + pad * 2, bh);
          if (layer.shadow) {
            ctx.shadowColor = layer.shadowColor + "99";
            ctx.shadowBlur = 10 * sx;
            ctx.shadowOffsetX = 2 * sx;
            ctx.shadowOffsetY = 2 * sy;
          }
        }
        if (layer.strokeWidth > 0) {
          ctx.strokeStyle = layer.strokeColor;
          ctx.lineWidth = layer.strokeWidth * 2 * sx;
          if (layer.color !== "transparent") ctx.fillStyle = layer.color;
          ctx.strokeText(line, 0, ly);
        }
        if (layer.color !== "transparent") {
          ctx.fillStyle = layer.color;
          ctx.fillText(line, 0, ly);
        }
        if (layer.underline) {
          const m = ctx.measureText(line);
          const ux =
            layer.align === "center"
              ? -m.width / 2
              : layer.align === "right"
                ? -m.width
                : 0;
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.fillStyle = layer.color;
          ctx.fillRect(ux, ly + fs * 0.55, m.width, Math.max(1, fs * 0.07));
        }
      });
      ctx.restore();
    });
    onApply(canvas.toDataURL("image/jpeg", 0.95));
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 animate-in fade-in duration-200">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-lg border border-gray-800">
          {(["presets", "style"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${tab === t ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-gray-500 hover:text-gray-300"}`}
            >
              {t === "presets" ? (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Presets
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  Style
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {layers.map((l, i) => (
              <button
                key={l.id}
                onClick={() => onSelect(l.id)}
                className={`w-6 h-6 rounded-full text-[10px] font-bold border-2 transition-all ${selectedId === l.id ? "border-cyan-400 bg-cyan-500/20 text-cyan-400" : "border-gray-600 bg-gray-800 text-gray-500 hover:border-gray-400"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              onAdd();
              setTab("style");
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/25 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Add Text
          </button>
          {sel && (
            <button
              onClick={() => onDelete(sel.id)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-all"
              title="Delete selected"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {tab === "presets" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-52 overflow-y-auto pr-1">
          {STYLE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="flex flex-col items-stretch rounded-xl overflow-hidden border border-gray-700/60 hover:border-cyan-500/50 transition-all group shadow-md hover:shadow-cyan-500/10 hover:scale-[1.03]"
            >
              <div
                className={`${preset.thumb} h-14 flex items-center justify-center px-2`}
              >
                <span
                  style={{
                    fontFamily: `'${preset.patch.fontFamily ?? "Inter"}'`,
                    fontWeight: preset.patch.bold ? "700" : "600",
                    color:
                      preset.patch.color === "transparent"
                        ? "rgba(255,255,255,0.9)"
                        : (preset.patch.color ?? "#fff"),
                    fontSize: 13,
                    letterSpacing: preset.patch.letterSpacing ?? 0,
                    WebkitTextStroke:
                      (preset.patch.strokeWidth ?? 0) > 0
                        ? `${preset.patch.strokeWidth}px ${preset.patch.strokeColor ?? "#fff"}`
                        : "none",
                    textShadow: preset.patch.shadow
                      ? `1px 1px 4px ${preset.patch.shadowColor ?? "#000"}88`
                      : "none",
                    background: preset.patch.bgColor
                      ? `${preset.patch.bgColor}cc`
                      : "",
                    padding: preset.patch.bgColor ? "2px 8px" : "",
                    borderRadius: preset.patch.bgColor ? 4 : 0,
                  }}
                  className="truncate max-w-full"
                >
                  Aa
                </span>
              </div>
              <div className="bg-gray-900 px-2 py-1.5 text-center">
                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300 transition-colors leading-none">
                  {preset.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
      {tab === "style" && (
        <div className="flex flex-col gap-3">
          {!sel ? (
            <div className="text-center py-6 text-gray-600 text-xs">
              Select a text on the image or click{" "}
              <strong className="text-gray-500">Add Text</strong> to start.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <textarea
                  value={sel.text}
                  onChange={(e) => {
                    upd({ text: e.target.value });
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  placeholder={
                    sel.noWrap
                      ? "Your text… (single line mode)"
                      : "Your text… (Enter = new line)"
                  }
                  rows={2}
                  className="w-full bg-gray-800/80 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 px-3 py-2 resize-none focus:outline-none focus:border-cyan-500/60 no-sidebar-swipe overflow-hidden"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  {(["h1", "h2", "p"] as TextVariant[]).map((v) => (
                    <button
                      key={v}
                      onClick={() => upd({ variant: v })}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all ${sel.variant === v ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <select
                  value={sel.fontFamily}
                  onChange={(e) =>
                    upd({ fontFamily: e.target.value as FontFamily })
                  }
                  className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 px-2 py-1.5 focus:outline-none focus:border-cyan-500/50 max-w-[140px]"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  {(
                    [
                      ["bold", <Bold className="w-3 h-3" />],
                      ["italic", <Italic className="w-3 h-3" />],
                      ["underline", <Underline className="w-3 h-3" />],
                    ] as [keyof TextLayer, React.ReactNode][]
                  ).map(([k, icon]) => (
                    <button
                      key={k}
                      onClick={() => upd({ [k]: !sel[k] })}
                      className={`px-2 py-1 rounded-md transition-all ${sel[k] ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <div className="flex bg-gray-800 rounded-lg p-0.5">
                  {(
                    [
                      ["left", <AlignLeft className="w-3 h-3" />],
                      ["center", <AlignCenter className="w-3 h-3" />],
                      ["right", <AlignRight className="w-3 h-3" />],
                    ] as [TextAlign, React.ReactNode][]
                  ).map(([a, icon]) => (
                    <button
                      key={a}
                      onClick={() => upd({ align: a })}
                      className={`px-2 py-1 rounded-md transition-all ${sel.align === a ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  {
                    label: "Font Size",
                    val: sel.fontSize || VARIANT_DEFAULTS[sel.variant].fontSize,
                    min: 8,
                    max: 140,
                    step: 1,
                    key: "fontSize",
                  },
                  {
                    label: "Opacity",
                    val: sel.opacity,
                    min: 10,
                    max: 100,
                    step: 1,
                    key: "opacity",
                  },
                  {
                    label: "Rotation",
                    val: sel.rotation,
                    min: -180,
                    max: 180,
                    step: 1,
                    key: "rotation",
                  },
                  {
                    label: "Letter Spacing",
                    val: sel.letterSpacing,
                    min: -5,
                    max: 20,
                    step: 0.5,
                    key: "letterSpacing",
                  },
                  {
                    label: "BG Opacity",
                    val: sel.bgOpacity,
                    min: 0,
                    max: 100,
                    step: 1,
                    key: "bgOpacity",
                  },
                  {
                    label: "Stroke Width",
                    val: sel.strokeWidth,
                    min: 0,
                    max: 8,
                    step: 0.5,
                    key: "strokeWidth",
                  },
                ].map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500 w-24 shrink-0">
                      {s.label}
                    </span>
                    <Slider
                      value={[s.val]}
                      onValueChange={([v]) => upd({ [s.key]: v })}
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      className="no-sidebar-swipe flex-1"
                    />
                    <span className="text-[10px] font-mono text-cyan-400/80 w-7 text-right shrink-0">
                      {Math.round(s.val)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { label: "Text", key: "color" },
                    { label: "BG", key: "bgColor" },
                    { label: "Stroke", key: "strokeColor" },
                  ] as { label: string; key: keyof TextLayer }[]
                ).map(({ label, key }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                      {label}
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {key === "bgColor" && (
                        <button
                          onClick={() => upd({ bgColor: "" })}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${!sel.bgColor ? "border-cyan-400" : "border-gray-600"}`}
                        >
                          <X className="w-2.5 h-2.5 text-gray-500" />
                        </button>
                      )}
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => upd({ [key]: c })}
                          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-transform hover:scale-110 ${(sel[key] as string) === c ? "border-cyan-400 scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={(sel[key] as string) || "#000000"}
                        onChange={(e) => upd({ [key]: e.target.value })}
                        className="w-4 h-4 rounded-full cursor-pointer border-0 bg-transparent p-0 flex-shrink-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-500 w-12">Shadow</span>
                <button
                  onClick={() => upd({ shadow: !sel.shadow })}
                  className={`px-3 py-1 rounded-md text-xs font-semibold border transition-all ${sel.shadow ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-gray-800 text-gray-500 border-gray-700"}`}
                >
                  {sel.shadow ? "On" : "Off"}
                </button>
                {sel.shadow && (
                  <div className="flex items-center gap-1.5">
                    {[
                      "#000000",
                      "#FFFFFF",
                      "#06B6D4",
                      "#EC4899",
                      "#F59E0B",
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => upd({ shadowColor: c })}
                        className={`w-4 h-4 rounded-full border-2 ${sel.shadowColor === c ? "border-cyan-400" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <div className="flex items-center gap-2">
          {sel && (
            <button
              onClick={() => onDuplicate(sel.id)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-9 px-4 rounded-full text-gray-400 hover:text-white border border-gray-700 text-xs gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={layers.length === 0}
            className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" /> Apply Text
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── ADJUST / FILTER PANEL ────────────────────────────────────────────────────
interface AdjustFilterPanelProps {
  imageSrc: string;
  onApply: (d: string) => void;
  onCancel: () => void;
}
const AdjustFilterPanel: React.FC<AdjustFilterPanelProps> = ({
  imageSrc,
  onApply,
  onCancel,
}) => {
  const [tab, setTab] = useState<"adjust" | "filter">("adjust");
  const [adj, setAdj] = useState<Adjustments>({ ...DEFAULT_ADJUSTMENTS });
  const [activeFilter, setActiveFilter] = useState("None");
  const imgRef = useRef<HTMLImageElement>(null);
  const cssFilter = buildCssFilter(adj);
  const isDefault = JSON.stringify(adj) === JSON.stringify(DEFAULT_ADJUSTMENTS);
  return (
    <div className="flex flex-col gap-3 w-full animate-in fade-in duration-200">
      <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-lg w-fit mx-auto border border-gray-800">
        {(["adjust", "filter"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t === "adjust" ? (
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3 h-3" />
                Adjust
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Filters
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        className="relative w-full bg-black/60 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center"
        style={{ maxHeight: "42vh" }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)",
            backgroundSize: "20px 20px",
          }}
        />
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Preview"
          crossOrigin="anonymous"
          className="relative z-10 max-h-[42vh] max-w-full w-auto object-contain select-none"
          draggable={false}
          style={{ filter: cssFilter, transition: "filter 0.12s ease" }}
        />
        {activeFilter !== "None" && (
          <div className="absolute top-3 left-3 z-20 bg-black/70 text-cyan-400 text-[10px] font-semibold px-2 py-1 rounded-md border border-cyan-500/30 pointer-events-none">
            {activeFilter}
          </div>
        )}
      </div>
      {tab === "adjust" && (
        <div className="flex flex-col gap-2.5 max-h-[26vh] overflow-y-auto pr-1">
          {ADJUST_SLIDERS.map((s) => {
            const val = adj[s.key as keyof Adjustments] as number;
            return (
              <div key={s.key} className="flex items-center gap-3 group">
                <span className="text-[11px] text-gray-500 w-24 shrink-0 group-hover:text-gray-300 transition-colors">
                  {s.label}
                </span>
                <div className="flex-1">
                  <Slider
                    value={[val]}
                    onValueChange={([v]) => {
                      setAdj((a) => ({ ...a, [s.key]: v }));
                      setActiveFilter("None");
                    }}
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    className="no-sidebar-swipe"
                  />
                </div>
                <span className="text-[11px] font-mono text-cyan-400/80 w-10 text-right shrink-0">
                  {val}
                  {s.unit}
                </span>
                {val !== s.default && (
                  <button
                    onClick={() =>
                      setAdj((a) => ({ ...a, [s.key]: s.default }))
                    }
                    className="text-gray-600 hover:text-gray-400 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tab === "filter" && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[26vh] overflow-y-auto pr-1">
          {FILTER_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                setActiveFilter(preset.name);
                setAdj({ ...DEFAULT_ADJUSTMENTS, ...preset.adjustments });
              }}
              className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all ${activeFilter === preset.name ? "bg-cyan-500/15 border border-cyan-500/50" : "border border-transparent hover:border-gray-700 hover:bg-gray-800/50"}`}
            >
              <div className="w-full aspect-square rounded-md overflow-hidden border border-gray-700/50 bg-black">
                <img
                  src={imageSrc}
                  alt={preset.name}
                  className="w-full h-full object-cover"
                  style={{ filter: preset.preview }}
                  draggable={false}
                />
              </div>
              <span
                className={`text-[10px] font-medium leading-none ${activeFilter === preset.name ? "text-cyan-400" : "text-gray-500"}`}
              >
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => {
            setAdj({ ...DEFAULT_ADJUSTMENTS });
            setActiveFilter("None");
          }}
          disabled={isDefault}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 disabled:opacity-30 transition-all"
        >
          <RotateCcw className="w-3 h-3" /> Reset all
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-9 px-4 rounded-full text-gray-400 hover:text-white border border-gray-700 text-xs gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (imgRef.current)
                onApply(applyAdjustmentsToCanvas(imgRef.current, adj));
            }}
            className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg shadow-cyan-500/20"
          >
            <Check className="w-3.5 h-3.5" /> Apply
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── IMAGE CROPPER ────────────────────────────────────────────────────────────
interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (d: string) => void;
  onCancel: () => void;
}
const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const cropBoxRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({
    w: 0,
    h: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("free");
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const dragState = useRef<{
    type: "move" | "resize";
    handle?: string;
    startX: number;
    startY: number;
    startCrop: CropBox;
  } | null>(null);

  const initCropBox = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const ir = imgRef.current.getBoundingClientRect(),
      cr = containerRef.current.getBoundingClientRect();
    const ox = ir.left - cr.left,
      oy = ir.top - cr.top;
    setImgDimensions({ w: ir.width, h: ir.height, offsetX: ox, offsetY: oy });
    const p = 20;
    setCropBox({
      x: ox + p,
      y: oy + p,
      width: ir.width - p * 2,
      height: ir.height - p * 2,
    });
    setImgLoaded(true);
  }, []);

  useEffect(() => {
    if (!imgLoaded) return;
    const ratio = getAspectRatioValue(aspectRatio);
    if (ratio === null) return;
    setCropBox((prev) => {
      const ch = Math.min(
        prev.width / ratio,
        imgDimensions.h - (prev.y - imgDimensions.offsetY),
      );
      return { ...prev, height: ch, width: ch * ratio };
    });
  }, [aspectRatio]);

  const clamp = (box: CropBox, d: typeof imgDimensions): CropBox => {
    const x = Math.max(d.offsetX, Math.min(box.x, d.offsetX + d.w - box.width)),
      y = Math.max(d.offsetY, Math.min(box.y, d.offsetY + d.h - box.height));
    return {
      x,
      y,
      width: Math.max(30, Math.min(box.width, d.offsetX + d.w - x)),
      height: Math.max(30, Math.min(box.height, d.offsetY + d.h - y)),
    };
  };
  const handleMouseDown = (
    e: React.MouseEvent,
    type: "move" | "resize",
    handle?: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox },
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX,
        dy = ev.clientY - dragState.current.startY,
        s = dragState.current.startCrop;
      if (dragState.current.type === "move") {
        setCropBox((p) =>
          clamp({ ...p, x: s.x + dx, y: s.y + dy }, imgDimensions),
        );
        return;
      }
      const h = dragState.current.handle!;
      let { x, y, width, height } = s;
      const ratio = getAspectRatioValue(aspectRatio);
      if (h.includes("e")) width = Math.max(30, s.width + dx);
      if (h.includes("s")) height = Math.max(30, s.height + dy);
      if (h.includes("w")) {
        x = s.x + dx;
        width = Math.max(30, s.width - dx);
      }
      if (h.includes("n")) {
        y = s.y + dy;
        height = Math.max(30, s.height - dy);
      }
      if (ratio !== null) {
        if (h.includes("e") || h.includes("w")) height = width / ratio;
        else width = height * ratio;
      }
      setCropBox(clamp({ x, y, width, height }, imgDimensions));
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  const applyCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current,
      sx = img.naturalWidth / img.clientWidth,
      sy = img.naturalHeight / img.clientHeight;
    const cx = (cropBox.x - imgDimensions.offsetX) * sx,
      cy = (cropBox.y - imgDimensions.offsetY) * sy,
      cw = cropBox.width * sx,
      ch = cropBox.height * sy;
    const rad = (rotation * Math.PI) / 180,
      ac = Math.abs(Math.cos(rad)),
      as = Math.abs(Math.sin(rad));
    const nw = img.naturalWidth,
      nh = img.naturalHeight;
    const tmp = document.createElement("canvas");
    tmp.width = Math.round(nw * ac + nh * as);
    tmp.height = Math.round(nw * as + nh * ac);
    const tCtx = tmp.getContext("2d")!;
    tCtx.translate(tmp.width / 2, tmp.height / 2);
    tCtx.rotate(rad);
    tCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    tCtx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cw);
    canvas.height = Math.round(ch);
    canvas
      .getContext("2d")!
      .drawImage(
        tmp,
        cx + (tmp.width - nw) / 2,
        cy + (tmp.height - nh) / 2,
        cw,
        ch,
        0,
        0,
        cw,
        ch,
      );
    onCropComplete(canvas.toDataURL("image/jpeg", 0.95));
  };
  const handles = [
    { id: "nw", cursor: "cursor-nw-resize", style: { top: -5, left: -5 } },
    {
      id: "n",
      cursor: "cursor-n-resize",
      style: { top: -5, left: "50%", transform: "translateX(-50%)" },
    },
    { id: "ne", cursor: "cursor-ne-resize", style: { top: -5, right: -5 } },
    {
      id: "e",
      cursor: "cursor-e-resize",
      style: { top: "50%", right: -5, transform: "translateY(-50%)" },
    },
    { id: "se", cursor: "cursor-se-resize", style: { bottom: -5, right: -5 } },
    {
      id: "s",
      cursor: "cursor-s-resize",
      style: { bottom: -5, left: "50%", transform: "translateX(-50%)" },
    },
    { id: "sw", cursor: "cursor-sw-resize", style: { bottom: -5, left: -5 } },
    {
      id: "w",
      cursor: "cursor-w-resize",
      style: { top: "50%", left: -5, transform: "translateY(-50%)" },
    },
  ];
  return (
    <div className="flex flex-col gap-3 w-full animate-in fade-in duration-200">
      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <div className="flex items-center gap-1">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.value}
              onClick={() => setAspectRatio(ar.value)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${aspectRatio === ar.value ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-gray-500 hover:text-gray-300 border border-transparent hover:border-gray-700"}`}
            >
              {ar.icon}
              <span>{ar.label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {[
            {
              icon: <RotateCcw className="w-3.5 h-3.5" />,
              action: () => setRotation((r) => r - 90),
              active: false,
            },
            {
              icon: <RotateCw className="w-3.5 h-3.5" />,
              action: () => setRotation((r) => r + 90),
              active: false,
            },
            {
              icon: <FlipHorizontal className="w-3.5 h-3.5" />,
              action: () => setFlipH((f) => !f),
              active: flipH,
            },
            {
              icon: <FlipVertical className="w-3.5 h-3.5" />,
              action: () => setFlipV((f) => !f),
              active: flipV,
            },
          ].map((btn, i) => (
            <button
              key={i}
              onClick={btn.action}
              className={`p-1.5 rounded-md transition-all ${btn.active ? "text-cyan-400 bg-cyan-500/10" : "text-gray-400 hover:text-cyan-400 hover:bg-gray-800"}`}
            >
              {btn.icon}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={containerRef}
        className="relative w-full bg-black/60 rounded-xl overflow-hidden border border-gray-800 flex items-center justify-center"
        style={{ minHeight: 280, maxHeight: "50vh" }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#374151 0% 25%, #1f2937 0% 50%)",
            backgroundSize: "20px 20px",
          }}
        />
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop"
          crossOrigin="anonymous"
          onLoad={initCropBox}
          className="relative z-10 max-h-[50vh] max-w-full w-auto object-contain select-none"
          draggable={false}
          style={{
            transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
            transition: "transform 0.2s ease",
          }}
        />
        {imgLoaded && (
          <>
            <div
              className="absolute z-20 pointer-events-none"
              style={{
                left: cropBox.x,
                top: cropBox.y,
                width: cropBox.width,
                height: cropBox.height,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
              }}
            />
            <div
              ref={cropBoxRef}
              className="absolute z-30 border-2 border-cyan-400"
              style={{
                left: cropBox.x,
                top: cropBox.y,
                width: cropBox.width,
                height: cropBox.height,
                cursor: "move",
              }}
              onMouseDown={(e) => handleMouseDown(e, "move")}
            >
              <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400/60" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-cyan-400/60" />
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400/60" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cyan-400/60" />
              </div>
              {[
                "top-0 left-0",
                "top-0 right-0",
                "bottom-0 left-0",
                "bottom-0 right-0",
              ].map((pos, i) => (
                <div
                  key={i}
                  className={`absolute w-4 h-4 border-cyan-400 ${pos} ${pos.includes("right") ? "border-r-2" : "border-l-2"} ${pos.includes("bottom") ? "border-b-2" : "border-t-2"}`}
                />
              ))}
              {handles.map((h) => (
                <div
                  key={h.id}
                  className={`absolute w-3 h-3 bg-cyan-400 rounded-sm shadow-lg ${h.cursor} hover:bg-white transition-colors`}
                  style={h.style as React.CSSProperties}
                  onMouseDown={(e) => handleMouseDown(e, "resize", h.id)}
                />
              ))}
            </div>
            <div className="absolute bottom-3 left-3 z-40 bg-black/70 text-cyan-400 text-[10px] font-mono px-2 py-1 rounded-md border border-cyan-500/30 pointer-events-none">
              {Math.round(cropBox.width)} × {Math.round(cropBox.height)}
            </div>
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-9 px-4 rounded-full text-gray-400 hover:text-white border border-gray-700 text-xs gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </Button>
        <Button
          size="sm"
          onClick={applyCrop}
          disabled={!imgLoaded}
          className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" /> Apply Crop
        </Button>
      </div>
    </div>
  );
};

// ─── COMPARE SLIDER ───────────────────────────────────────────────────────────
const CompareSlider: React.FC<{ original: string; enhanced: string }> = ({
  original,
  enhanced,
}) => {
  const [pos, setPos] = useState(50);
  const [cw, setCw] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCw(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    setPos(Math.min(100, Math.max(0, ((clientX - left) / width) * 100)));
  };
  return (
    <div
      ref={containerRef}
      className="relative inline-block w-auto h-auto select-none cursor-col-resize rounded-xl overflow-hidden border border-gray-700 shadow-2xl bg-gray-900"
      onMouseMove={handleMove}
      onTouchMove={handleMove}
    >
      <img
        src={original}
        alt=""
        className="block max-h-[60vh] w-auto opacity-0 pointer-events-none"
      />
      <div className="absolute inset-0">
        <img
          src={enhanced}
          alt="Upscaled"
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>
      <div
        className="absolute inset-0 overflow-hidden border-r-2 border-white/60 z-10"
        style={{ width: `${pos}%` }}
      >
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: cw ? `${cw}px` : "100%" }}
        >
          <img
            src={original}
            alt="Original"
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
      </div>
      <div
        className="absolute top-0 bottom-0 w-1 bg-white/80 shadow-lg flex items-center justify-center z-20"
        style={{ left: `${pos}%` }}
      >
        <div className="bg-white rounded-full p-1.5 shadow border border-gray-300">
          <svg
            className="w-4 h-4 text-black"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 9l-3 3 3 3M16 9l3 3-3 3"
            />
          </svg>
        </div>
      </div>
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded z-30 pointer-events-none uppercase tracking-wider border border-white/10">
        Original
      </div>
      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded z-30 pointer-events-none uppercase tracking-wider border border-white/10">
        Upscaled
      </div>
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
type ActiveMode =
  | "none"
  | "crop"
  | "adjust"
  | "inpaint"
  | "text"
  | "bgremove"
  | "eraser"
  | "upscale"
  | "skin"
  | "overlay";

const ImageEditingPage = () => {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [prompt, setPrompt] = useState("");

  const [originalImagePreview, setOriginalImagePreview] = useState<
    string | null
  >(null);
  const [currentImagePreview, setCurrentImagePreview] = useState<string | null>(
    null,
  );
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [referenceImageFile, setReferenceImageFile] = useState<File | null>(
    null,
  );
  const [referencePreview, setReferencePreview] = useState<string | null>(null);

  const [activeMode, setActiveMode] = useState<ActiveMode>("none");
  const [drawingTool, setDrawingTool] = useState<"brush" | "eraser">("brush");
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnMask, setHasDrawnMask] = useState(false);

  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const textContainerRef = useRef<HTMLDivElement | null>(null);

  // ── OVERLAY state ────────────────────────────────────────────────────────
  const [overlays, setOverlays] = useState<OverlayImage[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(
    null,
  );
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);

  const addOverlay = (src: string) => {
    const ov = makeOverlay(src);
    setOverlays((prev) => [...prev, ov]);
    setSelectedOverlayId(ov.id);
  };
  const updateOverlay = (id: string, p: Partial<OverlayImage>) =>
    setOverlays((prev) => prev.map((o) => (o.id === id ? { ...o, ...p } : o)));
  const deleteOverlay = (id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    setSelectedOverlayId(null);
  };

  const handleOverlayApply = () => {
    if (!overlayContainerRef.current || !imageRef.current) return;
    const base = imageRef.current;
    const container = overlayContainerRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = base.naturalWidth;
    canvas.height = base.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(base, 0, 0);

    // We need to load each overlay image synchronously-ish
    let pending = overlays.filter((o) => o !== null).length;
    if (pending === 0) {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCurrentImagePreview(dataUrl);
      fetch(dataUrl)
        .then((r) => r.blob())
        .then((blob) =>
          setMainImageFile(
            new File([blob], "overlay.jpg", { type: "image/jpeg" }),
          ),
        );
      setOverlays([]);
      setSelectedOverlayId(null);
      setActiveMode("none");
      toast.success("Overlay applied!");
      return;
    }

    overlays.forEach((ov) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const lx = (ov.x / 100) * canvas.width;
        const ly = (ov.y / 100) * canvas.height;
        const lw = (ov.width / 100) * canvas.width;
        const lh = (ov.height / 100) * canvas.height;
        ctx.save();
        ctx.globalAlpha = ov.opacity / 100;
        ctx.translate(lx + lw / 2, ly + lh / 2);
        ctx.rotate((ov.rotation * Math.PI) / 180);
        ctx.drawImage(img, -lw / 2, -lh / 2, lw, lh);
        ctx.restore();
        pending--;
        if (pending === 0) {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          setCurrentImagePreview(dataUrl);
          fetch(dataUrl)
            .then((r) => r.blob())
            .then((blob) =>
              setMainImageFile(
                new File([blob], "overlay.jpg", { type: "image/jpeg" }),
              ),
            );
          setOverlays([]);
          setSelectedOverlayId(null);
          setActiveMode("none");
          toast.success("Overlay applied!");
        }
      };
      img.src = ov.src;
    });
  };

  const [activeJobs, setActiveJobs] = useState<GenerationJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // BG REMOVER
  const [bgModel, setBgModel] = useState<"briaai/RMBG-1.4" | "Xenova/modnet">(
    "briaai/RMBG-1.4",
  );
  const [bgTool, setBgTool] = useState<"none" | "erase" | "restore">("none");
  const [bgBrushSize, setBgBrushSize] = useState(30);
  const [bgIsDrawing, setBgIsDrawing] = useState(false);
  const [bgHistory, setBgHistory] = useState<ImageData[]>([]);
  const [bgZoom, setBgZoom] = useState(1);
  const [bgDimensions, setBgDimensions] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [bgProcessing, setBgProcessing] = useState(false);
  const [bgProgressText, setBgProgressText] = useState("Processing...");
  const [bgCompleted, setBgCompleted] = useState(false);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const bgContainerRef = useRef<HTMLDivElement>(null);
  const bgOrigImgRef = useRef<HTMLImageElement | null>(null);
  const bgLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const bgWorkerRef = useRef<Worker | null>(null);
  const bgProgressRef = useRef("Initializing...");

  // MAGIC ERASER
  const [meReady, setMeReady] = useState(false);
  const [meBrushSize, setMeBrushSize] = useState(30);
  const [meIsDragging, setMeIsDragging] = useState(false);
  const [meIsProcessing, setMeIsProcessing] = useState(false);
  const [meHistory, setMeHistory] = useState<ImageData[]>([]);
  const [meZoom, setMeZoom] = useState(1);
  const [meDimensions, setMeDimensions] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [mePreviewUrl, setMePreviewUrl] = useState<string | null>(null);
  const meCanvasRef = useRef<HTMLCanvasElement>(null);
  const meContainerRef = useRef<HTMLDivElement>(null);
  const meOrigImgRef = useRef<HTMLImageElement | null>(null);
  const meLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const meWorkerRef = useRef<Worker | null>(null);

  // UPSCALER
  const [upscaleLevel, setUpscaleLevel] = useState<"2k" | "4k">("2k");
  const [upscaleLoading, setUpscaleLoading] = useState(false);
  const [upscaleResult, setUpscaleResult] = useState<string | null>(null);
  const upscaleCost = upscaleLevel === "4k" ? 20 : 10;

  // AI TOOLS DROPDOWN
  const [aiToolsOpen, setAiToolsOpen] = useState(false);
  const aiToolsRef = useRef<HTMLDivElement>(null);

  // SKIN ENHANCER
  const [skinStrength, setSkinStrength] = useState(0.35);
  const [skinFeatures, setSkinFeatures] = useState({
    freckles: false,
    acne: false,
    peachFuzz: true,
    lensFlare: false,
  });
  const [skinLoading, setSkinLoading] = useState(false);
  const [skinResult, setSkinResult] = useState<string | null>(null);
  const toggleSkinFeature = (key: keyof typeof skinFeatures) =>
    setSkinFeatures((prev) => ({ ...prev, [key]: !prev[key] }));

  const mainInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close AI tools dropdown on outside click
  useEffect(() => {
    if (!aiToolsOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        aiToolsRef.current &&
        !aiToolsRef.current.contains(e.target as Node)
      ) {
        setAiToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aiToolsOpen]);

  const isInpaintMode = activeMode === "inpaint";

  useEffect(() => {
    if (
      !isInpaintMode ||
      !canvasRef.current ||
      !imageRef.current ||
      !currentImagePreview
    )
      return;
    const canvas = canvasRef.current,
      img = imageRef.current;
    setTimeout(() => {
      if (!img.clientWidth || !img.clientHeight) return;
      if (
        canvas.width !== img.clientWidth ||
        canvas.height !== img.clientHeight
      ) {
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = brushSize;
        ctxRef.current = ctx;
      }
    }, 50);
  }, [isInpaintMode, currentImagePreview]);

  useEffect(() => {
    if (!ctxRef.current) return;
    ctxRef.current.lineWidth = brushSize;
    ctxRef.current.globalCompositeOperation =
      drawingTool === "eraser" ? "destination-out" : "source-over";
    if (drawingTool === "brush")
      ctxRef.current.strokeStyle = "rgba(255,255,255,0.8)";
  }, [drawingTool, brushSize, isInpaintMode]);

  const getCoords = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const cX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { offsetX: cX - rect.left, offsetY: cY - rect.top };
  };
  const startDrawing = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!ctxRef.current) return;
    setIsDrawing(true);
    setHasDrawnMask(true);
    const { offsetX, offsetY } = getCoords(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
  };
  const draw = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (!isDrawing || !ctxRef.current) return;
    const { offsetX, offsetY } = getCoords(e);
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();
  };
  const stopDrawing = () => {
    ctxRef.current?.closePath();
    setIsDrawing(false);
  };
  const clearMask = () => {
    if (canvasRef.current && ctxRef.current) {
      ctxRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height,
      );
      setHasDrawnMask(false);
    }
  };
  const getMaskBlob = async (): Promise<Blob | null> => {
    if (!canvasRef.current || !imageRef.current || !hasDrawnMask) return null;
    const tmp = document.createElement("canvas");
    const nw = imageRef.current.naturalWidth,
      nh = imageRef.current.naturalHeight;
    tmp.width = nw;
    tmp.height = nh;
    const tCtx = tmp.getContext("2d");
    if (!tCtx) return null;
    tCtx.drawImage(canvasRef.current, 0, 0, nw, nh);
    tCtx.globalCompositeOperation = "source-in";
    tCtx.fillStyle = "#FFF";
    tCtx.fillRect(0, 0, nw, nh);
    tCtx.globalCompositeOperation = "destination-over";
    tCtx.fillStyle = "#000";
    tCtx.fillRect(0, 0, nw, nh);
    return new Promise((resolve) => tmp.toBlob(resolve, "image/png"));
  };

  const switchMode = (mode: ActiveMode) => {
    setActiveMode((prev) => (prev === mode ? "none" : mode));
    if (mode !== "inpaint") setHasDrawnMask(false);
    if (mode !== "text") setSelectedTextId(null);
    if (mode !== "overlay") setSelectedOverlayId(null);
    if (!["bgremove", "eraser", "upscale", "skin"].includes(mode))
      setAiToolsOpen(false);
  };

  const addTextLayer = (partial?: Partial<TextLayer>) => {
    const layer = makeLayer(partial);
    setTextLayers((prev) => [...prev, layer]);
    setSelectedTextId(layer.id);
  };
  const updateTextLayer = (id: string, patch: Partial<TextLayer>) =>
    setTextLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  const deleteTextLayer = (id: string) => {
    setTextLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedTextId(null);
  };
  const duplicateTextLayer = (id: string) => {
    const layer = textLayers.find((l) => l.id === id);
    if (!layer) return;
    const nl = makeLayer({ ...layer, x: layer.x + 3, y: layer.y + 3 });
    setTextLayers((prev) => [...prev, nl]);
    setSelectedTextId(nl.id);
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max file size 10MB");
    setMainImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const r = reader.result as string;
      setOriginalImagePreview(r);
      setCurrentImagePreview(r);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
    setActiveMode("none");
    setHasDrawnMask(false);
    setActiveJobs([]);
    setTextLayers([]);
    setOverlays([]);
  };
  const handleReferenceImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max file size 10MB");
    setReferenceImageFile(file);
    setReferencePreview(URL.createObjectURL(file));
    e.target.value = "";
  };
  const removeReferenceImage = () => {
    if (referencePreview) URL.revokeObjectURL(referencePreview);
    setReferencePreview(null);
    setReferenceImageFile(null);
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentImagePreview !== originalImagePreview) {
      setCurrentImagePreview(originalImagePreview);
      setActiveMode("none");
      setHasDrawnMask(false);
      setActiveJobs([]);
      setTextLayers([]);
      setOverlays([]);
      toast.info("Reverted to original image");
      return;
    }
    setMainImageFile(null);
    setOriginalImagePreview(null);
    setCurrentImagePreview(null);
    setActiveMode("none");
    setHasDrawnMask(false);
    setActiveJobs([]);
    removeReferenceImage();
    setTextLayers([]);
    setOverlays([]);
    if (mainInputRef.current) mainInputRef.current.value = "";
  };

  const handleCropComplete = (dataUrl: string) => {
    setCurrentImagePreview(dataUrl);
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) =>
        setMainImageFile(
          new File([blob], "cropped.jpg", { type: "image/jpeg" }),
        ),
      );
    setActiveMode("none");
    toast.success("Crop applied!");
  };
  const handleAdjustApply = (dataUrl: string) => {
    setCurrentImagePreview(dataUrl);
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) =>
        setMainImageFile(
          new File([blob], "adjusted.jpg", { type: "image/jpeg" }),
        ),
      );
    setActiveMode("none");
    toast.success("Adjustments applied!");
  };

  const handleGenerate = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!currentImagePreview) return toast.error("No image to edit.");
    if (isInpaintMode && !hasDrawnMask)
      return toast.error("Please paint the area to change.");
    if (!prompt) return toast.error("Please enter a prompt.");
    setIsLoading(true);
    toast.info("Generating... (Cost: 10 Coins)");
    try {
      let maskBlob: Blob | null = null;
      if (isInpaintMode && hasDrawnMask) {
        maskBlob = await getMaskBlob();
        if (!maskBlob) throw new Error("Failed to capture mask.");
      }
      setActiveJobs([
        { id: `job-${Date.now()}`, status: "processing", urls: [] },
      ]);
      let mainUrl = "";
      if (currentImagePreview.startsWith("data:")) {
        if (mainImageFile) mainUrl = await fal.storage.upload(mainImageFile);
        else {
          const res = await fetch(currentImagePreview);
          mainUrl = await fal.storage.upload(await res.blob());
        }
      } else {
        const response = await fetch(currentImagePreview);
        mainUrl = await fal.storage.upload(await response.blob());
      }
      const maskUrl = maskBlob ? await fal.storage.upload(maskBlob) : null;
      const referenceUrl = referenceImageFile
        ? await fal.storage.upload(referenceImageFile)
        : null;
      const response = await fetch("/api/fal/inpainting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            prompt,
            image_url: mainUrl,
            mask_url: maskUrl,
            reference_image_url: referenceUrl,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(
          response.status === 402
            ? "Insufficient coins!"
            : data.error || "Generation failed",
        );
        throw new Error(data.error);
      }
      setCurrentImagePreview(data.imageUrl);
      setActiveJobs([]);
      setActiveMode("none");
      setHasDrawnMask(false);
      setPrompt("");
      removeReferenceImage();
      toast.success("Generation Complete!");
    } catch (err: any) {
      console.error(err);
      setActiveJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!currentImagePreview) return;
    try {
      const blob = await (await fetch(currentImagePreview)).blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `edit-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed");
    }
  };

  // BG REMOVER worker
  useEffect(() => {
    if (activeMode !== "bgremove") return;
    if (bgWorkerRef.current) return;
    bgWorkerRef.current = new Worker(
      new URL("../bg-remover/bg-remover.worker.ts", import.meta.url),
      { type: "module" },
    );
    bgWorkerRef.current.onmessage = (event) => {
      const { status, blob, error, percent, key } = event.data;
      if (status === "progress") {
        bgProgressRef.current = `${key || "Processing..."} ${percent ?? ""}%`;
        setBgProgressText(bgProgressRef.current);
      } else if (status === "success") {
        const url = URL.createObjectURL(blob);
        setBgProcessing(false);
        setBgCompleted(true);
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = bgCanvasRef.current;
          if (!canvas) return;
          canvas.width = img.width;
          canvas.height = img.height;
          setBgDimensions({ w: img.width, h: img.height });
          if (bgContainerRef.current) {
            const cw = bgContainerRef.current.clientWidth - 40,
              ch = bgContainerRef.current.clientHeight - 40;
            setBgZoom(Math.min(cw / img.width, ch / img.height, 1));
          }
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          setBgHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
          const orig = new Image();
          orig.src = url;
          bgOrigImgRef.current = orig;
        };
        toast.success("Background removed!");
      } else if (status === "error") {
        console.error(error);
        setBgProcessing(false);
        toast.error("BG removal failed.");
      }
    };
    return () => {
      bgWorkerRef.current?.terminate();
      bgWorkerRef.current = null;
    };
  }, [activeMode]);

  const handleBgRemove = () => {
    if (!mainImageFile) return toast.error("No image loaded.");
    if (!bgWorkerRef.current)
      return toast.error("Worker not ready, try again.");
    setBgProcessing(true);
    setBgCompleted(false);
    setBgProgressText("Starting...");
    bgProgressRef.current = "Starting...";
    bgWorkerRef.current.postMessage({
      imageBlob: mainImageFile,
      modelName: bgModel,
    });
  };
  const getBgPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width,
      sy = canvas.height / rect.height;
    const clientX =
      "touches" in e
        ? (e as React.TouchEvent).touches[0].clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e
        ? (e as React.TouchEvent).touches[0].clientY
        : (e as React.MouseEvent).clientY;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  };
  const bgSaveHistory = () => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    setBgHistory((prev) => {
      const next = [
        ...prev,
        ctx.getImageData(0, 0, canvas.width, canvas.height),
      ];
      if (next.length > 10) next.shift();
      return next;
    });
  };
  const handleBgUndo = () => {
    if (bgHistory.length <= 1) return;
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const next = [...bgHistory];
    next.pop();
    ctx.putImageData(next[next.length - 1], 0, 0);
    setBgHistory(next);
  };
  const bgStartDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (bgTool === "none") return;
    setBgIsDrawing(true);
    bgLastPosRef.current = getBgPointerPos(e);
  };
  const bgDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (
      !bgIsDrawing ||
      bgTool === "none" ||
      !bgCanvasRef.current ||
      !bgLastPosRef.current
    )
      return;
    const ctx = bgCanvasRef.current.getContext("2d")!;
    const pos = getBgPointerPos(e);
    ctx.lineWidth = bgBrushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (bgTool === "erase") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (bgTool === "restore" && bgOrigImgRef.current) {
      ctx.globalCompositeOperation = "source-over";
      const pat = ctx.createPattern(bgOrigImgRef.current, "no-repeat");
      if (pat) ctx.strokeStyle = pat;
    }
    ctx.beginPath();
    ctx.moveTo(bgLastPosRef.current.x, bgLastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    bgLastPosRef.current = pos;
  };
  const bgStopDrawing = () => {
    if (bgIsDrawing) {
      setBgIsDrawing(false);
      bgLastPosRef.current = null;
      bgSaveHistory();
    }
  };
  const handleBgDownload = () => {
    if (!bgCanvasRef.current) return;
    const link = document.createElement("a");
    link.href = bgCanvasRef.current.toDataURL("image/png");
    link.download = `bg-removed-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const handleBgApply = () => {
    if (!bgCanvasRef.current) return;
    const dataUrl = bgCanvasRef.current.toDataURL("image/png");
    setCurrentImagePreview(dataUrl);
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((blob) =>
        setMainImageFile(
          new File([blob], "bg-removed.png", { type: "image/png" }),
        ),
      );
    setBgCompleted(false);
    setBgHistory([]);
    setBgTool("none");
    setActiveMode("none");
    toast.success("Applied to editor!");
  };

  // MAGIC ERASER worker
  useEffect(() => {
    if (activeMode !== "eraser") return;
    if (meWorkerRef.current) return;
    meWorkerRef.current = new Worker(
      new URL("../eraser/magic-eraser.worker.ts", import.meta.url),
      { type: "module" },
    );
    meWorkerRef.current.onmessage = (e) => {
      const { status, result, error } = e.data;
      if (status === "ready") {
        setMeReady(true);
      }
      if (status === "done") {
        const c = document.createElement("canvas");
        c.width = result.width;
        c.height = result.height;
        c.getContext("2d")!.putImageData(result, 0, 0);
        c.toBlob((b) => {
          if (!b) return;
          if (mePreviewUrl?.startsWith("blob:"))
            URL.revokeObjectURL(mePreviewUrl);
          const url = URL.createObjectURL(b);
          setMePreviewUrl(url);
          const img = new Image();
          img.src = url;
          img.onload = () => {
            meOrigImgRef.current = img;
          };
          const ctx = meCanvasRef.current?.getContext("2d");
          if (ctx && meCanvasRef.current)
            ctx.clearRect(
              0,
              0,
              meCanvasRef.current.width,
              meCanvasRef.current.height,
            );
          setMeHistory([]);
          setMeIsProcessing(false);
          toast.success("Object removed!");
        }, "image/png");
      }
      if (status === "error") {
        toast.error("Magic eraser failed: " + error);
        setMeIsProcessing(false);
      }
    };
    meWorkerRef.current.postMessage({ action: "preload" });
    return () => {
      meWorkerRef.current?.terminate();
      meWorkerRef.current = null;
      setMeReady(false);
    };
  }, [activeMode]);

  useEffect(() => {
    if (activeMode === "eraser" && currentImagePreview) {
      if (mePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(mePreviewUrl);
      setMePreviewUrl(currentImagePreview);
      setMeHistory([]);
      const img = new Image();
      img.src = currentImagePreview;
      img.onload = () => {
        setMeDimensions({ w: img.width, h: img.height });
        meOrigImgRef.current = img;
        if (meContainerRef.current) {
          const pad = 40;
          const scale = Math.min(
            (meContainerRef.current.clientWidth - pad) / img.width,
            (meContainerRef.current.clientHeight - pad) / img.height,
            1,
          );
          setMeZoom(scale);
        }
      };
    }
  }, [activeMode]);

  const getMePointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = meCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width,
      sy = canvas.height / rect.height;
    const clientX =
      "touches" in e
        ? (e as React.TouchEvent).touches[0].clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e
        ? (e as React.TouchEvent).touches[0].clientY
        : (e as React.MouseEvent).clientY;
    return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
  };
  const meStartDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!meCanvasRef.current || meIsProcessing) return;
    setMeIsDragging(true);
    const pos = getMePointerPos(e);
    meLastPosRef.current = pos;
    const ctx = meCanvasRef.current.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,0,0,0.5)";
      ctx.arc(pos.x, pos.y, meBrushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const meDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!meIsDragging || !meCanvasRef.current || !meLastPosRef.current) return;
    const ctx = meCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const pos = getMePointerPos(e);
    ctx.lineWidth = meBrushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(255,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(meLastPosRef.current.x, meLastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    meLastPosRef.current = pos;
  };
  const meStopDrawing = () => {
    if (!meIsDragging) return;
    setMeIsDragging(false);
    meLastPosRef.current = null;
    const ctx = meCanvasRef.current?.getContext("2d");
    if (ctx && meCanvasRef.current) {
      const snap = ctx.getImageData(
        0,
        0,
        meCanvasRef.current.width,
        meCanvasRef.current.height,
      );
      setMeHistory((prev) => [...prev, snap].slice(-10));
    }
  };
  const handleMeUndo = () => {
    const ctx = meCanvasRef.current?.getContext("2d");
    if (!ctx || meHistory.length === 0) return;
    const next = [...meHistory];
    next.pop();
    setMeHistory(next);
    if (next.length > 0) ctx.putImageData(next[next.length - 1], 0, 0);
    else ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  };
  const handleMeErase = async () => {
    if (!meOrigImgRef.current || !meCanvasRef.current || !mePreviewUrl) return;
    setMeIsProcessing(true);
    try {
      const imageRes = await fetch(mePreviewUrl);
      const imageBlob = await imageRes.blob();
      const imageBitmap = await createImageBitmap(imageBlob);
      const maskBitmap = await createImageBitmap(meCanvasRef.current);
      meWorkerRef.current?.postMessage(
        { action: "process", imageBitmap, maskBitmap },
        [imageBitmap, maskBitmap],
      );
    } catch (err: any) {
      toast.error("Failed: " + (err.message || "Unknown error"));
      setMeIsProcessing(false);
    }
  };
  const handleMeDownload = () => {
    if (!mePreviewUrl) return;
    const link = document.createElement("a");
    link.href = mePreviewUrl;
    link.download = `magic-erased-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };
  const handleMeApply = () => {
    if (!mePreviewUrl) return;
    setCurrentImagePreview(mePreviewUrl);
    fetch(mePreviewUrl)
      .then((r) => r.blob())
      .then((blob) =>
        setMainImageFile(new File([blob], "erased.png", { type: "image/png" })),
      );
    setMeHistory([]);
    setMePreviewUrl(null);
    setMeDimensions(null);
    setActiveMode("none");
    toast.success("Applied to editor!");
  };

  // UPSCALER
  const handleUpscale = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!mainImageFile) return toast.error("No image loaded.");
    setUpscaleLoading(true);
    setUpscaleResult(null);
    toast.info(`Upscaling… (Cost: ${upscaleCost} coins)`);
    try {
      const imageUrl = await fal.storage.upload(mainImageFile);
      const scale = upscaleLevel === "4k" ? 4 : 2;
      const res = await fetch("/api/fal/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId: "fal-ai/nano-banana-2/edit",
          input: { image_url: imageUrl, scale },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          res.status === 402
            ? "Insufficient coins!"
            : data.error || "Upscale failed",
        );
        throw new Error(data.error);
      }
      setUpscaleResult(data.imageUrl);
      toast.success("Upscale complete!");
    } catch (err) {
      console.error(err);
    } finally {
      setUpscaleLoading(false);
    }
  };
  const handleUpscaleDownload = async () => {
    if (!upscaleResult) return;
    try {
      const blob = await (await fetch(upscaleResult)).blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `upscaled-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed");
    }
  };
  const handleUpscaleApply = async () => {
    if (!upscaleResult) return;
    setCurrentImagePreview(upscaleResult);
    fetch(upscaleResult)
      .then((r) => r.blob())
      .then((blob) =>
        setMainImageFile(
          new File([blob], "upscaled.png", { type: "image/png" }),
        ),
      );
    setUpscaleResult(null);
    setActiveMode("none");
    toast.success("Upscaled image applied!");
  };

  // SKIN ENHANCER
  const handleSkinEnhance = async () => {
    if (!isAuthenticated) return setIsAuthModalOpen(true);
    if (!mainImageFile) return toast.error("No image loaded.");
    setSkinLoading(true);
    setSkinResult(null);
    toast.info("Enhancing skin… (Cost: 20 coins)");
    try {
      const imageUrl = await fal.storage.upload(mainImageFile);
      const res = await fetch("/api/fal/skin-enhancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            image_url: imageUrl,
            strength: skinStrength,
            features: skinFeatures,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          res.status === 402
            ? "Insufficient coins!"
            : data.error || "Enhancement failed",
        );
        throw new Error(data.error);
      }
      setSkinResult(data.imageUrl);
      toast.success("Enhancement complete!");
    } catch (err) {
      console.error(err);
    } finally {
      setSkinLoading(false);
    }
  };
  const handleSkinDownload = async () => {
    if (!skinResult) return;
    try {
      const blob = await (await fetch(skinResult)).blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `skin-enhanced-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      toast.error("Download failed");
    }
  };
  const handleSkinApply = () => {
    if (!skinResult) return;
    setCurrentImagePreview(skinResult);
    fetch(skinResult)
      .then((r) => r.blob())
      .then((blob) =>
        setMainImageFile(
          new File([blob], "skin-enhanced.jpg", { type: "image/jpeg" }),
        ),
      );
    setSkinResult(null);
    setActiveMode("none");
    toast.success("Applied to editor!");
  };

  if (!isMounted) return null;

  const isFullScreenMode = activeMode === "crop" || activeMode === "adjust";
  const isTextMode = activeMode === "text";
  const isBgRemoveMode = activeMode === "bgremove";
  const isEraserMode = activeMode === "eraser";
  const isUpscaleMode = activeMode === "upscale";
  const isSkinMode = activeMode === "skin";
  const isOverlayMode = activeMode === "overlay";

  return (
    <div className="no-sidebar-swipe flex flex-col h-full text-gray-300">
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="grow overflow-y-auto p-4 md:p-6 flex flex-col justify-center min-h-[60vh]">
          <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
            {!currentImagePreview && (
              <div className="flex flex-col items-center justify-center text-center text-gray-600">
                <ImagePlus className="h-20 w-20 mb-6 opacity-30" />
                <h1 className="text-2xl font-semibold mb-2 text-gray-500">
                  Image Editor
                </h1>
                <p className="text-gray-500 max-w-md">
                  Upload an image, brush over an area, and type.
                </p>
              </div>
            )}

            {currentImagePreview && activeMode === "crop" && (
              <div className="w-full max-w-3xl">
                <ImageCropper
                  imageSrc={currentImagePreview}
                  onCropComplete={handleCropComplete}
                  onCancel={() => setActiveMode("none")}
                />
              </div>
            )}
            {currentImagePreview && activeMode === "adjust" && (
              <div className="w-full max-w-3xl">
                <AdjustFilterPanel
                  imageSrc={currentImagePreview}
                  onApply={handleAdjustApply}
                  onCancel={() => setActiveMode("none")}
                />
              </div>
            )}

            {/* TEXT MODE */}
            {currentImagePreview && isTextMode && activeJobs.length === 0 && (
              <div className="w-full max-w-6xl flex flex-col gap-4">
                <div
                  ref={textContainerRef}
                  className="relative rounded-xl overflow-hidden border border-gray-800 bg-black/40 shadow-2xl w-fit mx-auto"
                  onMouseDown={() => setSelectedTextId(null)}
                >
                  <img
                    ref={imageRef}
                    src={currentImagePreview}
                    alt="Work"
                    crossOrigin="anonymous"
                    className="max-h-[45vh] max-w-full w-auto object-contain block"
                    draggable={false}
                  />
                  {textLayers.map((layer) => (
                    <TextNode
                      key={layer.id}
                      layer={layer}
                      selected={selectedTextId === layer.id}
                      containerRef={textContainerRef}
                      onSelect={() => setSelectedTextId(layer.id)}
                      onUpdate={(patch) => updateTextLayer(layer.id, patch)}
                      onDelete={() => deleteTextLayer(layer.id)}
                      onDuplicate={() => duplicateTextLayer(layer.id)}
                    />
                  ))}
                  {textLayers.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/50 backdrop-blur-sm text-gray-400 text-xs px-4 py-2 rounded-lg border border-gray-700">
                        Pick a preset below or click "Add Text" to start
                      </div>
                    </div>
                  )}
                </div>
                <TextPanel
                  layers={textLayers}
                  selectedId={selectedTextId}
                  onSelect={setSelectedTextId}
                  onAdd={addTextLayer}
                  onUpdate={updateTextLayer}
                  onDelete={deleteTextLayer}
                  onDuplicate={duplicateTextLayer}
                  onApply={(dataUrl) => {
                    setCurrentImagePreview(dataUrl);
                    fetch(dataUrl)
                      .then((r) => r.blob())
                      .then((blob) =>
                        setMainImageFile(
                          new File([blob], "text-overlay.jpg", {
                            type: "image/jpeg",
                          }),
                        ),
                      );
                    setTextLayers([]);
                    setSelectedTextId(null);
                    setActiveMode("none");
                    toast.success("Text baked into image!");
                  }}
                  onCancel={() => setActiveMode("none")}
                  imageRef={imageRef}
                  containerRef={textContainerRef}
                />
              </div>
            )}

            {/* OVERLAY MODE */}
            {currentImagePreview &&
              isOverlayMode &&
              activeJobs.length === 0 && (
                <div className="w-full max-w-6xl flex flex-col gap-4">
                  <div
                    ref={overlayContainerRef}
                    className="relative rounded-xl overflow-hidden border border-gray-800 bg-black/40 shadow-2xl w-fit mx-auto"
                    onMouseDown={() => setSelectedOverlayId(null)}
                  >
                    <img
                      ref={imageRef}
                      src={currentImagePreview}
                      alt="Work"
                      crossOrigin="anonymous"
                      className="max-h-[45vh] max-w-full w-auto object-contain block"
                      draggable={false}
                    />
                    {overlays.map((ov) => (
                      <OverlayNode
                        key={ov.id}
                        overlay={ov}
                        selected={selectedOverlayId === ov.id}
                        containerRef={overlayContainerRef}
                        onSelect={() => setSelectedOverlayId(ov.id)}
                        onUpdate={(patch) => updateOverlay(ov.id, patch)}
                        onDelete={() => deleteOverlay(ov.id)}
                      />
                    ))}
                    {overlays.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/50 backdrop-blur-sm text-gray-400 text-xs px-4 py-2 rounded-lg border border-gray-700">
                          Click "Add Image" below to place an overlay
                        </div>
                      </div>
                    )}
                  </div>
                  <OverlayPanel
                    overlays={overlays}
                    selectedId={selectedOverlayId}
                    onSelect={setSelectedOverlayId}
                    onUpdate={updateOverlay}
                    onDelete={deleteOverlay}
                    onAdd={addOverlay}
                    onApply={handleOverlayApply}
                    onCancel={() => {
                      setOverlays([]);
                      setSelectedOverlayId(null);
                      setActiveMode("none");
                    }}
                  />
                </div>
              )}

            {/* BG REMOVE MODE */}
            {currentImagePreview && isBgRemoveMode && (
              <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in duration-200">
                {!bgCompleted && !bgProcessing && (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-full border border-white/10">
                      <button
                        onClick={() => setBgModel("briaai/RMBG-1.4")}
                        className={`h-8 text-xs px-5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${bgModel === "briaai/RMBG-1.4" ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                      >
                        <Sparkles className="w-3.5 h-3.5" /> HD (150 MB)
                      </button>
                      <button
                        onClick={() => setBgModel("Xenova/modnet")}
                        className={`h-8 text-xs px-5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${bgModel === "Xenova/modnet" ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                      >
                        <Zap className="w-3.5 h-3.5" /> Fast (25 MB)
                      </button>
                    </div>
                    <img
                      src={currentImagePreview}
                      alt="Preview"
                      className="max-h-[50vh] max-w-full w-auto object-contain rounded-xl border border-gray-800 shadow-2xl"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleBgRemove}
                        className="h-9 px-6 rounded-full font-medium text-xs gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg"
                      >
                        <Scissors className="w-3.5 h-3.5" /> Remove Background
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMode("none")}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {bgProcessing && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
                    <p className="text-gray-400 font-medium">AI is working…</p>
                    <p className="text-xs text-gray-500">{bgProgressText}</p>
                  </div>
                )}
                {bgCompleted && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1 bg-gray-900/80 border border-gray-700 rounded-xl p-1">
                        <button
                          onClick={() =>
                            setBgTool(bgTool === "restore" ? "none" : "restore")
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${bgTool === "restore" ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "text-gray-400 hover:text-white"}`}
                        >
                          <Brush className="w-3.5 h-3.5" /> Restore
                        </button>
                        <button
                          onClick={() =>
                            setBgTool(bgTool === "erase" ? "none" : "erase")
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${bgTool === "erase" ? "bg-red-500/20 text-red-400 border border-red-500/40" : "text-gray-400 hover:text-white"}`}
                        >
                          <Eraser className="w-3.5 h-3.5" /> Erase
                        </button>
                      </div>
                      <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">
                          Size
                        </span>
                        <Slider
                          value={[bgBrushSize]}
                          onValueChange={([v]) => setBgBrushSize(v)}
                          min={5}
                          max={100}
                          step={5}
                          className="no-sidebar-swipe w-24"
                        />
                        <span className="text-[10px] font-mono text-cyan-400/80 w-6">
                          {bgBrushSize}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-900/80 border border-gray-700 rounded-xl p-1">
                        <button
                          onClick={() =>
                            setBgZoom((z) => Math.max(0.1, z - 0.1))
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                        >
                          <span className="text-xs font-bold">−</span>
                        </button>
                        <span className="text-[10px] text-gray-500 w-10 text-center">
                          {Math.round(bgZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setBgZoom((z) => Math.min(5, z + 0.1))}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                        >
                          <span className="text-xs font-bold">+</span>
                        </button>
                      </div>
                      <button
                        onClick={handleBgUndo}
                        disabled={bgHistory.length <= 1}
                        className="p-2 rounded-xl bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                      >
                        <Undo className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div
                      ref={bgContainerRef}
                      className="relative overflow-auto flex items-center justify-center rounded-xl border border-gray-800 bg-black/40"
                      style={{ maxHeight: "50vh" }}
                    >
                      <div
                        style={{
                          width: bgDimensions
                            ? bgDimensions.w * bgZoom
                            : "auto",
                          height: bgDimensions
                            ? bgDimensions.h * bgZoom
                            : "auto",
                          backgroundImage:
                            "repeating-conic-gradient(#1f2937 0% 25%, transparent 0% 50%)",
                          backgroundSize: "16px 16px",
                          borderRadius: 8,
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        <canvas
                          ref={bgCanvasRef}
                          onMouseDown={bgStartDrawing}
                          onMouseMove={bgDraw}
                          onMouseUp={bgStopDrawing}
                          onMouseLeave={bgStopDrawing}
                          onTouchStart={bgStartDrawing}
                          onTouchMove={bgDraw}
                          onTouchEnd={bgStopDrawing}
                          className="w-full h-full touch-none no-sidebar-swipe"
                          style={{
                            cursor: bgTool !== "none" ? "crosshair" : "default",
                            display: "block",
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleBgApply}
                        className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply to Editor
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleBgDownload}
                        className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PNG
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBgCompleted(false);
                          setBgHistory([]);
                          setBgTool("none");
                        }}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Redo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MAGIC ERASER MODE */}
            {currentImagePreview && isEraserMode && (
              <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in duration-200">
                {mePreviewUrl && meDimensions && (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 bg-gray-900/80 border border-gray-700 rounded-xl px-3 py-1.5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        Brush
                      </span>
                      <Slider
                        value={[meBrushSize]}
                        onValueChange={([v]) => setMeBrushSize(v)}
                        min={5}
                        max={100}
                        step={1}
                        className="no-sidebar-swipe w-24"
                      />
                      <span className="text-[10px] font-mono text-red-400/80 w-6">
                        {meBrushSize}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 bg-gray-900/80 border border-gray-700 rounded-xl p-1">
                      <button
                        onClick={() => setMeZoom((z) => Math.max(0.1, z - 0.1))}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white text-xs font-bold"
                      >
                        −
                      </button>
                      <span className="text-[10px] text-gray-500 w-10 text-center">
                        {Math.round(meZoom * 100)}%
                      </span>
                      <button
                        onClick={() => setMeZoom((z) => Math.min(5, z + 0.1))}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white text-xs font-bold"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={handleMeUndo}
                      disabled={meHistory.length === 0}
                      className="p-2 rounded-xl bg-gray-900/80 border border-gray-700 text-gray-400 hover:text-white disabled:opacity-30 transition-all"
                    >
                      <Undo className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {mePreviewUrl && meDimensions && (
                  <div
                    ref={meContainerRef}
                    className="relative overflow-auto flex items-center justify-center rounded-xl border border-gray-800 bg-black/40"
                    style={{ maxHeight: "50vh" }}
                  >
                    {meIsProcessing && (
                      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-xl">
                        <Loader2 className="h-10 w-10 animate-spin text-red-400 mb-3" />
                        <p className="text-white text-sm font-medium animate-pulse">
                          Removing object…
                        </p>
                      </div>
                    )}
                    <div
                      style={{
                        width: meDimensions.w * meZoom,
                        height: meDimensions.h * meZoom,
                        position: "relative",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={mePreviewUrl}
                        alt="Editing"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                        style={{
                          backgroundImage:
                            "repeating-conic-gradient(#1f2937 0% 25%, transparent 0% 50%)",
                          backgroundSize: "16px 16px",
                        }}
                      />
                      <canvas
                        ref={meCanvasRef}
                        width={meDimensions.w}
                        height={meDimensions.h}
                        onMouseDown={meStartDrawing}
                        onMouseMove={meDraw}
                        onMouseUp={meStopDrawing}
                        onMouseLeave={meStopDrawing}
                        onTouchStart={meStartDrawing}
                        onTouchMove={meDraw}
                        onTouchEnd={meStopDrawing}
                        className="absolute inset-0 w-full h-full touch-none cursor-crosshair opacity-70 no-sidebar-swipe"
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    onClick={handleMeErase}
                    disabled={meIsProcessing || !meReady}
                    className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-red-600 hover:bg-red-500 text-white shadow-lg disabled:opacity-50"
                  >
                    {meIsProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Eraser className="w-3.5 h-3.5" /> Erase
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleMeApply}
                    disabled={!mePreviewUrl}
                    className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" /> Apply to Editor
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleMeDownload}
                    disabled={!mePreviewUrl}
                    className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 disabled:opacity-40"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveMode("none");
                      setMeHistory([]);
                      setMePreviewUrl(null);
                      setMeDimensions(null);
                    }}
                    className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Cancel
                  </Button>
                </div>
                {!meReady && !meIsProcessing && (
                  <p className="text-center text-xs text-gray-500 animate-pulse">
                    Loading OpenCV model…
                  </p>
                )}
              </div>
            )}

            {/* UPSCALE MODE */}
            {currentImagePreview && isUpscaleMode && (
              <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in duration-200">
                {!upscaleResult && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-full border border-white/10">
                      {(
                        [
                          ["2k", "2K (2×)", 10],
                          ["4k", "4K (4×)", 20],
                        ] as [string, string, number][]
                      ).map(([id, label, cost]) => (
                        <button
                          key={id}
                          onClick={() => setUpscaleLevel(id as "2k" | "4k")}
                          className={`h-8 text-xs px-5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${upscaleLevel === id ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md" : "text-gray-400 hover:text-white"}`}
                        >
                          {label}
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${upscaleLevel === id ? "bg-white/20" : "bg-gray-800"}`}
                          >
                            {cost}🪙
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
                      <img
                        src={currentImagePreview}
                        alt="Source"
                        className="max-h-[48vh] max-w-full w-auto object-contain block"
                      />
                      {upscaleLoading && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                          <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
                          <p className="text-white text-sm font-medium animate-pulse">
                            Upscaling image…
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleUpscale}
                        disabled={upscaleLoading}
                        className="h-9 px-6 rounded-full font-medium text-xs gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg disabled:opacity-50"
                      >
                        {upscaleLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" /> Upscale ·{" "}
                            {upscaleCost} <Coins className="w-3 h-3" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMode("none")}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {upscaleResult && (
                  <div className="flex flex-col items-center gap-4">
                    <CompareSlider
                      original={currentImagePreview}
                      enhanced={upscaleResult}
                    />
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <Button
                        size="sm"
                        onClick={handleUpscaleApply}
                        className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply to Editor
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleUpscaleDownload}
                        className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUpscaleResult(null)}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Try Again
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setUpscaleResult(null);
                          setActiveMode("none");
                        }}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SKIN ENHANCER MODE */}
            {currentImagePreview && isSkinMode && (
              <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in duration-200">
                {!skinResult && (
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full max-w-2xl bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                      <div className="flex flex-col gap-2 flex-1 min-w-[160px]">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-400">
                            Enhancement Strength
                          </span>
                          <span className="text-[10px] text-teal-400 font-mono bg-teal-500/10 px-1.5 py-0.5 rounded">
                            {Math.round(skinStrength * 100)}%
                          </span>
                        </div>
                        <Slider
                          min={0.1}
                          max={0.7}
                          step={0.05}
                          value={[skinStrength]}
                          onValueChange={([v]) => setSkinStrength(v)}
                          disabled={skinLoading}
                          className="no-sidebar-swipe [&_[data-radix-slider-range]]:!bg-teal-500 [&_[role=slider]]:border-teal-500"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            ["peachFuzz", "Peach Fuzz"],
                            ["freckles", "Freckles"],
                            ["acne", "Subtle Acne"],
                            ["lensFlare", "Lens Flare"],
                          ] as [keyof typeof skinFeatures, string][]
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => toggleSkinFeature(key)}
                            disabled={skinLoading}
                            className={`h-7 px-3 text-[10px] rounded-full font-semibold border transition-all ${skinFeatures[key] ? "bg-cyan-500/20 border-cyan-500 text-cyan-400" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
                      <img
                        src={currentImagePreview}
                        alt="Source"
                        className="max-h-[45vh] max-w-full w-auto object-contain block"
                      />
                      {skinLoading && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                          <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
                          <p className="text-white text-sm font-medium animate-pulse">
                            Enhancing skin…
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={handleSkinEnhance}
                        disabled={skinLoading}
                        className="h-9 px-6 rounded-full font-medium text-xs gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg disabled:opacity-50"
                      >
                        {skinLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" /> Enhance · 20{" "}
                            <Coins className="w-3 h-3" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveMode("none")}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                )}
                {skinResult && (
                  <div className="flex flex-col items-center gap-4">
                    <CompareSlider
                      original={currentImagePreview}
                      enhanced={skinResult}
                    />
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <Button
                        size="sm"
                        onClick={handleSkinApply}
                        className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply to Editor
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSkinDownload}
                        className="h-9 px-5 rounded-full font-medium text-xs gap-1.5 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSkinResult(null)}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Redo
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSkinResult(null);
                          setActiveMode("none");
                        }}
                        className="h-9 px-4 rounded-full text-xs text-gray-400 border border-gray-700"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MAIN CANVAS (normal mode) */}
            {currentImagePreview &&
              !isFullScreenMode &&
              !isTextMode &&
              !isOverlayMode &&
              !isBgRemoveMode &&
              !isEraserMode &&
              !isUpscaleMode &&
              !isSkinMode &&
              activeJobs.length === 0 && (
                <div className="no-sidebar-swipe relative rounded-xl overflow-hidden shadow-2xl border border-gray-800 bg-black/40 group w-fit h-auto animate-in fade-in duration-300">
                  <img
                    ref={imageRef}
                    src={currentImagePreview}
                    alt="Work"
                    crossOrigin="anonymous"
                    className={`max-h-[65vh] max-w-full w-auto object-contain block ${isInpaintMode ? "cursor-crosshair" : ""}`}
                    draggable={false}
                  />
                  <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 z-10 touch-none ${isInpaintMode ? "block cursor-crosshair" : "hidden pointer-events-none"}`}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                  {!hasDrawnMask && (
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-md pointer-events-none">
                      {isInpaintMode ? "Draw mask area" : "Ready to Edit"}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="absolute top-3 right-3 h-10 w-10 rounded-full bg-black/60 hover:bg-red-600/90 text-white z-20 shadow-lg border border-white/20"
                  >
                    {currentImagePreview !== originalImagePreview ? (
                      <Undo2 className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-6 w-6" />
                    )}
                  </Button>
                  {!isInpaintMode && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownload}
                      className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-black/60 hover:bg-gray-700 text-white z-20 border border-white/20"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              )}

            {activeJobs.length > 0 && (
              <div className="w-full max-w-lg aspect-4/3 rounded-lg border border-dashed border-gray-700 bg-gray-800/50 flex flex-col items-center justify-center animate-pulse">
                <Loader2 className="h-10 w-10 animate-spin text-cyan-500 mb-4" />
                <p className="text-gray-400 font-medium">Generating Magic...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM CONTROLS */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent">
        {!isFullScreenMode &&
          !isTextMode &&
          !isOverlayMode &&
          !isBgRemoveMode &&
          !isEraserMode &&
          !isUpscaleMode &&
          !isSkinMode && (
            <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-4xl mx-auto mb-3">
              {currentImagePreview && !isLoading && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => switchMode("crop")}
                    className={`h-auto p-0 gap-2 text-xs hover:bg-transparent ${(activeMode as ActiveMode) === "crop" ? "text-cyan-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    <Crop className="w-4 h-4" />
                    <span>Crop</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => switchMode("adjust")}
                    className={`h-auto p-0 gap-2 text-xs hover:bg-transparent ${(activeMode as ActiveMode) === "adjust" ? "text-cyan-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Adjust</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => switchMode("text")}
                    className={`h-auto p-0 gap-2 text-xs hover:bg-transparent ${(activeMode as ActiveMode) === "text" ? "text-cyan-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    <Type className="w-4 h-4" />
                    <span>Text</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => switchMode("inpaint")}
                    className={`h-auto p-0 gap-2 text-xs hover:bg-transparent ${isInpaintMode ? "text-cyan-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    <Paintbrush className="w-4 h-4" />
                    <span>{isInpaintMode ? "Done" : "Inpaint"}</span>
                  </Button>
                  {/* ── OVERLAY BUTTON ── */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      switchMode("overlay");
                      setOverlays([]);
                      setSelectedOverlayId(null);
                    }}
                    className={`h-auto p-0 gap-2 text-xs hover:bg-transparent ${(activeMode as ActiveMode) === "overlay" ? "text-cyan-400 font-bold" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    <Eye className="w-4 h-4" />
                    <span>Overlay</span>
                  </Button>
                  {/* ── AI TOOLS DROPDOWN ── */}
                  <div ref={aiToolsRef} className="relative">
                    <button
                      onClick={() => setAiToolsOpen((o) => !o)}
                      className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        ["bgremove", "eraser", "upscale", "skin"].includes(
                          activeMode as string,
                        )
                          ? "text-cyan-400"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      <Wand2 className="w-4 h-4" />
                      <span>AI Tools</span>
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-200 ${aiToolsOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {aiToolsOpen && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-40 bg-gray-950/95 backdrop-blur border border-gray-800 rounded-lg shadow-xl shadow-black/60 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-100">
                        {[
                          {
                            icon: <Scissors className="w-3.5 h-3.5" />,
                            label: "BG Remove",
                            mode: "bgremove" as ActiveMode,
                            free: true,
                            action: () => {
                              switchMode("bgremove");
                              setBgCompleted(false);
                              setBgHistory([]);
                              setBgTool("none");
                              setAiToolsOpen(false);
                            },
                          },
                          {
                            icon: <Eraser className="w-3.5 h-3.5" />,
                            label: "Magic Eraser",
                            mode: "eraser" as ActiveMode,
                            free: true,
                            action: () => {
                              switchMode("eraser");
                              setAiToolsOpen(false);
                            },
                          },
                          {
                            icon: <Maximize2 className="w-3.5 h-3.5" />,
                            label: "Upscale",
                            mode: "upscale" as ActiveMode,
                            free: false,
                            action: () => {
                              switchMode("upscale");
                              setUpscaleResult(null);
                              setAiToolsOpen(false);
                            },
                          },
                          {
                            icon: <Sparkles className="w-3.5 h-3.5" />,
                            label: "Skin Enhance",
                            mode: "skin" as ActiveMode,
                            free: false,
                            action: () => {
                              switchMode("skin");
                              setSkinResult(null);
                              setAiToolsOpen(false);
                            },
                          },
                        ].map((tool, i, arr) => {
                          const isActive =
                            (activeMode as ActiveMode) === tool.mode;
                          return (
                            <button
                              key={tool.mode}
                              onClick={tool.action}
                              className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                                isActive
                                  ? "bg-gray-800/80 text-white"
                                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                              } ${i < arr.length - 1 ? "border-b border-gray-800/60" : ""}`}
                            >
                              <span className="flex items-center gap-2 text-[11px] font-medium">
                                {tool.icon}
                                {tool.label}
                              </span>
                              {tool.free && (
                                <span className="text-[9px] font-bold px-1 py-px rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 leading-none">
                                  FREE
                                </span>
                              )}
                              {isActive && !tool.free && (
                                <div className="w-1 h-1 rounded-full bg-cyan-400" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
              {isInpaintMode && (
                <div className="flex items-center gap-3 ml-2 pl-3 border-l border-gray-700 animate-in fade-in slide-in-from-left-2">
                  <div className="flex bg-gray-800 rounded-md p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDrawingTool("brush")}
                      className={`h-6 w-6 rounded-sm ${drawingTool === "brush" ? "bg-gray-600 text-white" : "text-gray-400"}`}
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDrawingTool("eraser")}
                      className={`h-6 w-6 rounded-sm ${drawingTool === "eraser" ? "bg-gray-600 text-white" : "text-gray-400"}`}
                    >
                      <Eraser className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-gray-500 uppercase font-bold">
                      Size
                    </Label>
                    <Slider
                      value={[brushSize]}
                      onValueChange={([v]) => setBrushSize(v)}
                      min={5}
                      max={100}
                      step={5}
                      className="no-sidebar-swipe w-20"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearMask}
                    className="text-gray-400 hover:text-red-400 h-auto p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

        {!isFullScreenMode &&
          !isTextMode &&
          !isOverlayMode &&
          !isBgRemoveMode &&
          !isEraserMode &&
          !isUpscaleMode &&
          !isSkinMode && (
            <div className="flex flex-col gap-2 w-full max-w-4xl mx-auto">
              <div className="relative w-full p-1 rounded-xl flex items-center gap-2 bg-transparent border border-gray-700 min-h-13.5">
                {!currentImagePreview ? (
                  <div className="relative pl-2">
                    <input
                      ref={mainInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleMainImageChange}
                    />
                    <Button
                      variant="ghost"
                      className="h-10 w-10 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50"
                      onClick={() => mainInputRef.current?.click()}
                    >
                      <UploadCloud className="h-6 w-6" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative pl-2 flex items-center">
                    <input
                      ref={referenceInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleReferenceImageChange}
                    />
                    {referencePreview ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-cyan-500/50 group animate-in zoom-in-95 duration-200 shadow-md">
                        <img
                          src={referencePreview}
                          className="w-full h-full object-cover"
                          alt="Reference"
                        />
                        <div
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                          onClick={removeReferenceImage}
                        >
                          <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800/50 transition-colors"
                        onClick={() => referenceInputRef.current?.click()}
                        disabled={isLoading}
                      >
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                )}
                <div className="relative grow">
                  <Textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      referencePreview
                        ? "Describe how to use this reference..."
                        : "Describe the edit..."
                    }
                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-sm md:text-base text-gray-200 placeholder-gray-500 py-3 min-h-12.5 max-h-20 leading-tight"
                    rows={1}
                    maxLength={1000}
                    disabled={isLoading || !currentImagePreview}
                  />
                </div>
                <div className="pr-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={
                      isLoading ||
                      !currentImagePreview ||
                      (isInpaintMode && !hasDrawnMask) ||
                      !prompt
                    }
                    className={`h-9 px-4 rounded-full font-medium transition-all text-xs flex items-center gap-1.5 ${isLoading || !currentImagePreview || (isInpaintMode && !hasDrawnMask) || !prompt ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-linear-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg"}`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="whitespace-nowrap">10</span>
                        <Coins className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
      </div>

      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
    </div>
  );
};

export default ImageEditingPage;
