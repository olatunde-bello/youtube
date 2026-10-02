import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Thumbnails are already small; skipping Vercel's image resizing keeps us
    // well inside the free plan's limits.
    unoptimized: true,
    // YouTube thumbnails and channel avatars
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "yt3.ggpht.com" },
    ],
  },
};

export default nextConfig;
