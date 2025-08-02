import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Optimize Firebase bundle
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Tree-shake Firebase to reduce bundle size
      config.resolve.alias = {
        ...config.resolve.alias,
        'firebase/analytics': false,
        'firebase/remote-config': false,
        'firebase/messaging': false,
        'firebase/performance': false,
        'firebase/installations': false,
        'firebase/app-check': false,
        'firebase/storage': false,
        'firebase/functions': false,
        'firebase/database': false,
      };
    }
    return config;
  },
  // Enable SWC for better performance
  swcMinify: true,
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['firebase', '@firebase/firestore', '@firebase/auth'],
  },
};

export default nextConfig;
