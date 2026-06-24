/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow HMR when opening the dev server via LAN IP (e.g. phone/tablet on same network)
  allowedDevOrigins: ["192.168.31.158", "localhost"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
