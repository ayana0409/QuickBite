import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const gatewayUrl =
      process.env.NEXT_PUBLIC_API_GATEWAY_URL || "https://quickbite-gateway.onrender.com";
    return [
      {
        source: "/api/gateway/:path*",
        destination: `${gatewayUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
