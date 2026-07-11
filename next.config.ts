import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo root also holds a LobeChat env; keep this app self-contained.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
