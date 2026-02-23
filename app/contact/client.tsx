"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, Instagram, Copy, Check, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner"; // Assuming you use Sonner or similar for toasts

const ContactPage = () => {
  const [copied, setCopied] = useState(false);
  const email = "support@deepsharkai.art";

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    toast.success("Email copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-gray-300">
      <Navbar />

      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl translate-y-1/2"></div>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center px-4 py-16 md:py-24 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Get in Touch
          </h1>
          <p className="text-lg text-gray-400">
            Have questions about credits, refunds, or just want to say hi?
            Choose the best way to reach us below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* --- 1. Email Support Card --- */}
          <Card className="bg-slate-900/50 border border-white/10 hover:border-teal-500/50 transition-all group backdrop-blur-md">
            <CardHeader className="space-y-4">
              <div className="h-12 w-12 bg-teal-500/10 rounded-lg flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                <Mail className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white mb-2">
                  Email Support
                </CardTitle>
                <CardDescription className="text-gray-400 mb-6">
                  For account issues, billing questions, or technical support.
                  We usually reply within 24 hours.
                </CardDescription>

                {/* Email Display & Copy Button */}
                <div className="flex items-center gap-2 p-3 bg-black/40 rounded-md border border-white/5">
                  <span className="text-gray-200 flex-grow font-mono text-sm">
                    {email}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:bg-white/10 text-gray-400 hover:text-white"
                    onClick={handleCopyEmail}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="mt-4">
                  <a href={`mailto:${email}`}>
                    <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                      Send Email <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* --- 2. Social / Instagram Card --- */}
          <Card className="bg-slate-900/50 border border-white/10 hover:border-pink-500/50 transition-all group backdrop-blur-md">
            <CardHeader className="space-y-4">
              <div className="h-12 w-12 bg-pink-500/10 rounded-lg flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                <Instagram className="h-6 w-6 text-pink-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white mb-2">
                  Follow on Instagram
                </CardTitle>
                <CardDescription className="text-gray-400 mb-6">
                  Check out the latest AI art generations, feature updates, and
                  behind-the-scenes content.
                </CardDescription>

                <div className="flex items-center gap-2 p-3 bg-black/40 rounded-md border border-white/5 opacity-0 pointer-events-none">
                  {/* Spacer to align heights */}
                  <span className="text-transparent font-mono text-sm">
                    Placeholder
                  </span>
                </div>

                <div className="mt-4">
                  <Link
                    href="https://www.instagram.com/deepsharkai.art/"
                    target="_blank"
                  >
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0">
                      Visit Instagram <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
