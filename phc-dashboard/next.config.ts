import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Enable faster builds and strict mode
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Set correct workspace root to resolve package.json warning
  distDir: '.next',
  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 100000,
        },
        runtimeChunk: {
          name: 'runtime',
        },
      };
    }

    return config;
  },
  // Environment configuration
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NODE_ENV,
  },
};

export default nextConfig;
