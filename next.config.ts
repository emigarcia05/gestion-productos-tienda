import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/tienda/tinto-lts",
        destination: "/tienda/tintometrico",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
