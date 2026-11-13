import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages here depend on the signed-in user, so they render per request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
