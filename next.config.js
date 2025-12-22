// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add this to disable the error overlay
  devIndicators: {
    buildActivity: false,
  },
  // Also disable React Strict Mode temporarily
  reactStrictMode: false,
};

module.exports = nextConfig;