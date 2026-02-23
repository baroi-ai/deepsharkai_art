import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { AuthModal } from "@/components/AuthModal"; // ✅ Import AuthModal
import { Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#020617", // slate-950
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Crucial: Prevents zooming on mobile inputs
  userScalable: false,
};

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sharky AI",
  description: "All in one Open-Source AI Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster position="top-center" theme="dark" richColors />

          {/* ✅ GLOBAL LISTENER: Handles ?openLogin=true */}
          {/* Hidden, only works via URL params */}
          <div className="hidden">
            <AuthModal allowUrlControl={true} />
          </div>
        </Providers>
      </body>
    </html>
  );
}
