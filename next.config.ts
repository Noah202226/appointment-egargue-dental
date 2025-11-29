// next.config.ts
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  cacheStartUrl: true,
  aggressiveFrontEndNavCaching: true,
  fallbacks: {
    document: "/~offline",
  },
  // Ensure this entire workbox block is present
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "nextjs-cache",
          matchOptions: {
            ignoreVary: true,
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {},
};

export default withPWA(nextConfig);
