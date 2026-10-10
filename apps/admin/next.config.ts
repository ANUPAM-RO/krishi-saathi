import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @krishi/shared is a workspace package (compiled CommonJS in dist/). Transpiling it keeps
  // Next happy whether it resolves the symlinked dist or source.
  transpilePackages: ['@krishi/shared'],
  // ESLint is not installed in this workspace; skip the lint step during `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
