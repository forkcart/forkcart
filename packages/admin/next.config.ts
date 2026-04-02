import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  basePath: '/admin',
  transpilePackages: ['@forkcart/shared'],
};

export default nextConfig;
