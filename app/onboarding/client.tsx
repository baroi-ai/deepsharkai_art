"use client";

import React, { useState } from "react";
import { completeOnboarding } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Wand2,
  Rocket,
  Palette,
  MonitorPlay,
  Briefcase,
  Smile,
  Zap,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// 🌟 FIX: Accept the userName prop from the server, and remove useSession entirely!
export default function OnboardingClient({ userName }: { userName: string }) {
  const router = useRouter();

  // State for step-by-step progression
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State to hold answers
  const [answers, setAnswers] = useState({
    useCase: "",
    tool: "",
    goal: "",
  });

  // Handle Answer Selection
  const handleSelect = (field: keyof typeof answers, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  // Handle Next Button
  const handleNext = () => {
    if (step === 1 && !answers.useCase)
      return toast.error("Please select an option.");
    if (step === 2 && !answers.tool)
      return toast.error("Please select an option.");
    setStep((prev) => prev + 1);
  };

  // Handle Final Submit
  const handleSubmit = async () => {
    if (!answers.goal) return toast.error("Please select an option.");

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("useCase", answers.useCase);
      formData.append("tool", answers.tool);
      formData.append("goal", answers.goal);

      // Wait for the DB update to finish
      await completeOnboarding(formData);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
      setIsSubmitting(false); // Only stop loading if there's a REAL error
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 py-12 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-xl w-full bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative z-10 flex flex-col min-h-[500px] animate-in fade-in zoom-in-95 duration-500">
        {/* Progress Bar */}
        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mb-8">
          <div
            className="bg-teal-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 bg-teal-500/20 rounded-full flex items-center justify-center border border-teal-500/30">
            <Sparkles className="h-6 w-6 text-teal-400" />
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
          {step === 1 && "Welcome to DeepShark AI"}
          {step === 2 && "Your Creative Arsenal"}
          {step === 3 && "Set Your Objective"}
        </h1>
        <p className="text-gray-400 text-center mb-8 text-sm md:text-base">
          {step === 1 && `Hey ${userName}, let's customize your workspace.`}
          {step === 2 && "What platforms are you already comfortable with?"}
          {step === 3 && "Almost done. How will you use DeepShark today?"}
        </p>

        {/* --- STEP 1: Use Case --- */}
        {step === 1 && (
          <div
            key="step-1" /* 🦈 FIX: Added Key */
            className="space-y-4 flex-grow animate-in slide-in-from-right-4 fade-in duration-300"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "marketing", label: "Marketing", icon: Rocket },
                { value: "art", label: "Concept Art", icon: Wand2 },
                { value: "social", label: "Social Media", icon: MonitorPlay },
                { value: "design", label: "Web/UI Design", icon: Palette },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleSelect("useCase", item.value)}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
                    answers.useCase === item.value
                      ? "border-teal-500 bg-teal-500/10 text-teal-400 scale-[1.02]"
                      : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- STEP 2: Tools --- */}
        {step === 2 && (
          <div
            key="step-2" /* 🦈 FIX: Added Key */
            className="space-y-4 flex-grow animate-in slide-in-from-right-4 fade-in duration-300"
          >
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "image-gen", label: "Image Generation" },
                { value: "layer-extraction", label: "Layer Extraction" },
                { value: "motion-generation", label: "Motion Generation" },
                { value: "none", label: "I'm new to AI art" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleSelect("tool", item.value)}
                  className={`p-4 rounded-xl border flex items-center justify-center transition-all min-h-[80px] ${
                    answers.tool === item.value
                      ? "border-teal-500 bg-teal-500/10 text-teal-400 scale-[1.02]"
                      : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <span className="text-sm font-medium text-center">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* --- STEP 3: Goal --- */}
        {step === 3 && (
          <div
            key="step-3" /* 🦈 FIX: Added Key */
            className="space-y-4 flex-grow animate-in slide-in-from-right-4 fade-in duration-300"
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: "professional",
                  label: "Professional Work",
                  icon: Briefcase,
                },
                { value: "hobby", label: "Just for Fun", icon: Smile },
                { value: "explore", label: "Testing Features", icon: Zap },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleSelect("goal", item.value)}
                  className={`p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    answers.goal === item.value
                      ? "border-teal-500 bg-teal-500/10 text-teal-400 scale-[1.02]"
                      : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm md:text-base font-medium">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
          {step > 1 && (
            <Button
              variant="ghost"
              onClick={() => setStep((prev) => prev - 1)}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-white"
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              onClick={handleNext}
              className="flex-1 bg-white text-slate-950 hover:bg-gray-200 font-bold"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all hover:scale-[1.02]"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Enter DeepShark"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
