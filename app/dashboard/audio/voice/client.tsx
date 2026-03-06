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
  Cpu,
  User,
  Smile,
  Loader2,
  Download,
  X,
  AlertTriangle,
  AudioLines,
  Play,
  Pause,
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

  // 🌟 NEW: Dynamic Character Limit State
  const [maxChars, setMaxChars] = useState(1000);

  // Worker & Processing State
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Custom Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- Check window size for mobile/desktop limit ---
  useEffect(() => {
    const handleResize = () => {
      // 500 for mobile, 1000 for desktop
      setMaxChars(window.innerWidth <= 768 ? 500 : 1000);
    };

    handleResize(); // Check on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Generate Random Waveform once when Audio loads ---
  useEffect(() => {
    if (audioUrl) {
      setWaveform(
        Array.from({ length: 60 }, () => Math.floor(Math.random() * 70) + 30),
      );
    } else {
      setWaveform([]);
    }
  }, [audioUrl]);

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
          if (audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
          }
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

  // --- 2. Audio Player Handlers ---
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // --- 3. Generate Audio Function ---
  const handleGenerate = () => {
    if (!textInput.trim()) return;
    if (!isEngineReady) {
      toast.error("Please wait for the AI engine to finish loading.");
      return;
    }

    setAudioUrl(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    workerRef.current?.postMessage({
      type: "generate",
      text: textInput,
      voice: selectedVoice,
    });
  };

  const clearMedia = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      {/* Hidden Native Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* 🌟 TOP AREA: MAIN BIG PROMPT & PREVIEW 🌟 */}
      <div className="grow overflow-y-auto p-4 md:p-6 pb-40 flex flex-col justify-start min-h-[60vh]">
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-8">
          <div className="flex flex-col items-center justify-center text-center text-gray-600 mt-10 max-w-2xl w-full">
            <AudioLines className="h-16 w-16 mb-4 opacity-30" />
            <h1 className="text-2xl font-semibold mb-2 text-gray-500">
              AI Voice Generator
            </h1>
            <p className="text-gray-500 mb-6">
              Type and generate studio-quality speech.
            </p>

            {/* 🌟 MAIN BIG EDITABLE PROMPT 🌟 */}
            {/* 🌟 MAIN BIG EDITABLE PROMPT 🌟 */}
            <div className="w-full relative shadow-2xl mb-4">
              <Textarea
                placeholder="Enter text to speak..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isProcessing}
                className="w-full bg-slate-900/50 border border-gray-700 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl resize-none text-base text-gray-200 placeholder-gray-600 p-5 h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 shadow-inner"
                maxLength={maxChars}
              />
              <div className="absolute bottom-3 right-4 text-xs font-mono text-gray-500 bg-slate-900/80 px-2 py-1 rounded-md backdrop-blur-sm">
                {textInput.length} / {maxChars}
              </div>
            </div>

            {/* LOCAL PRIVACY BADGE */}
            <div className="p-3 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full max-w-md animate-in fade-in slide-in-from-bottom-2 mx-auto">
              <div className="flex items-center justify-center gap-2 text-teal-300">
                <Cpu className="h-4 w-4" />
                <p className="text-xs font-medium">
                  100% Private • Runs Locally • 150MB Download
                </p>
              </div>
            </div>
          </div>

          {/* 🌟 GRADIO-STYLE AUDIO PLAYER (Minimalist & Transparent) 🌟 */}
          {audioUrl && (
            <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-500 mt-4">
              <div className="relative group rounded-2xl border border-gray-800/60 bg-gray-900/30 backdrop-blur-sm p-5 flex flex-col gap-4">
                {/* Interactive Waveform */}
                <div
                  className="relative w-full h-14 flex items-center gap-[3px] cursor-pointer group/waveform"
                  onClick={(e) => {
                    if (!audioRef.current || !duration) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = clickX / rect.width;
                    const newTime = percentage * duration;
                    audioRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }}
                >
                  {waveform.map((h, i) => {
                    const isActive =
                      duration > 0 &&
                      i / waveform.length <= currentTime / duration;
                    return (
                      <div
                        key={i}
                        style={{ height: `${h}%` }}
                        className={`flex-1 rounded-full transition-colors duration-150 ${
                          isActive
                            ? "bg-gradient-to-t from-teal-500 to-cyan-400"
                            : "bg-gray-800 group-hover/waveform:bg-gray-700"
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Minimalist Controls Row */}
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={togglePlay}
                      className="w-10 h-10 rounded-full bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 transition-all flex items-center justify-center"
                    >
                      {isPlaying ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4 ml-0.5" />
                      )}
                    </button>
                    <span className="text-xs font-mono text-gray-500 font-medium">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-white hover:bg-white/10 transition-colors gap-2 h-9 px-3 rounded-lg"
                    >
                      <a href={audioUrl} download={`ai-voice.wav`}>
                        <Download className="w-4 h-4" /> Save
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={clearMedia}
                      className="text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg w-9 h-9 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
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
      <div className="w-full px-4 pb-4 pt-2 bg-transparent z-10 border-gray-800/50">
        {/* TOP: VOICE SELECTOR */}
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-4xl mx-auto mb-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <Select
              value={selectedVoice}
              onValueChange={setSelectedVoice}
              disabled={isProcessing}
            >
              <SelectTrigger className="bg-transparent border-none text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-auto text-xs pr-2">
                <SelectValue placeholder="Select Voice" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="top"
                style={{ maxHeight: "300px" }}
                className="bg-slate-950 border-white/10 text-gray-300 overflow-y-auto overscroll-contain"
              >
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
                            <Smile className="w-4 h-4 text-pink-400" />
                          ) : (
                            <User className="w-4 h-4 text-blue-400" />
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
        </div>

        {/* BOTTOM: DISABLED STATUS TEXTAREA & GENERATE BUTTON */}
        <div className="relative w-full max-w-4xl mx-auto p-1 rounded-xl flex items-start gap-2">
          <div className="grow relative flex items-center w-full">
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
                    : "bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400"
                }`}
              >
                {isProcessing || (!isEngineReady && textInput.trim()) ? (
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
