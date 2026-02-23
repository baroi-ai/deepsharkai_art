"use client";

import React, { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Mic,
  Volume2,
  StopCircle,
  Sparkles,
  Cpu,
  User, // For Male icon
  Smile, // For Female icon
} from "lucide-react";
import { toast } from "sonner";

const defaultText =
  "Life is like a box of chocolates. You never know what you're gonna get.";

export default function VoiceGenerationPage() {
  // --- State ---
  const [textInput, setTextInput] = useState(defaultText);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [supported, setSupported] = useState(true);

  // --- 1. Load System Voices ---
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      if (allVoices.length > 0) {
        // Filter for English voices (or remove filter to see all)
        const englishVoices = allVoices.filter((v) => v.lang.startsWith("en"));
        // Sort: Default voices first, then alphabetical
        englishVoices.sort((a, b) => (a.default ? -1 : 1));

        setVoices(englishVoices);

        // Auto-select the first voice if none selected
        if (!selectedVoiceURI && englishVoices.length > 0) {
          setSelectedVoiceURI(englishVoices[0].voiceURI);
        }
      }
    };

    loadVoices();
    // Chrome needs this listener to load voices asynchronously
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.cancel(); // Stop speech on unmount
    };
  }, []);

  // --- 2. Speak Function ---
  const handleSpeak = () => {
    if (!textInput.trim()) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(textInput);

    // Find the selected voice object
    const voice = voices.find((v) => v.voiceURI === selectedVoiceURI);
    if (voice) utterance.voice = voice;

    // Optional: Tweak Speed/Pitch
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Events
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error("Speech Error:", e);
      setIsSpeaking(false);
      toast.error("Audio playback failed.");
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- Helper to guess gender icon (System voices don't strictly provide gender) ---
  const getVoiceIcon = (name: string) => {
    if (
      name.includes("Female") ||
      name.includes("Samantha") ||
      name.includes("Google US English")
    )
      return <Smile className="w-3 h-3 text-pink-400" />;
    if (
      name.includes("Male") ||
      name.includes("Daniel") ||
      name.includes("Google UK English Male")
    )
      return <User className="w-3 h-3 text-blue-400" />;
    return <Mic className="w-3 h-3 text-gray-400" />;
  };

  if (!supported) {
    return (
      <div className="p-8 text-center text-red-400">
        Your browser does not support Text-to-Speech.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="flex-grow overflow-y-auto p-6 flex flex-col items-center justify-center relative">
        <div className="relative w-full max-w-4xl mx-auto flex flex-col gap-6">
          {/* TEXT INPUT AREA */}
          <div className="relative">
            <Textarea
              placeholder="Enter text to speak..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              rows={8}
              className="w-full bg-slate-900/50 border border-gray-700 focus:border-cyan-500 focus:ring-0 rounded-lg resize-y text-base text-gray-200 placeholder-gray-500 pl-4 pr-4 py-4 min-h-[200px]"
              maxLength={5000}
            />
          </div>

          {/* CONTROLS ROW */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-white/10">
            {/* Voice Selector */}
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                Select Voice
              </span>
              <Select
                value={selectedVoiceURI}
                onValueChange={setSelectedVoiceURI}
              >
                <SelectTrigger className="w-full md:w-[280px] bg-gray-800 border-gray-700 text-gray-200 h-10">
                  <SelectValue placeholder="Loading voices..." />
                </SelectTrigger>
                <SelectContent className="bg-gray-900 border-gray-700 text-gray-300 max-h-[300px]">
                  {voices.map((voice) => (
                    <SelectItem
                      key={voice.voiceURI}
                      value={voice.voiceURI}
                      className="focus:bg-gray-800 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {getVoiceIcon(voice.name)}
                        <span className="truncate max-w-[200px]">
                          {voice.name}
                        </span>
                        {voice.default && (
                          <span className="text-[10px] bg-teal-900 text-teal-300 px-1.5 rounded ml-auto">
                            Default
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Play/Stop Buttons */}
            <div className="flex gap-3 w-full md:w-auto">
              {isSpeaking ? (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="w-full md:w-auto h-10 gap-2 shadow-lg shadow-red-900/20"
                >
                  <StopCircle className="w-4 h-4" /> Stop
                </Button>
              ) : (
                <Button
                  onClick={handleSpeak}
                  className="w-full md:w-auto h-10 gap-2 bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white shadow-lg shadow-cyan-500/20"
                >
                  <Volume2 className="w-4 h-4" /> Speak Now
                </Button>
              )}
            </div>
          </div>

          {/* ✅ TEAL INFO BOX (Updated) */}
          <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-lg w-full animate-in fade-in slide-in-from-bottom-2">
            <div className="space-y-1 text-center">
              <div className="flex items-center justify-center gap-2 text-teal-300">
                <Cpu className="h-5 w-5" />
                <p className="text-sm font-medium">Running Locally (Native)</p>
              </div>
              <p className="text-xs text-teal-200/70 leading-relaxed">
                Uses your device's built-in Text-to-Speech engine. Zero download
                required. Instant playback.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
