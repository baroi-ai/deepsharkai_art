import type { NextConfig } from "next";
import webpack from "webpack";
import withPWAInit from "@ducanh2912/next-pwa";

// ✅ Initialize the PWA wrapper
const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // ❌ swcMinify removed from here!
  disable: process.env.NODE_ENV === "development", // Only runs in production build
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.fal.media", 
      },
      {
        protocol: "https",
        hostname: "fal.media", 
      },
      {
        protocol: "https",
        hostname: "*.r2.dev", 
      },
      {
        protocol: "https",
        hostname: "pub-cb6f9d8e855b451ba6a53277e60b1374.r2.dev", 
      },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "googleusercontent.com" },
      {
        protocol: "https",
        hostname: "staticimgly.com",
      },
    ],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
        "onnxruntime-node$": false,
      };
    }
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.FLUENTFFMPEG_COV": JSON.stringify(false),
        ...(isServer ? {} : { "process.env": "{}" }),
      }),
    );
    return config;
  },
};

// ✅ Export the config wrapped in the PWA initializer
export default withPWA(nextConfig);