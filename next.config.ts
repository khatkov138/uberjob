import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,

  },
  reactStrictMode: false, // Выключи для тестов

};

export default nextConfig;
