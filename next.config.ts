import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["deepsharkai.art", "www.deepsharkai.art"],
    },
  },

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

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "deepshark",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
