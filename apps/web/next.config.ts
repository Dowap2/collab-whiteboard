import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    emotion: true,
  },
  experimental: {
    optimizePackageImports: ["@emotion/react", "@emotion/styled"],
  },
};

export default nextConfig;
