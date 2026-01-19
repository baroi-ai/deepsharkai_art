"use client";

import React from "react";
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
import Image from "next/image"; // Better for Next.js

// Paths to icons in public
const APPLE_ICON = "/apple.png";
const ANDROID_ICON = "/android.png";

const DownloadPage = () => {
  const appStoreLink =
    "https://apps.apple.com/us/app/your-app-name/id123456789";
  const googlePlayLink =
    "https://play.google.com/store/apps/details?id=com.yourapp.package";

  // Use a fixed URL for QR or hydration safe check
  const qrCodeUrl = "https://deepsharkai.art/download";

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white overflow-x-hidden">
      <Navbar />
      <div className="absolute inset-0 hero-gradient z-0" />

      <main className="flex-grow flex items-center justify-center px-4 py-12 relative z-10">
        <Card className="w-full max-w-lg bg-slate-900/50 text-white mt-10 mb-10 shadow-lg backdrop-blur-md border border-white/20">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl md:text-3xl font-bold">
              Download DeepShark AI
            </CardTitle>
            <CardDescription className="text-gray-300">
              Take your creativity on the go. Get the mobile app for iOS and
              Android.
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
            <p className="text-sm text-gray-400 -mt-4">
              Scan the QR code with your phone
            </p>

            <div className="relative w-full my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-transparent px-2 text-gray-400">Or</span>
              </div>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a href={appStoreLink} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="w-full h-14 border-white/30 text-white hover:bg-gradient-to-r from-cyan-500 to-teal-500 transition-colors duration-300 flex items-center justify-start px-4"
                >
                  <div className="relative w-6 h-6 mr-3">
                    <Image
                      src={APPLE_ICON}
                      alt="App Store"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-xs">Download on the</p>
                    <p className="text-lg font-semibold leading-tight">
                      App Store
                    </p>
                  </div>
                </Button>
              </a>
              <a
                href={googlePlayLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  className="w-full h-14 border-white/30 text-white hover:bg-gradient-to-r from-cyan-500 to-teal-500 transition-colors duration-300 flex items-center justify-start px-4"
                >
                  <div className="relative w-6 h-6 mr-3">
                    <Image
                      src={ANDROID_ICON}
                      alt="Google Play"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="text-left">
                    <p className="text-xs">GET IT ON</p>
                    <p className="text-lg font-semibold leading-tight">
                      Google Play
                    </p>
                  </div>
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default DownloadPage;
