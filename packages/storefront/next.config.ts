import type { NextConfig } from 'next';

const adminPort = process.env['ADMIN_PORT'] ?? '4201';

const nextConfig: NextConfig = {
  transpilePackages: ['@forkcart/shared'],
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/admin',
          destination: `http://127.0.0.1:${adminPort}/admin`,
        },
        {
          source: '/admin/:path*',
          destination: `http://127.0.0.1:${adminPort}/admin/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'forkcart-api.heynyx.dev' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
      { protocol: 'https', hostname: 'cdn.shopify.com' },
      { protocol: 'https', hostname: '*.imgix.net' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

export default nextConfig;
