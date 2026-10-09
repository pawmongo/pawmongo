import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  output: process.env.NODE_ENV === 'development' ? undefined : 'export',
  ...(process.env.NODE_ENV === 'development' ? {
    async rewrites() {
      const php = process.env.PAWMONGO_API_URL || 'http://127.0.0.1:8080';
      return {
        beforeFiles: [{source: '/api/:path*', destination: `${php}/api/:path*`}],
        afterFiles: [],
        fallback: [{source: '/databases/:path*', destination: '/'}],
      };
    },
  } : {}),
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
