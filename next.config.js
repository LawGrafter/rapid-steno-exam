/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  // Serve static files from Public folder
  async rewrites() {
    return [
      {
        source: '/Public/:path*',
        destination: '/api/static/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
