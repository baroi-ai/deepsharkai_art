"use client";

import React, { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Volume2,
  Cpu,
  User,
  Smile,
  Loader2,
  Download,
  X,
  AlertTriangle,
  AudioLines,
} from "lucide-react";
import { toast } from "sonner";

const defaultText =
  "Life is like a box of chocolates. You never know what you're gonna get.";

// 🌟 EXPANDED MULTILINGUAL VOICE GROUPS
const VOICE_GROUPS = [
  {
    language: "English (American) - Female",
    voices: [
      { id: "af_heart", name: "Heart (Natural)", gender: "female" },
      { id: "af_bella", name: "Bella (Energetic)", gender: "female" },
      { id: "af_nicole", name: "Nicole (Audiobook)", gender: "female" },
      { id: "af_alloy", name: "Alloy", gender: "female" },
      { id: "af_aoede", name: "Aoede", gender: "female" },
      { id: "af_jessica", name: "Jessica", gender: "female" },
      { id: "af_kore", name: "Kore", gender: "female" },
      { id: "af_nova", name: "Nova", gender: "female" },
      { id: "af_river", name: "River", gender: "female" },
      { id: "af_sarah", name: "Sarah", gender: "female" },
      { id: "af_sky", name: "Sky", gender: "female" },
    ],
  },
  {
    language: "English (American) - Male",
    voices: [
      { id: "am_adam", name: "Adam (Deep)", gender: "male" },
      { id: "am_michael", name: "Michael (Casual)", gender: "male" },
      { id: "am_echo", name: "Echo", gender: "male" },
      { id: "am_eric", name: "Eric", gender: "male" },
      { id: "am_fenrir", name: "Fenrir", gender: "male" },
      { id: "am_liam", name: "Liam", gender: "male" },
      { id: "am_onyx", name: "Onyx", gender: "male" },
      { id: "am_puck", name: "Puck", gender: "male" },
      { id: "am_santa", name: "Santa", gender: "male" },
    ],
  },
  {
    language: "English (British)",
    voices: [
      { id: "bf_emma", name: "Emma (Female)", gender: "female" },
      { id: "bf_isabella", name: "Isabella (Female)", gender: "female" },
      { id: "bf_alice", name: "Alice (Female)", gender: "female" },
      { id: "bf_lily", name: "Lily (Female)", gender: "female" },
      { id: "bm_george", name: "George (Male)", gender: "male" },
      { id: "bm_lewis", name: "Lewis (Male)", gender: "male" },
      { id: "bm_daniel", name: "Daniel (Male)", gender: "male" },
      { id: "bm_fable", name: "Fable (Male)", gender: "male" },
    ],
  },
];

export default function VoiceGenerationPage() {
  // --- State ---
  const [textInput, setTextInput] = useState(defaultText);
  const [selectedVoice, setSelectedVoice] = useState<string>("af_heart");

  // Worker & Processing State
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- 1. Initialize Web Worker ---
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("./tts.worker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current.onmessage = (event) => {
      const { status, message, audioBlob, error } = event.data;

      if (status === "loading") {
        setLoadingMsg(message);
      } else if (status === "ready") {
        setIsEngineReady(true);
        setLoadingMsg("");
        toast.success("AI Voice Engine Ready!");
      } else if (status === "generating") {
        setIsProcessing(true);
        setLoadingMsg(message);
      } else if (status === "complete") {
        setIsProcessing(false);
        setLoadingMsg("");

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        setTimeout(() => {
          if (audioRef.current) audioRef.current.play();
        }, 100);
      } else if (status === "error") {
        setIsProcessing(false);
        setLoadingMsg("");
        console.error(error);
        toast.error(`Error: ${error}`);
      }
    };

    workerRef.current.postMessage({ type: "init" });

    return () => {
      workerRef.current?.terminate();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // --- 2. Generate Audio Function ---
  const handleGenerate = () => {
    if (!textInput.trim()) return;
    if (!isEngineReady) {
      toast.error("Please wait for the AI engine to finish loading.");
      return;
    }

    setAudioUrl(null);
    workerRef.current?.postMessage({
      type: "generate",
      text: textInput,
      voice: selectedVoice,
    });
  };

  const clearMedia = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* 🌟 TOP AREA: MAIN BIG PROMPT & PREVIEW 🌟 */}
      <div className="grow overflow-y-auto p-4 md:p-6 pb-40 flex flex-col justify-start min-h-[60vh]">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
          <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-10 max-w-2xl w-full">
            <AudioLines className="h-16 w-16 mb-4 opacity-30" />
            <h1 className="text-2xl font-semibold mb-2 text-gray-500">
              AI Voice Generator
            </h1>
            <p className="text-gray-500 mb-6">
              Type your script below to generate studio-quality speech locally.
            </p>

            {/* 🌟 MAIN BIG EDITABLE PROMPT 🌟 */}
            <div className="w-full relative shadow-2xl mb-4">
              <Textarea
                placeholder="Enter text to speak..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                rows={8}
                disabled={isProcessing}
                className="w-full bg-slate-900/50 border border-gray-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl resize-y text-base text-gray-200 placeholder-gray-600 p-5 min-h-[200px] shadow-inner"
                maxLength={1000}
              />
              <div className="absolute bottom-3 right-4 text-xs font-mono text-gray-500">
                {textInput.length} / 1000
              </div>
            </div>

            {/* LOCAL PRIVACY BADGE */}
            <div className="p-3 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full max-w-md animate-in fade-in slide-in-from-bottom-2 mx-auto">
              <div className="flex items-center justify-center gap-2 text-teal-300">
                <Cpu className="h-4 w-4" />
                <p className="text-xs font-medium">
                  100% Private. Runs entirely on your device.
                </p>
              </div>
            </div>
          </div>

          {/* AUDIO PLAYER PREVIEW STATE */}
          {audioUrl && (
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-500 mt-4">
              <div className="relative group rounded-xl overflow-hidden border border-gray-700 bg-black shadow-2xl flex flex-col items-center justify-center min-h-50 p-6 md:p-8">
                <Volume2 className="h-12 w-12 text-teal-500 mb-6 opacity-80" />

                <audio
                  ref={audioRef}
                  controls
                  src={audioUrl}
                  className="w-full h-12 outline-none mb-6"
                />

                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black font-bold h-11"
                >
                  <a href={audioUrl} download={`ai-voice-${selectedVoice}.wav`}>
                    <Download className="w-4 h-4 mr-2" /> Download .WAV
                  </a>
                </Button>

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

          {/* PROCESSING INDICATOR */}
          {isProcessing && (
            <div className="flex items-center gap-3 bg-yellow-950/30 border border-yellow-800/50 p-4 rounded-lg max-w-md animate-pulse">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div className="text-sm text-yellow-200/80">
                <p className="font-semibold text-yellow-500">
                  Processing locally
                </p>
                <p className="text-xs">{loadingMsg || "Generating audio..."}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🌟 BOTTOM INPUT BAR (Voice Model Selector + Status Bar) 🌟 */}
      <div className="w-full px-4 pb-4 pt-2 bg-transparent z-10">
        <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-2 p-1">
          {/* TOP: VOICE SELECTOR (Styled like an AI Model Selector pill) */}
          <div className="flex items-center px-1">
            <Select
              value={selectedVoice}
              onValueChange={setSelectedVoice}
              disabled={isProcessing}
            >
              <SelectTrigger className="h-9 w-fit min-w-[200px] flex items-center gap-2 text-xs border border-gray-800 bg-gray-900/80 hover:bg-gray-800 rounded-lg transition-all focus:ring-0 focus:ring-offset-0 text-gray-300 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    Model:
                  </span>
                  <SelectValue placeholder="Select Voice" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-gray-300 max-h-[350px]">
                {VOICE_GROUPS.map((group) => (
                  <SelectGroup key={group.language}>
                    <SelectLabel className="text-teal-400/80 text-[10px] font-bold uppercase tracking-wider py-2">
                      {group.language}
                    </SelectLabel>
                    {group.voices.map((voice) => (
                      <SelectItem
                        key={voice.id}
                        value={voice.id}
                        className="focus:bg-slate-800 cursor-pointer py-2 ml-2"
                      >
                        <div className="flex items-center gap-2">
                          {voice.gender === "female" ? (
                            <Smile className="w-3 h-3 text-pink-400" />
                          ) : (
                            <User className="w-3 h-3 text-blue-400" />
                          )}
                          <span className="font-medium text-xs">
                            {voice.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* BOTTOM: DISABLED STATUS TEXTAREA & GENERATE BUTTON */}
          <div className="relative flex items-center w-full">
            <Textarea
              disabled={true}
              value={
                isProcessing
                  ? `${loadingMsg || "Processing..."}`
                  : !isEngineReady
                    ? "Initializing AI Engine..."
                    : textInput.trim()
                      ? "Ready to generate."
                      : "Enter text above."
              }
              className="grow bg-gray-900/30 border border-gray-800 rounded-lg resize-none text-base text-gray-500 pl-4 pr-32 py-3.5 self-center min-h-[54px] cursor-not-allowed select-none focus:ring-0"
              rows={1}
            />

            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              <Button
                onClick={handleGenerate}
                disabled={!textInput.trim() || isProcessing || !isEngineReady}
                className={`h-9 px-4 rounded-full flex items-center justify-center gap-2 text-white text-xs transition-all shadow-lg ${
                  !textInput.trim() || isProcessing || !isEngineReady
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-linear-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"
                }`}
              >
                {isProcessing || (!isEngineReady && textInput.trim()) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Generate"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
