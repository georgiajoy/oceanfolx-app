/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  swcMinify: false,
  experimental: {
    esmExternals: 'loose',
    serverActions: {
      enabled: true,
    },
  },
};

module.exports = nextConfig;
