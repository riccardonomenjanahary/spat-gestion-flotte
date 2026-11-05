import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.SPAT_RECETTE === "true" ? ".next-recette" : ".next",
};

export default nextConfig;
