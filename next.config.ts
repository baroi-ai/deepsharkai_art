import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🌟 Keeps backend AI logic from trying to bundle into the frontend
  serverExternalPackages: ["onnxruntime-node", "kokoro-js"],

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
            // ✅ Keeps external images working while allowing high-performance memory use
            value: "credentialless",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.fal.media" },
      { protocol: "https", hostname: "fal.media" },
      { protocol: "https", hostname: "*.r2.dev" },
      {
        protocol: "https",
        hostname: "pub-cb6f9d8e855b451ba6a53277e60b1374.r2.dev",
      },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "googleusercontent.com" },
      { protocol: "https", hostname: "staticimgly.com" },
    ],
  },

  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // ✅ Stops frontend from trying to load node-only packages
        sharp$: false,
        "onnxruntime-node$": false,
      };
    }

    // 🌟 Fixes "Unexpected character" errors for AI binaries
    config.module.rules.push({
      test: /\.node$/,
      type: "asset/resource",
    });

    config.plugins.push(
      new webpack.DefinePlugin({
        // ✅ Cleaned up: Removed unnecessary FFMPEG defines since you uninstalled it
        ...(isServer ? {} : { "process.env": "{}" }),
      }),
    );

    return config;
  },
};

export default nextConfig;
