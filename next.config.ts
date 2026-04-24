import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/rerecipe" : "";

const nextConfig: NextConfig = {
  ...(isProd ? { output: "export" } : {}),
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
