import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // post images go through server actions (limit there is 5 MB)
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
