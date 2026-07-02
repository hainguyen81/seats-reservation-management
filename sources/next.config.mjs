import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import webpack from "next/dist/compiled/webpack/webpack-lib.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeEnv = process.env.NODE_ENV;
const standalone = process.env.BUILD_STANDALONE;
const messagesPath = process.env.I18N_MESSAGES_PATH || '';
const productionMode = nodeEnv === "production";
const mobileMode = ["mobile", "android", "ios"].includes(nodeEnv);
const buildStandalone = standalone === "true";
console.warn(`Next.js: PRODUCTION Mode ?. ${productionMode} - MOBILE (APK/iOS) Mode?. ${mobileMode ? "true" : "false"}`);

/**
 * -------------------------------------------------
 * Next.js SCAN I18N MESSAGES FOR MOBILE
 * -------------------------------------------------
 */
// 🎯 AUTOMATED COMPILE-TIME LOCALE SCANNER RADAR
const messagesDirectory = fs.existsSync(messagesPath) ? messagesPath : path.join(process.cwd(), 'app/messages');
let compiledBundleMatrix = {};
let availableLocales = [];
try {
  if (fs.existsSync(messagesDirectory)) {
    const files = fs.readdirSync(messagesDirectory);

    files.forEach((file) => {
      if (file.endsWith(".json")) {
        const localeKey = file.replace(".json", "");
        const filePath = path.join(messagesDirectory, file);

        // 🚀 READ I18N JSON: parse to JSON Object data
        const rawContent = mobileMode ? fs.readFileSync(filePath, "utf8") : '';
        compiledBundleMatrix[localeKey] = mobileMode && (rawContent || '').length ? JSON.parse(rawContent) : localeKey;
        availableLocales.push(localeKey);
      }
    });

    console.log(
      `📡 [Next Config] Hard-embedded localized profiles for: ${Object.keys(
        compiledBundleMatrix
      ).join(", ")}`
    );
  }
} catch (e) {
  console.warn("⚠️ Failed to compile i18n bundle matrix at buildtime.");
}

/** @type {import('next').NextConfig} */

/**
 * -------------------------------------------------
 * Next.js CONFIGURATION FOR MOBILE
 * -------------------------------------------------
 */

// Next.js Mobile App Configuration
const nextMobileConfig = {
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
  },
  // 🔥 Next.js Enviroment Variables.
  // Next.js Compiler will freeze enviroment and bypass it to Client Component.
  env: {
    NEXT_PUBLIC_AVAILABLE_LOCALES: JSON.stringify(availableLocales),
    NEXT_PUBLIC_I18N_BUNDLE_MATRIX: JSON.stringify(compiledBundleMatrix),
    NEXT_PUBLIC_MOBILE_ENV: 'true',
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
  },
  // 🔥 Next.js Enviroment Variables.
  // Next.js Compiler will freeze enviroment and bypass it to Client Component.
  env: {
    NEXT_PUBLIC_AVAILABLE_LOCALES: JSON.stringify(availableLocales),
    NEXT_PUBLIC_MOBILE_ENV: 'false',
    NEXT_PUBLIC_I18N_MESSAGES_PATH: messagesPath,
  },

  // 💡 alias webpack because docker build for production
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    return config;
  },
};

const nextConfig = mobileMode ? nextMobileConfig : nextWebAppConfig;
export default nextConfig;
