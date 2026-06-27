import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productionMode = process.env.NODE_ENV === "production";
const buildStandalone = process.env.BUILD_STANDALONE === "true";
console.warn('Next.js: PRODUCTION Mode ?.', productionMode);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: productionMode || buildStandalone ? "standalone" : undefined,
  images: {
    unoptimized: !productionMode,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // for hot-reload
  productionBrowserSourceMaps: true,
  // debugging
  logging: {
    fetches: {
      fullUrl: !productionMode,
    },
  },
  experimental: {
    instrumentationHook: true,
  },

  // 💡 alias webpack because docker build for production
  webpack: (config, { dev, isServer }) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    // if (dev) {
    //   // map source correct in DEV enviroment
    //   config.devtool = isServer ? "eval-source-map" : "cheap-module-source-map";
    // }
    return config;
  },
};

export default nextConfig;
