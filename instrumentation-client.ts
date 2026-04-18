// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Your existing DSN
  dsn: "https://14787c621c7ed6fd7cc120c48965c5b0@o4511168702054400.ingest.de.sentry.io/4511168703365200",

  // 🛡️ SHARK FIREWALL 1: Only run in production so localhost doesn't drain your quota
  enabled: process.env.NODE_ENV === "production",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // 🛡️ SHARK FIREWALL 2: Lowered to 10% (0.1) to save your 5M span quota.
  // 1.0 would capture everything and drain your account instantly.
  tracesSampleRate: 0.1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // 🛡️ SHARK FIREWALL 3: Lowered to 1% to save your 50 free replays per month.
  replaysSessionSampleRate: 0.01,

  // Define how likely Replay events are sampled when an error occurs.
  // Kept at 100% so if a REAL crash happens, you always get the video.
  replaysOnErrorSampleRate: 1.0,

  // 🛡️ SHARK FIREWALL 4: Block harmless browser translation and rendering noise
  ignoreErrors: [
    "Failed to fetch",
    "NetworkError when attempting to fetch resource.",
    "AbortError: signal is aborted without reason",
    "Failed to execute 'removeChild' on 'Node'",
    "NotFoundError: Failed to execute 'removeChild' on 'Node'",
    "Hydration failed",
    "There was an error while hydrating",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications.",
    "NotAllowedError",
    "The play() request was interrupted",
  ],

  // 🛡️ SHARK FIREWALL 5: Block all Chrome, Firefox, and Safari extensions
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /gtm\.js/i,
  ],

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
