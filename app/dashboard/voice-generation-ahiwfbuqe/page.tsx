"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Mic,
  AlertCircle,
  Loader2,
  Download,
  TrendingUp,
  Sparkles,
  User as UserIconLucide,
  Smile as WomanIconLucide,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";

// ✅ 1. Import Auth Hook & Modal
import { useSession } from "next-auth/react";
import { AuthModal } from "@/components/AuthModal";

// --- Type Definitions ---
interface TtsVoice {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  engineId: string;
}

interface GenerationJob {
  id: string;
  status: "processing" | "completed" | "failed";
  url: string | null;
}

// --- Configuration Data ---
const availableTtsVoices: TtsVoice[] = [
  {
    id: "Wise_Woman",
    name: "Wise Woman",
    gender: "female",
    engineId: "minimax/speech-02-hd",
  },
  {
    id: "Friendly_Person",
    name: "Friendly Person",
    gender: "neutral",
    engineId: "minimax/speech-02-hd",
  },
  {
    id: "Inspirational_girl",
    name: "Inspirational Girl",
    gender: "female",
    engineId: "minimax/speech-02-hd",
  },
  {
    id: "Deep_Voice_Man",
    name: "Deep Voice Man",
    gender: "male",
    engineId: "minimax/speech-02-hd",
  },
  {
    id: "Calm_Woman",
    name: "Calm Woman",
    gender: "female",
    engineId: "minimax/speech-02-hd",
  },
  {
    id: "Casual_Guy",
    name: "Casual Guy",
    gender: "male",
    engineId: "minimax/speech-02-hd",
  },
  {
    id: "Lively_Girl",
    name: "Lively Girl",
    gender: "female",
    engineId: "minimax/speech-02-hd",
  },
  {
    id: "Patient_Man",
    name: "Patient Man",
    gender: "male",
    engineId: "minimax/speech-02-hd",
  },
];

const COINS_PER_1000_CHARS_TTS = 5;
const COINS_PER_1000_CHARS_CLONE = 15;

const defaultVoiceSettings = {
  generationMode: "tts" as "tts" | "clone",
  textInput: "",
  selectedTtsVoice: availableTtsVoices[0]?.id || "",
  selectedClonedVoice: "",
  speechRate: [1.0],
  pitch: [0],
};

const VoiceGenerationPage = () => {
  // ✅ 2. Auth State
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [generationMode, setGenerationMode] = useState<"tts" | "clone">(
    defaultVoiceSettings.generationMode
  );
  const [textInput, setTextInput] = useState(defaultVoiceSettings.textInput);
  const [selectedTtsVoice, setSelectedTtsVoice] = useState(
    defaultVoiceSettings.selectedTtsVoice
  );
  const [selectedClonedVoice, setSelectedClonedVoice] = useState(
    defaultVoiceSettings.selectedClonedVoice
  );
  const [speechRate, setSpeechRate] = useState<number[]>(
    defaultVoiceSettings.speechRate
  );
  const [pitch, setPitch] = useState<number[]>(defaultVoiceSettings.pitch);

  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentRate = useMemo(() => speechRate[0] ?? 1.0, [speechRate]);
  const currentPitch = useMemo(() => pitch[0] ?? 0.0, [pitch]);

  const calculateCost = useCallback(() => {
    const charCount = textInput.trim().length;
    if (charCount === 0) return 0;
    const costPer1000Chars =
      generationMode === "clone"
        ? COINS_PER_1000_CHARS_CLONE
        : COINS_PER_1000_CHARS_TTS;
    return Math.max(1, Math.ceil(charCount / 1000) * costPer1000Chars);
  }, [textInput, generationMode]);

  const estimatedCost = calculateCost();

  const canGenerate = useMemo(() => {
    const hasText = textInput.trim().length > 0;
    const hasSelection =
      (generationMode === "tts" && !!selectedTtsVoice) ||
      (generationMode === "clone" && !!selectedClonedVoice);

    if (!hasText || !hasSelection || isLoading) return false;
    return true;
  }, [
    textInput,
    generationMode,
    selectedTtsVoice,
    selectedClonedVoice,
    isLoading,
  ]);

  // --- GENERATE FUNCTION ---
  const handleGenerate = async () => {
    // ✅ 3. Check Auth before generating
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!canGenerate) return;

    setIsLoading(true);
    setActiveJob({ id: "temp-id", status: "processing", url: null });
    toast.success("Speech generation started! (Demo)");

    setTimeout(() => {
      const dummyJobId = `job-${Date.now()}`;
      const newJob: GenerationJob = {
        id: dummyJobId,
        status: "completed",
        url: "https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav",
      };

      setActiveJob(newJob);
      setIsLoading(false);
      toast.success("Speech generated successfully!");
    }, 3000);
  };

  const renderGenderIcon = (gender: "male" | "female" | "neutral") => {
    switch (gender) {
      case "male":
        return <UserIconLucide className="w-3.5 h-3.5 text-blue-400" />;
      case "female":
        return <WomanIconLucide className="w-3.5 h-3.5 text-pink-400" />;
      default:
        return <Mic className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full text-gray-300">
      <div className="flex-grow overflow-y-auto p-6 flex flex-col items-center justify-center relative">
        <div className="relative w-full max-w-4xl mx-auto">
          <Textarea
            id="text-input"
            placeholder="Enter text to synthesize (up to 5000 characters)..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            rows={8}
            className="w-full bg-transparent border border-gray-700 focus:border-cyan-500 focus:ring-0 rounded-lg resize-y text-base text-gray-200 placeholder-gray-500 pl-4 pr-36 py-3 min-h-[250px]"
            disabled={isLoading}
            maxLength={5000}
          />
          <div className="absolute right-3 top-3 flex flex-col items-end space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate && isAuthenticated} // Only disable if logged in but input invalid
              className={`h-9 px-3 rounded-full flex items-center gap-1.5 text-xs ${
                !canGenerate && isAuthenticated
                  ? "bg-gray-600 cursor-not-allowed opacity-70"
                  : "bg-gradient-to-br from-cyan-500 to-teal-400 hover:from-cyan-600 hover:to-teal-600 shadow-lg"
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium whitespace-nowrap">
                    <span className="hidden sm:inline">
                      {/* ✅ Always show cost if > 0 */}
                      {estimatedCost > 0
                        ? `Generate (${estimatedCost} Credits)`
                        : "Generate"}
                    </span>
                    <span className="sm:hidden">
                      {estimatedCost > 0 ? `${estimatedCost} Cr` : "Go"}
                    </span>
                  </span>
                </>
              )}
            </Button>
            <div className="text-xs text-gray-500 pr-1">
              {textInput.trim().length} / 5000
            </div>
          </div>
        </div>

        {activeJob?.status === "failed" && (
          <div className="mt-4 w-full max-w-3xl">
            <Alert
              variant="destructive"
              className="bg-red-900/50 border-red-700 text-red-200"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Generating Speech</AlertTitle>
              <AlertDescription>
                The process failed. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 text-xs max-w-4xl mx-auto">
          <RadioGroup
            value={generationMode}
            className="flex space-x-3 items-center"
            onValueChange={(value) =>
              setGenerationMode(value as "tts" | "clone")
            }
            aria-label="Generation Mode"
          >
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem
                value="tts"
                id="mode-tts"
                className="h-3 w-3 border-gray-600 text-cyan-500"
                disabled={isLoading}
              />
              <Label
                htmlFor="mode-tts"
                className="flex items-center gap-1 text-gray-400 hover:text-gray-200 cursor-pointer"
              >
                <Mic className="h-3.5 w-3.5" /> TTS
              </Label>
            </div>
            <div className="flex items-center space-x-1.5">
              <RadioGroupItem
                value="clone"
                id="mode-clone"
                className="h-3 w-3 border-gray-600 text-cyan-500"
                disabled={true}
              />
              <Label
                htmlFor="mode-clone"
                className="flex items-center gap-1 text-gray-500 cursor-not-allowed"
              >
                <UserIconLucide className="h-3.5 w-3.5" /> Clone
              </Label>
            </div>
          </RadioGroup>
          {generationMode === "tts" && (
            <div className="flex items-center gap-1 sm:gap-2">
              <Select
                value={selectedTtsVoice}
                onValueChange={setSelectedTtsVoice}
                disabled={isLoading}
              >
                <SelectTrigger className="bg-transparent border border-white/10 text-gray-400 hover:text-gray-200 focus:ring-0 p-0 h-8 text-xs pr-2 min-w-[180px] px-3 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <SelectValue placeholder="Select TTS voice" />
                  </div>
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="top"
                  align="center"
                  className="bg-slate-950 border border-white/10 text-gray-300 max-h-60"
                >
                  {availableTtsVoices.map((voice) => (
                    <SelectItem
                      key={voice.id}
                      value={voice.id}
                      className="focus:bg-gray-800 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {renderGenderIcon(voice.gender)}
                        <span>{voice.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2 min-w-[130px]">
            <Gauge className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <Slider
              id="speech-rate"
              min={0.5}
              max={2.0}
              step={0.1}
              value={speechRate}
              onValueChange={setSpeechRate}
              disabled={isLoading}
              className="[&>span:first-child]:h-0.5 [&>span>span]:h-0.5 [&>span>span]:bg-cyan-500 [&>span]:bg-gray-700 [&_button]:h-2.5 [&_button]:w-2.5"
            />
            <span className="text-gray-400 w-8 text-right tabular-nums">
              {currentRate.toFixed(1)}x
            </span>
          </div>
          <div className="flex items-center gap-2 min-w-[130px]">
            <TrendingUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <Slider
              id="speech-pitch"
              min={-10}
              max={10}
              step={0.5}
              value={pitch}
              onValueChange={setPitch}
              disabled={isLoading}
              className="[&>span:first-child]:h-0.5 [&>span>span]:h-0.5 [&>span>span]:bg-cyan-500 [&>span]:bg-gray-700 [&_button]:h-2.5 [&_button]:w-2.5"
            />
            <span className="text-gray-400 w-9 text-right tabular-nums">
              {currentPitch > 0 ? "+" : ""}
              {currentPitch.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 w-full px-4 pt-4 pb-6">
        {isLoading && activeJob?.status === "processing" && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500 mb-2" />
            <span className="text-sm text-gray-400">Synthesizing audio...</span>
          </div>
        )}
        {activeJob?.status === "completed" && activeJob.url && (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-4">
            <audio
              key={activeJob.url}
              controls
              className="w-full rounded-lg"
              preload="metadata"
            >
              <source src={activeJob.url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-600"
              asChild
            >
              <a
                href={activeJob.url}
                download={`sharky_ai_speech_${Date.now()}.mp3`}
              >
                <Download className="mr-2 h-4 w-4" /> Download Audio
              </a>
            </Button>
          </div>
        )}
      </div>

      {/* ✅ 4. Modal Component */}
      <AuthModal
        open={isAuthModalOpen}
        onOpenChange={setIsAuthModalOpen}
        defaultTab="login"
      />
    </div>
  );
};

export default VoiceGenerationPage;
