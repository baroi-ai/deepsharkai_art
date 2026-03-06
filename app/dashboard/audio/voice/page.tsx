import { Metadata } from "next";
// ✅ 1. Rename import to avoid the TypeScript naming conflict
import nextDynamic from "next/dynamic";
import { Loader2, AudioLines } from "lucide-react";

// ✅ 2. THE MAGIC BULLET: Skip static rendering to fix the useSearchParams error
export const dynamic = "force-dynamic";

// ✅ Use nextDynamic here
const VoiceGenerationClient = nextDynamic(() => import("./client"), {
  loading: () => (
    <div className="flex h-[80vh] items-center justify-center text-teal-500">
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex items-center justify-center w-16 h-16">
          <Loader2 className="absolute w-full h-full animate-spin opacity-20" />
          <AudioLines className="w-8 h-8 animate-pulse" />
        </div>
        <p className="text-gray-400 text-sm animate-pulse">
          Loading AI Voice Engine...
        </p>
      </div>
    </div>
  ),
});

export const metadata: Metadata = {
  metadataBase: new URL("https://deepsharkai.art"),
  title: "Free AI Voice Generator | Studio-Quality Text to Speech",
  description:
    "Generate realistic, studio-quality AI voiceovers locally in your browser for free. 100% private text-to-speech with multiple languages, accents, and realistic tones.",
  keywords: [
    "free ai voice generator",
    "free text to speech",
    "free tts",
    "local ai voice",
    "ai voiceover",
    "multilingual text to speech",
    "browser tts",
    "private ai voice",
  ],
  openGraph: {
    title: "Free AI Voice Generator | DeepShark AI",
    description:
      "Generate ultra-realistic AI voiceovers entirely privately and for free in your browser.",
    images: ["/og-image.png"],
  },
};

export default function Page() {
  return <VoiceGenerationClient />;
}
