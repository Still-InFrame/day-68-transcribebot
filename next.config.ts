import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stray package-lock.json in $HOME would make Turbopack pick the wrong workspace root
  turbopack: { root: __dirname },
};

export default nextConfig;
