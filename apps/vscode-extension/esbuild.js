const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const watch = process.argv.includes("--watch");
const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");

function copyWebviewAssets() {
  const webviewDist = path.join(distDir, "webview");
  fs.mkdirSync(webviewDist, { recursive: true });
  fs.copyFileSync(path.join(rootDir, "src", "webview", "styles.css"), path.join(webviewDist, "styles.css"));
}

const tscBin = require.resolve("typescript/bin/tsc");
const args = ["--project", "tsconfig.json"];

if (watch) {
  args.push("--watch", "--preserveWatchOutput");
}

const result = spawnSync(process.execPath, [tscBin, ...args], {
  cwd: rootDir,
  stdio: "inherit"
});

if (result.status === 0) {
  copyWebviewAssets();
}

process.exit(result.status ?? 1);
