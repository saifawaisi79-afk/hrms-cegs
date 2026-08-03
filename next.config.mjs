/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow images from dicebear avatar API and other external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  // Disable ESLint during builds for now (frontend code from legacy Vite)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow large component files (HRMSApp.jsx is ~740KB minified)
  experimental: {
    largePageDataBytes: 1024 * 1024 * 10,
  },
};

export default nextConfig;
