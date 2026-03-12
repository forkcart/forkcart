import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@forkcart/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
