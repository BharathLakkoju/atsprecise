import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Keep large server-only packages out of the webpack bundle.
  // They are required() at runtime instead, eliminating the big-string cache warning.
  serverExternalPackages: ["mammoth", "unpdf"],
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default nextConfig;
