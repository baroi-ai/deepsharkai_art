"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import QRCode from "react-qr-code";
import { Download, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner"; // Assuming you have sonner installed from your other pages

const DownloadPage = () => {
  // Use a fixed URL for QR
  const qrCodeUrl = "https://deepsharkai.art";

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if the app is already installed and running in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Capture the native install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile automatically
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success("DeepShark AI successfully installed!");
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback message for iOS Safari or browsers where the prompt isn't supported/available
      toast.info(
        "To install on iOS: Tap the 'Share' icon at the bottom of Safari, then select 'Add to Home Screen'.",
      );
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    } else {
      console.log("User dismissed the install prompt");
    }

    // We can't use the prompt again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <Navbar />
      <div className="absolute inset-0 hero-gradient z-0" />

      <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
        <Card className="w-full max-w-lg bg-slate-900/50 text-white mt-10 mb-10 shadow-lg backdrop-blur-md border border-white/20">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold">
              Install DeepShark AI
            </CardTitle>
            <CardDescription className="text-gray-300">
              Take your creativity on the go. Install our lightweight app
              directly to your device.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-8 pt-4">
            <div className="p-4 bg-white rounded-lg shadow-lg">
              <QRCode
                value={qrCodeUrl}
                size={160}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            <p className="text-sm text-gray-400 -mt-4 text-center">
              Scan with your phone to open the app, <br />
              then tap install!
            </p>

            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-900/80 px-2 text-gray-400 backdrop-blur-sm">
                  Quick Install
                </span>
              </div>
            </div>

            <div className="w-full">
              {isInstalled ? (
                <Button
                  variant="outline"
                  disabled
                  className="w-full h-14 border-white/10 text-gray-400 bg-white/5 flex items-center justify-center px-4"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2 text-teal-500" />
                  <span className="text-lg font-semibold">App Installed</span>
                </Button>
              ) : (
                <Button
                  onClick={handleInstallClick}
                  variant="outline"
                  className="w-full h-14 border-white/30 text-white hover:bg-gradient-to-r from-cyan-500 to-teal-500 transition-colors duration-300 flex items-center justify-center px-4"
                >
                  <MonitorSmartphone className="w-6 h-6 mr-3" />
                  <div className="text-left flex flex-col justify-center">
                    <p className="text-lg font-semibold leading-tight">
                      Install Desktop / Mobile App
                    </p>
                  </div>
                </Button>
              )}
            </div>

            <p className="text-[10px] text-gray-500 text-center max-w-[80%] -mt-4">
              Works on Windows, macOS, Android, and iOS.
              <br />
              iOS users: Use Safari's "Share" menu to install.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

// Assuming you don't have this icon imported yet, you can use Lucide
function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default DownloadPage;
