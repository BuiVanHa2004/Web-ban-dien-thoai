import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone", // Bật khi deploy bằng Docker, comment khi deploy Vercel
  images: {
    unoptimized: true,
    // Thêm domain ảnh từ MinIO/backend khi deploy
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8080",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "*.onrender.com",
      },
      {
        protocol: "https",
        hostname: "s3.*.backblazeb2.com",
      },
    ],
  },
};

export default nextConfig;
