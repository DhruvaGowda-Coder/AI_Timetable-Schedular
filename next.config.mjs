const isDev = process.env.NODE_ENV === "development";
const disableWebpackCache = process.env.NEXT_DISABLE_WEBPACK_CACHE === "1";
const defaultAllowedOrigins = ["localhost:3000", "127.0.0.1:3000"];

function getServerActionAllowedOrigins() {
  const origins = new Set(defaultAllowedOrigins);
  const configuredUrl = process.env.NEXTAUTH_URL?.trim();
  if (configuredUrl) {
    try {
      origins.add(new URL(configuredUrl).host);
    } catch {
      // Ignore malformed NEXTAUTH_URL here; runtime env validation handles it separately.
    }
  }
  return Array.from(origins);
}

const serverActionAllowedOrigins = getServerActionAllowedOrigins();

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  // Keep development artifacts separate from production build output.
  distDir: isDev ? ".next-dev" : ".next",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isDev
            ? []
            : [
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
              ]),
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: serverActionAllowedOrigins,
    },
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { dev, isServer, webpack }) => {
    if (dev && disableWebpackCache) {
      // Opt-in fallback for intermittent Windows filesystem cache corruption.
      config.cache = false;
    }

    // Alias `canvas` to false to fix pdfjs-dist import error
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        "node:fs": false,
        "node:stream": false,
        https: false,
        http: false,
        "node:https": false,
        "node:http": false,
      };

      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:/,
        })
      );
    }

    return config;
  },
};

export default nextConfig;


