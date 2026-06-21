const esbuild = require("esbuild");

esbuild
  .build({
    entryPoints: ["prisma/*.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    outdir: "prisma/dist",
    // ignore compact prisma client into bundle
    external: [ "@prisma/client" ],
  })
  .catch(() => process.exit(1));
