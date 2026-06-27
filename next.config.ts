import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The GlobalHeader logo is hot-linked from the WordPress source of truth at
  // almiworld.com so it can be swapped without redeploying every family product.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "almiworld.com" }],
  },
};

export default nextConfig;
