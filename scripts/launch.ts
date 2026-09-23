/**
 * One-command launcher: builds the UI if the sources changed since the last build,
 * then starts Compass and opens it in your browser.
 *
 *   pnpm app            (or double-click Compass.cmd on Windows)
 */
import { spawnSync, spawn } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const distIndex = join(root, "dist", "index.html");

function newestMtime(path: string): number {
  const s = statSync(path);
  if (!s.isDirectory()) return s.mtimeMs;
  let newest = 0;
  for (const entry of readdirSync(path)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    newest = Math.max(newest, newestMtime(join(path, entry)));
  }
  return newest;
}

const sources = ["src", "shared", "index.html", "public", "vite.config.ts"].map((p) => join(root, p)).filter(existsSync);
const needsBuild = !existsSync(distIndex) || Math.max(...sources.map(newestMtime)) > statSync(distIndex).mtimeMs;

if (needsBuild) {
  console.log("Building the Compass UI (only needed after updates)…");
  const built = spawnSync("pnpm", ["exec", "vite", "build"], { cwd: root, stdio: "inherit", shell: true });
  if (built.status !== 0) process.exit(built.status ?? 1);
}

const server = spawn(process.execPath, [join(root, "server", "index.ts"), "--open", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
server.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => server.kill(sig));
