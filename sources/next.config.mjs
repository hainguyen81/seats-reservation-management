import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV;
const standalone = process.env.BUILD_STANDALONE;;
const productionMode = nodeEnv === "production";
const mobileMode = ["mobile", "android", "ios"].includes(nodeEnv);
const buildStandalone = standalone === "true";
console.warn('Next.js: PRODUCTION Mode ?.', productionMode);

/** @type {import('next').NextConfig} */
const nextConfig = mobileMode
  ? {
      // 🔥 THE CRITICAL MOBILE SWITCH: Force Next.js compiler to generate flat static files
      output: "export",
      // Disable image optimization because mobile runtime nodes lack a running server-side sharp engine
      images: {
        unoptimized: true,
      },
    }
  : {
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
      productionBrowserSourceMaps: !productionMode,
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
      webpack: (config) => {
        config.resolve.alias["@"] = path.resolve(__dirname, "src");
        return config;
      },
    };

export default nextConfig;
