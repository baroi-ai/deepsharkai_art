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
  Image as ImageIcon,
  Video,
  AudioLines,
  ShoppingBag,
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
            Empowering creativity through accessible, powerful, cloud-based AI
            generation tools. No installs, no limits, just pure creation.
          </p>
        </div>
        <div className="w-full max-w-4xl mx-auto bg-transparent backdrop-blur-md border border-white/15 rounded-lg p-6 md:p-8 mb-12 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-center text-teal-400">
            Our Mission
          </h2>
          <p className="text-gray-200 text-center md:text-lg">
            We believe that the power of artificial intelligence to create
            stunning digital content should be available to everyone. DeepShark
            AI was built to break down barriers – eliminating the need for
            expensive hardware, complex software installations, and restrictive
            subscriptions. Our mission is to provide an intuitive, powerful, and
            flexible platform where your imagination is the only limit.
          </p>
        </div>
        <div className="w-full max-w-5xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-10">
            What You Can Create
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <FeatureCard
              icon={ImageIcon}
              title="AI Image Generation"
              description="Bring your wildest ideas to life with photorealistic or stylized images from text prompts."
            />
            <FeatureCard
              icon={ImageIcon}
              title="AI Image Editing"
              description="Edit existing images with AI-powered tools to enhance, modify, or completely transform visuals."
            />
            <FeatureCard
              icon={AudioLines}
              title="Realistic Voice Cloning"
              description="Clone voices with remarkable accuracy from short audio samples for various applications."
            />
            <FeatureCard
              icon={Video}
              title="AI Video Creation"
              description="Generate short video clips from text or animate still images with incredible motion."
            />
          </div>
        </div>
        <div className="w-full max-w-4xl mx-auto mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-10">
            Why Choose DeepShark AI?
          </h2>
          <div className="space-y-6">
            <BenefitItem
              icon={Cloud}
              title="Purely Cloud-Based"
              description="Access powerful AI from any device with an internet connection. No downloads, no installations, no hardware limitations."
            />
            <BenefitItem
              icon={DollarSign}
              title="Pay As You Use"
              description="Our flexible coin system means you only pay for the resources you consume. Perfect for projects big and small, without hefty upfront costs."
            />
            <BenefitItem
              icon={Zap}
              title="Intuitive & Fast"
              description="We focus on a clean, user-friendly interface so you can start creating in minutes, not hours. Get high-quality results quickly."
            />
            <BenefitItem
              icon={Cpu}
              title="Cutting-Edge AI"
              description="We integrate state-of-the-art open-source and proprietary AI models, constantly updated to provide the best possible generation quality."
            />
          </div>
        </div>
        <div className="w-full max-w-4xl mx-auto bg-transparent backdrop-blur-md border border-white/15 rounded-lg p-6 md:p-8 mb-12 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-center text-teal-400">
            Always Evolving
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0 grid grid-cols-2 gap-4">
              <ShoppingBag className="h-10 w-10 text-teal-400 opacity-70" />
              <Smile className="h-10 w-10 text-teal-400 opacity-70" />
            </div>
            <p className="text-gray-200 md:text-lg text-center md:text-left">
              DeepShark AI is constantly growing. Our dedicated team is hard at
              work developing exciting new features. Soon, you'll be able to
              explore{" "}
              <span className="font-medium text-teal-400">Virtual Try-On</span>{" "}
              capabilities, experiment with advanced{" "}
              <span className="font-medium text-teal-400">Face Swapping</span>{" "}
              tools, and much more – all delivered through our seamless cloud
              platform. Stay tuned!
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
