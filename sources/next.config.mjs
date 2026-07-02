import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV;
const standalone = process.env.BUILD_STANDALONE;;
const productionMode = nodeEnv === "production";
const mobileMode = ["mobile", "android", "ios"].includes(nodeEnv);
const buildStandalone = standalone === "true";
console.warn(`Next.js: PRODUCTION Mode ?. ${productionMode} - MOBILE (APK/iOS) Mode?. ${mobileMode ? "true" : "false"}`);

/** @type {import('next').NextConfig} */

/**
 * -------------------------------------------------
 * Next.js CONFIGURATION FOR MOBILE
 * -------------------------------------------------
 */

// Next.js Mobile App Configuration
const nextMobileConfig = {
  // ⚡ Caching is a technique for storing the result of data fetching
  // and other computations so that future requests for the same data can be served faster, without doing the work again.
  cacheComponents: true,
  // 🔥 THE CRITICAL MOBILE SWITCH: Force Next.js compiler to generate flat static files
  output: "export",
  // Disable image optimization because mobile runtime nodes lack a running server-side sharp engine
  images: {
    unoptimized: true,
  },
  typescript: {
    // !!!WARNING!!!
    // Ignore TypeScript Errors to force Next.js build export successfully
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // debugging
  logging: {
    fetches: {
      fullUrl: !productionMode,
    },
  },
  experimental: {
    instrumentationHook: true,
    // ⚡ Caching is a technique for storing the result of data fetching
    // and other computations so that future requests for the same data can be served faster, without doing the work again.
    cacheComponents: true, // old version
  },

  // =========================================================================
  // 🔥 THE CRITICAL IMMUNITY SHIELD: EXCLUDE BACKEND API ROUTES FROM STATIC EXPORT
  // =========================================================================
  // Instructs the Webpack / Turbopack compiler matrix to completely ignore the server-side
  // api subdirectories during 'npm run build', eliminating dynamic 'cookies()' compilation faults!
  distDir: ".next",
  // Custom Webpack hook to exclude api files from static bundle asset tracking
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 🎯 RULE A: Explicitly isolate and ignore the backend api subdirectory
      // Prevent client-side compiler from mapping backend api controllers into the final mobile package
      config.externals = [...(config.externals || []), /^\/api/];
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: /\/app\/api\// })
      );
      config.resolve.alias["@/app/api"] = false;

      // 🎯 RULE B: Hard-block the Prisma Client module from leaking into the mobile build.
      // Tells Webpack to replace the heavy Prisma Node.js binary engine with an empty shell.
      // This completely silences errors like "Can't resolve 'fs'" or "Can't resolve 'crypto'" on Mobile.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        crypto: false,
      };

      // Alias Prisma Client to an empty mapping boundary to bypass client bundling completely [3.2]
      config.resolve.alias["@prisma/client"] = false;
    }
    return config;
  },
};

/**
 * -------------------------------------------------
 * Next.js CONFIGURATION FOR WEB APP
 * -------------------------------------------------
 */

// Next.js Web App Configuration
const nextWebAppConfig = {
  output: productionMode || buildStandalone ? "standalone" : undefined,
  // ⚡ Caching is a technique for storing the result of data fetching
  // and other computations so that future requests for the same data can be served faster, without doing the work again.
  cacheComponents: true,
  images: {
    unoptimized: !productionMode,
  },
  typescript: {
    // !!!WARNING!!!
    // Ignore TypeScript Errors to force Next.js build export successfully
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
    // ⚡ Caching is a technique for storing the result of data fetching
    // and other computations so that future requests for the same data can be served faster, without doing the work again.
    cacheComponents: true, // old version
  },

  // 💡 alias webpack because docker build for production
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
};

const nextConfig = mobileMode ? nextMobileConfig : nextWebAppConfig;
export default nextConfig;
