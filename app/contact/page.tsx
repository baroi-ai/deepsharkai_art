"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, AlertTriangle, Mail } from "lucide-react";

type FormState = {
  status: "idle" | "loading" | "success" | "error";
  message: string | null;
};

const ContactPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>({
    status: "idle",
    message: null,
  });

  // Use NEXT_PUBLIC_ for client-side env variables
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormState({ status: "loading", message: null });

    const url = API_BASE_URL ? `${API_BASE_URL}/api/contact` : "/api/contact";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      setFormState({
        status: "success",
        message: "Thank you! Your message has been sent successfully.",
      });
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error: any) {
      console.error("Submission failed:", error);
      setFormState({
        status: "error",
        message:
          error.message || "Failed to send message. Please try again later.",
      });
    }
  };

  if (formState.status === "success") {
    return (
      <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-x-hidden">
        <Navbar />
        <div className="absolute inset-0 hero-gradient z-0"></div>
        <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
          <Card className="w-full max-w-lg bg-slate-900/50 text-white mt-10 mb-10 shadow-lg backdrop-blur-md border border-green-500/50">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Message Sent!</h2>
              <p className="text-gray-300">{formState.message}</p>
              <Button
                onClick={() => setFormState({ status: "idle", message: null })}
                className="mt-6 bg-teal-600 hover:bg-teal-700"
              >
                Send Another Message
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <Navbar />
      <div className="absolute inset-0 hero-gradient z-0"></div>
      <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
        <Card className="w-full max-w-lg bg-slate-900/50 text-white mt-10 mb-10 shadow-lg backdrop-blur-md border border-white/20">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Contact Us</CardTitle>
            <CardDescription className="text-gray-300">
              Have a question or want to get in touch? Fill out the form below.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your Name"
                    required
                    className="bg-black/30 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-teal-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={formState.status === "loading"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    required
                    className="bg-black/30 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-teal-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={formState.status === "loading"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  type="text"
                  placeholder="Regarding..."
                  required
                  className="bg-black/30 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-teal-500"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={formState.status === "loading"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  required
                  rows={5}
                  className="bg-black/30 border-white/20 text-white placeholder:text-gray-400 focus-visible:ring-teal-500 min-h-[100px]"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={formState.status === "loading"}
                />
              </div>
            </CardContent>

            <CardFooter className="flex-col items-center pt-2 mt-4">
              <Button
                type="submit"
                disabled={formState.status === "loading"}
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-black font-semibold"
              >
                {formState.status === "loading" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Message"
                )}
              </Button>

              {formState.status === "error" && (
                <div className="mt-4 text-sm text-red-400 flex items-center gap-2 self-start">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{formState.message}</span>
                </div>
              )}

              <div className="relative w-full my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-gray-400">Or</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-300">
                <p>You can also email us directly at:</p>
                <a
                  href="mailto:support@deepsharkai.art"
                  className="mt-1 inline-flex items-center gap-2 font-semibold text-teal-400 hover:text-teal-300 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  support@deepsharkai.art
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
