"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Sparkles,
  Cloud,
  Cpu,
  Layers,
  Wand2,
  Maximize,
  Eraser,
  Smile,
  DollarSign,
  Zap,
} from "lucide-react";

const AboutContent = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <Navbar />

      <div className="absolute inset-0 hero-gradient z-0"></div>

      <main className="flex-grow flex flex-col items-center px-4 pt-24 pb-16 relative z-10">
        <div className="text-center mb-12 md:mb-16 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Sparkles className="h-10 w-10 text-teal-400 inline-block" />
            About DeepShark AI
          </h1>
          <p className="text-lg md:text-xl text-gray-300">
            The ultimate AI Image Studio. Turn flat images into editable layers,
            generate stunning art, and upscale to 4K—all in your browser.
          </p>
        </div>

        <div className="w-full max-w-4xl mx-auto bg-transparent backdrop-blur-md border border-white/15 rounded-lg p-6 md:p-8 mb-12 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-center text-teal-400">
            Our Mission
          </h2>
          <p className="text-gray-200 text-center md:text-lg">
            We believe standard AI image generators aren't enough—creators need
            actual control. DeepShark AI was built to break the boundaries of
            traditional AI art. By introducing our signature{" "}
            <strong>Image Decomposer</strong> alongside elite generation models,
            we are putting a professional-grade studio directly in your hands.
            No expensive hardware, no restrictive monthly subscriptions, just
            pure, limitless creativity on a fair pay-as-you-go platform.
          </p>
        </div>

        <div className="w-full max-w-5xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-10">
            What You Can Do
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <FeatureCard
              icon={Layers}
              title="Image Decomposer"
              description="Our signature tool. Instantly extract backgrounds, subjects, and foregrounds into movable 3D layers."
            />
            <FeatureCard
              icon={Wand2}
              title="Elite Generation"
              description="Create mind-bending art from text using the world's most powerful, state-of-the-art AI models."
            />
            <FeatureCard
              icon={Maximize}
              title="4K Upscaling"
              description="Take blurry, low-res images and instantly enhance them to crisp, high-definition 4K quality."
            />
            <FeatureCard
              icon={Eraser}
              title="Free Local Tools"
              description="Enjoy unlimited, free access to our client-side Magic Eraser, Background Remover, and more."
            />
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-10">
            Why Choose DeepShark AI?
          </h2>
          <div className="space-y-6">
            <BenefitItem
              icon={DollarSign}
              title="Pay Only For What You Use"
              description="Say goodbye to $20/month subscriptions you barely use. Our coin system means you only pay for the heavy computing power you actually consume."
            />
            <BenefitItem
              icon={Cloud}
              title="100% Cloud-Powered Studio"
              description="Access massive GPU power from any device. Whether you are on a high-end desktop or a smartphone, your render times are lightning fast."
            />
            <BenefitItem
              icon={Zap}
              title="Free Everyday Essentials"
              description="We run tools like Magic Eraser locally on your browser. Because it doesn't cost us server time, we give it to you completely free, forever."
            />
            <BenefitItem
              icon={Cpu}
              title="Access to the Elite Models"
              description="We constantly update our backend with the newest open-source and proprietary models, so you never fall behind the cutting edge of AI."
            />
          </div>
        </div>

        <div className="w-full max-w-4xl mx-auto bg-transparent backdrop-blur-md border border-white/15 rounded-lg p-6 md:p-8 mb-12 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-center text-teal-400">
            Always Evolving
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0 grid grid-cols-2 gap-4">
              <Layers className="h-10 w-10 text-teal-400 opacity-70" />
              <Smile className="h-10 w-10 text-teal-400 opacity-70" />
            </div>
            <p className="text-gray-200 md:text-lg text-center md:text-left">
              DeepShark AI is growing every day. We are constantly experimenting
              with new ways to give you more control over your canvas. Soon,
              you'll be able to explore advanced{" "}
              <span className="font-medium text-teal-400">Face Swapping</span>,
              seamless{" "}
              <span className="font-medium text-teal-400">
                Video Integration
              </span>
              , and even more tools to bridge the gap between AI generation and
              professional graphic design. Stay tuned!
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg text-gray-300 mb-6">
            Ready to bring your ideas to life?
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-medium btn-glow"
            asChild
          >
            <Link href="/dashboard">Start Creating</Link>
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="bg-transparent backdrop-blur-sm border border-white/10 rounded-lg p-5 text-center hover:border-teal-500/50 transition-colors">
    <Icon className="h-10 w-10 text-teal-400 mx-auto mb-4" />
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-300 text-sm">{description}</p>
  </div>
);

const BenefitItem = ({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-4 p-4 bg-transparent backdrop-blur-sm border border-white/10 rounded-lg">
    <Icon className="h-8 w-8 text-teal-400 flex-shrink-0 mt-1" />
    <div>
      <h3 className="text-xl font-semibold mb-1">{title}</h3>
      <p className="text-gray-300">{description}</p>
    </div>
  </div>
);

export default AboutContent;
