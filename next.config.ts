import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow font optimization to fail gracefully during build
  experimental: {
    optimizePackageImports: ['@clerk/nextjs'],
  },
};

export default nextConfig;
