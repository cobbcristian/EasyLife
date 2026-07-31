import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Azure App Service / Docker; Vercel ignores harmlessly.
  output: "standalone",
};

export default nextConfig;
