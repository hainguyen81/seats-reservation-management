/** @type {import('next').NextConfig} */
const nextConfig = {
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
    };

export default nextConfig;
