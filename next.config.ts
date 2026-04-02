import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Removed skipWaiting to fix the TypeScript error
  workboxOptions: {
    skipWaiting: true, // If you really want it, it goes inside workboxOptions
  },
});
const nextConfig: NextConfig = {
  // 🌟 NEW: Tell Next.js not to bundle these backend native modules
  serverExternalPackages: ["onnxruntime-node", "kokoro-js"],

  // ✅ REQUIRED FOR FFMPEG: Browser security headers for memory allocation
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            // ✅ FIX: Changed from "require-corp" to "credentialless"
            // This lets FFMPEG run fast locally, while allowing external images to load!
            value: "credentialless",
          },
        ],
      },
    ];
  },

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

  // ✅ Grab `webpack` directly from the Next.js options argument!
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        sharp$: false,
        "onnxruntime-node$": false,
        "onnxruntime-node": false,
      };
    }

    // 🌟 NEW: Tell Webpack to treat .node C++ binaries as static assets
    // This stops the "Unexpected character ''" error completely
    config.module.rules.push({
      test: /\.node$/,
      type: "asset/resource",
    });

    // ✅ Use the Next.js provided webpack instance
    config.plugins.push(
      new webpack.DefinePlugin({
        "process.env.FLUENTFFMPEG_COV": JSON.stringify(false),
        ...(isServer ? {} : { "process.env": "{}" }),
      }),
    );

    return config;
  },
};

//export default nextConfig;
export default withPWA(nextConfig);
