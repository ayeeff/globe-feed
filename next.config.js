/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React Strict Mode to prevent double-mounting issues
  reactStrictMode: false,
  
  // Webpack configuration for better memory management
  webpack: (config, { isServer }) => {
    // Don't bundle these on the server (they use browser APIs)
    if (isServer) {
      config.externals.push('three', 'globe.gl', 'cesium', 'leaflet');
    }

    // Prevent multiple instances of Three.js
    config.resolve.alias = {
      ...config.resolve.alias,
      'three': require.resolve('three'),
    };

    // Optimize chunk splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Separate chunk for Three.js and related libraries
          three: {
            name: 'three',
            test: /[\\/]node_modules[\\/](three|globe\.gl)[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
          // Separate chunk for map libraries
          maps: {
            name: 'maps',
            test: /[\\/]node_modules[\\/](cesium|leaflet)[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
          // Common vendor chunk
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    };

    return config;
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['react-globe.gl', 'three'],
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CESIUM_TOKEN: process.env.NEXT_PUBLIC_CESIUM_TOKEN,
  },
};

module.exports = nextConfig;
