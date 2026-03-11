import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/crm",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.b-cdn.net",
      },
    ],
  },
};

export default nextConfig;
