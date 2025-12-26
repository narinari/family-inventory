import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@family-inventory/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
