import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The server binds on 0.0.0.0, so a browser at 127.0.0.1 is a different
  // host. Without this, Next blocks the dev socket and the page never hydrates.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
