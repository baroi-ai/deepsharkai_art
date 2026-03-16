"use client";

import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Download,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Settings2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Player } from "@remotion/player";
import { renderMediaOnWeb } from "@remotion/web-renderer";
import { transform } from "sucrase";
import * as remotion from "remotion";

// ─── Types ────────────────────────────────────────────────────────────────────
type Provider = "gemini" | "openrouter";

const OPENROUTER_MODELS = [
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-coder", label: "DeepSeek Coder" },
  { id: "qwen/qwen-2.5-coder-32b-instruct", label: "Qwen 2.5 Coder 32B" },
];

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are an expert Remotion motion graphics coder.
The user will describe an animation and you will return ONLY a valid JavaScript function.

STRICT RULES:
- Return ONLY the raw JS function code. No markdown. No backticks. No explanation.
- Do NOT use import or export statements.
- All remotion hooks/functions come from the injected global: window.__remotion__
- Destructure what you need at the TOP of the function like:
    const { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring, Sequence } = window.__remotion__;
- The function MUST be named exactly: RemotionComp
- Use ONLY inline styles. No Tailwind. No CSS classes.
- Do NOT reference external images or fonts.
- Use Math.sin, Math.cos, Math.PI freely for animations.
- Make it visually stunning — use colors, gradients, shadows, transforms.
- durationInFrames will be 180 (6 seconds at 30fps). Design for this.

EXAMPLE OUTPUT:
function RemotionComp() {
  const { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } = window.__remotion__;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 10, stiffness: 80 } });
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        transform: \`scale(\${scale})\`,
        opacity,
        color: '#fff',
        fontSize: 80,
        fontWeight: 900,
        fontFamily: 'system-ui',
        textShadow: '0 0 40px #0ff'
      }}>
        HELLO
      </div>
    </AbsoluteFill>
  );
}

Now generate a stunning animation for the user's prompt. Return ONLY the function.
`.trim();

// ─── Eval Remotion Code ───────────────────────────────────────────────────────
function evalRemotionComponent(rawCode: string): React.ComponentType {
  (window as any).__remotion__ = remotion;
  (window as any).React = React;

  const cleaned = rawCode
    .replace(/```(?:jsx?|tsx?|javascript)?/gi, "")
    .replace(/```/g, "")
    .trim();

  const { code } = transform(cleaned, {
    transforms: ["jsx"],
    jsxPragma: "React.createElement",
    jsxFragmentPragma: "React.Fragment",
    filePath: "remotion-comp.jsx",
  });

  const wrapped = `
    const React = window.React;
    ${code}
    return RemotionComp;
  `;

  // eslint-disable-next-line no-new-func
  const factory = new Function(wrapped);
  const Comp = factory();
  if (typeof Comp !== "function")
    throw new Error("No valid component returned");
  return Comp;
}

// ─── Gemini API Call ──────────────────────────────────────────────────────────
async function callGemini(apiKey: string, userPrompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
      }),
    },
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── OpenRouter API Call ──────────────────────────────────────────────────────
async function callOpenRouter(
  apiKey: string,
  model: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "DeepShark Motion",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || `OpenRouter error ${res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

// ─── Placeholder Component ────────────────────────────────────────────────────
const PlaceholderComp: React.FC = () => {
  const { AbsoluteFill, useCurrentFrame, interpolate } = remotion;
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const float = Math.sin(frame / 20) * 8;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, #0a0a0f 0%, #000 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        opacity,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #14b8a6, #6366f1)",
          transform: `translateY(${float}px)`,
          boxShadow: "0 0 40px #14b8a655",
        }}
      />
      <p
        style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: 18,
          fontFamily: "system-ui",
          transform: `translateY(${float * 0.5}px)`,
        }}
      >
        Describe your animation below
      </p>
    </AbsoluteFill>
  );
};

// ─── Provider Config Panel ────────────────────────────────────────────────────
function ProviderPanel({
  provider,
  setProvider,
  geminiKey,
  onSaveGemini,
  openRouterKey,
  onSaveOpenRouter,
  openRouterModel,
  setOpenRouterModel,
}: {
  provider: Provider;
  setProvider: (p: Provider) => void;
  geminiKey: string;
  onSaveGemini: (k: string) => void;
  openRouterKey: string;
  onSaveOpenRouter: (k: string) => void;
  openRouterModel: string;
  setOpenRouterModel: (m: string) => void;
}) {
  const [geminiInput, setGeminiInput] = useState(geminiKey);
  const [orInput, setOrInput] = useState(openRouterKey);
  const [showGemini, setShowGemini] = useState(false);
  const [showOR, setShowOR] = useState(false);
  const [open, setOpen] = useState(!geminiKey && !openRouterKey);

  const geminiSaved = !!geminiKey && geminiKey === geminiInput;
  const orSaved = !!openRouterKey && openRouterKey === orInput;

  return (
    <div className="w-full max-w-3xl mx-auto mb-3">
      {/* Toggle row */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors mb-2"
      >
        <Settings2 className="h-3.5 w-3.5" />
        {open ? "Hide" : "Show"} API settings
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {open && (
        <div className="rounded-xl border border-white/8 bg-gray-900/60 p-4 space-y-4">
          {/* Provider tabs */}
          <div className="flex gap-2">
            {(["gemini", "openrouter"] as Provider[]).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  provider === p
                    ? "bg-teal-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200"
                }`}
              >
                {p === "gemini" ? "Gemini" : "OpenRouter"}
              </button>
            ))}
          </div>

          {/* Gemini panel */}
          {provider === "gemini" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Free tier — 1,500 requests/day.{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:text-teal-400 underline"
                >
                  Get key at aistudio.google.com
                </a>
              </p>
              <div className="flex items-center gap-2">
                <div className="relative grow">
                  <Input
                    type={showGemini ? "text" : "password"}
                    placeholder="AIza..."
                    value={geminiInput}
                    onChange={(e) => setGeminiInput(e.target.value)}
                    className="bg-gray-800 border-gray-700 focus:border-teal-500 text-xs text-gray-300 placeholder-gray-600 pr-8 h-9 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGemini((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showGemini ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={() => {
                    if (!geminiInput.trim()) return;
                    onSaveGemini(geminiInput.trim());
                    toast.success("Gemini key saved");
                  }}
                  disabled={geminiSaved || !geminiInput.trim()}
                  size="sm"
                  className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs shrink-0 gap-1.5"
                >
                  {geminiSaved ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* OpenRouter panel */}
          {provider === "openrouter" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Access 200+ models. Many have free tiers.{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-500 hover:text-teal-400 underline"
                >
                  Get key at openrouter.ai
                </a>
              </p>
              <div className="flex items-center gap-2">
                <div className="relative grow">
                  <Input
                    type={showOR ? "text" : "password"}
                    placeholder="sk-or-..."
                    value={orInput}
                    onChange={(e) => setOrInput(e.target.value)}
                    className="bg-gray-800 border-gray-700 focus:border-teal-500 text-xs text-gray-300 placeholder-gray-600 pr-8 h-9 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOR((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showOR ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <Button
                  onClick={() => {
                    if (!orInput.trim()) return;
                    onSaveOpenRouter(orInput.trim());
                    toast.success("OpenRouter key saved");
                  }}
                  disabled={orSaved || !orInput.trim()}
                  size="sm"
                  className="h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs shrink-0 gap-1.5"
                >
                  {orSaved ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Saved
                    </>
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>

              {/* Model picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 shrink-0">Model:</span>
                <Select
                  value={openRouterModel}
                  onValueChange={setOpenRouterModel}
                >
                  <SelectTrigger className="h-9 bg-gray-800 border-gray-700 text-xs text-gray-300 focus:ring-0 focus:border-teal-500 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 text-gray-300 text-xs">
                    {OPENROUTER_MODELS.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-700">
            Keys are stored only in your browser — never sent to our servers.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MotionGenerationPage() {
  const [provider, setProvider] = useState<Provider>("gemini");
  const [geminiKey, setGeminiKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState(
    OPENROUTER_MODELS[0].id,
  );

  useEffect(() => {
    const gk = localStorage.getItem("gemini_api_key");
    const ok = localStorage.getItem("openrouter_api_key");
    const om = localStorage.getItem("openrouter_model");
    if (gk) setGeminiKey(gk);
    if (ok) setOpenRouterKey(ok);
    if (om) setOpenRouterModel(om);
    // Auto-select provider based on which key exists
    if (ok && !gk) setProvider("openrouter");
  }, []);

  const saveGeminiKey = (k: string) => {
    setGeminiKey(k);
    localStorage.setItem("gemini_api_key", k);
  };

  const saveOpenRouterKey = (k: string) => {
    setOpenRouterKey(k);
    localStorage.setItem("openrouter_api_key", k);
  };

  const saveOpenRouterModel = (m: string) => {
    setOpenRouterModel(m);
    localStorage.setItem("openrouter_model", m);
  };

  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [DynamicComp, setDynamicComp] = useState<React.ComponentType | null>(
    null,
  );
  const [compError, setCompError] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeKey = provider === "gemini" ? geminiKey : openRouterKey;

  const hasKey = !!activeKey;

  // ── Generate ──
  const handleGenerate = async () => {
    if (!hasKey) {
      toast.error("Add your API key in settings above");
      return;
    }
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setCompError(null);
    setVideoUrl(null);
    setGeneratedCode("");
    setDynamicComp(null);

    try {
      let rawCode = "";

      if (provider === "gemini") {
        rawCode = await callGemini(geminiKey, prompt);
      } else {
        rawCode = await callOpenRouter(openRouterKey, openRouterModel, prompt);
      }

      setGeneratedCode(rawCode);
      const Comp = evalRemotionComponent(rawCode);
      setDynamicComp(() => Comp);
      toast.success("Animation ready!");
    } catch (err: any) {
      setCompError(err.message);
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Export ──
  const handleExport = async () => {
    if (!DynamicComp) return;
    setIsRendering(true);
    setRenderProgress(0);
    setVideoUrl(null);

    try {
      const { getBlob } = await renderMediaOnWeb({
        composition: {
          id: "motion-export",
          component: DynamicComp,
          durationInFrames: 180,
          fps: 30,
          width: 1920,
          height: 1080,
          defaultProps: {},
        },
        inputProps: {},
        onProgress: ({ progress }) =>
          setRenderProgress(Math.round(progress * 100)),
      });

      const blob = await getBlob();
      setVideoUrl(URL.createObjectURL(blob));
      toast.success("MP4 ready to download!");
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const ActiveComp = DynamicComp ?? PlaceholderComp;

  const providerLabel =
    provider === "gemini"
      ? "Gemini 2.0 Flash"
      : (OPENROUTER_MODELS.find((m) => m.id === openRouterModel)?.label ??
        "OpenRouter");

  return (
    <div className="flex flex-col h-full bg-black text-gray-300">
      {/* Preview */}
      <div className="grow overflow-y-auto p-4 md:p-8 flex flex-col items-center justify-center gap-4">
        <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-950">
          {videoUrl ? (
            <>
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
              <Button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = videoUrl;
                  a.download = "motion.mp4";
                  a.click();
                }}
                className="absolute top-3 right-3 bg-teal-500 hover:bg-teal-400 text-black h-9 w-9 rounded-full p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Player
                component={ActiveComp}
                inputProps={{}}
                durationInFrames={180}
                fps={30}
                compositionWidth={1920}
                compositionHeight={1080}
                style={{ width: "100%", height: "100%" }}
                controls
                loop
                autoPlay
              />

              {/* Generating overlay */}
              {isGenerating && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-teal-400" />
                  <p className="text-white font-bold text-base">
                    Writing animation code…
                  </p>
                  <p className="text-xs text-gray-400">
                    {providerLabel} is coding your motion graphic
                  </p>
                </div>
              )}

              {/* Rendering overlay */}
              {isRendering && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-50 gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                  <p className="text-white font-bold text-lg">
                    {renderProgress}%
                  </p>
                  <p className="text-xs text-gray-400">
                    Rendering in your browser…
                  </p>
                  <div className="w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-200"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error badge */}
              {compError && (
                <div className="absolute bottom-3 left-3 right-3 bg-red-950/90 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <p className="font-semibold mb-0.5">
                      Code error — try regenerating
                    </p>
                    <p className="opacity-70 font-mono">{compError}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Generated code viewer */}
        {generatedCode && (
          <div className="w-full max-w-4xl">
            <button
              onClick={() => setShowCode((v) => !v)}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              {showCode ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {showCode ? "Hide" : "View"} generated code
            </button>
            {showCode && (
              <pre className="mt-2 p-4 bg-gray-900 rounded-xl text-xs text-emerald-400 overflow-x-auto max-h-48 overflow-y-auto border border-white/5 font-mono">
                {generatedCode}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="w-full px-4 pb-6 pt-3 border-t border-white/5">
        {/* Provider / API key settings */}
        <ProviderPanel
          provider={provider}
          setProvider={setProvider}
          geminiKey={geminiKey}
          onSaveGemini={saveGeminiKey}
          openRouterKey={openRouterKey}
          onSaveOpenRouter={saveOpenRouterKey}
          openRouterModel={openRouterModel}
          setOpenRouterModel={saveOpenRouterModel}
        />

        {/* Active provider badge */}
        {hasKey && (
          <div className="max-w-3xl mx-auto mb-2 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
            <span className="text-xs text-gray-500">Using {providerLabel}</span>
          </div>
        )}

        {/* Prompt row */}
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            placeholder={
              !hasKey
                ? "Open API settings above and add your key first…"
                : 'Try "neon countdown 10 to 0", "particle explosion", "glitch logo reveal", "matrix rain"…'
            }
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = `${Math.min(
                  textareaRef.current.scrollHeight,
                  120,
                )}px`;
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            rows={1}
            disabled={isGenerating || isRendering || !hasKey}
            className="grow bg-gray-900 border-gray-700 focus:border-teal-500 focus:ring-0 rounded-xl resize-none text-sm text-gray-200 placeholder-gray-600 min-h-12 max-h-28"
          />

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isRendering || !prompt.trim() || !hasKey}
            className="h-12 px-5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold shrink-0 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Coding…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate
              </>
            )}
          </Button>

          {DynamicComp && !videoUrl && !isGenerating && (
            <Button
              onClick={handleExport}
              disabled={isRendering}
              className="h-12 px-5 rounded-xl bg-white text-black hover:bg-gray-100 font-semibold shrink-0 gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
