const { spawnSync } = require("node:child_process");

const watch = process.argv.includes("--watch");
const tscBin = require.resolve("typescript/bin/tsc");
const args = ["--project", "tsconfig.json"];

if (watch) {
  args.push("--watch", "--preserveWatchOutput");
}

// Phase 1 emits with TypeScript so the extension host can load the shell reliably
// in sandboxed Windows environments. The esbuild entry point is kept for later bundling.
const result = spawnSync(process.execPath, [tscBin, ...args], {
  cwd: process.cwd(),
  stdio: "inherit"
});

process.exit(result.status ?? 1);
