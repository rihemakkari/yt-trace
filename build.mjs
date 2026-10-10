import { build, context } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { basename } from "node:path";

const watch = process.argv.includes("--watch");

const options = {
  entryPoints: {
    content: "src/content.ts",
    popup: "src/popup/popup.ts",
    dashboard: "src/dashboard/dashboard.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome114",
  logLevel: "info",
};

// Copied as-is. In watch mode these are only copied once, at startup.
const statics = [
  "src/manifest.json",
  "src/popup/popup.html",
  "src/dashboard/dashboard.html",
  "src/dashboard/dashboard.css",
];

await rm("dist", { recursive: true, force: true });
await mkdir("dist");
for (const file of statics) await cp(file, `dist/${basename(file)}`);

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
