#!/usr/bin/env node
/**
 * Serve the built showcase or Astro docs for the end-to-end suite.
 *
 * The suite used to drive the Vite dev server, which compiles each route the
 * first time a spec asks for it. Under parallel load that first compile can
 * outlast a navigation timeout, and it did — five full runs failed on five
 * DIFFERENT specs, each of which passed immediately on its own. That is
 * contention, not a flaky test, and no timeout is the right size for it.
 *
 * A production build has no first-compile: every route is already on disk, so a
 * navigation costs a file read whatever else the machine is doing. The suite
 * keeps its worker count and its timeouts; the thing that was slow is gone.
 *
 * Two things the dev server provided have to survive the move:
 *
 * 1. **The patch stream.** `/__adapttable/patches` is Vite middleware in dev,
 *    and the realtime specs assert the feed reaches `data-stream-status="open"`
 *    — a real EventSource, not the scripted fallback. It is reimplemented here
 *    with the same frames and the same interval.
 * 2. **Current library source.** The showcase aliases `@adapttable/*` to
 *    package source, and `vite build` follows those aliases, so the built site
 *    is the current library rather than a stale package build.
 *
 *   node scripts/serve-showcase.mjs [--port 4321]
 *   node scripts/serve-showcase.mjs --docs --port 4323
 */
import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  requireVueBrowserArtifact,
  VUE_BROWSER_DIST,
  VUE_BROWSER_ROUTE,
} from "./build-vue-browser-consumer.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = process.argv.includes("--docs");
const APP = DOCS ? "docs" : "showcase";
const DIST = join(ROOT, "apps", APP, "dist");

const portArg = process.argv.indexOf("--port");
const PORT = Number(
  portArg === -1 ? (process.env.PORT ?? 4321) : process.argv[portArg + 1]
);

/** Same path, frames and cadence as the dev-server middleware. */
const PATCH_STREAM_PATH = "/__adapttable/patches";
const PATCH_STREAM_INTERVAL_MS = 1200;

const TYPES = new Map(
  Object.entries({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  })
);

/**
 * Build the showcase unless the caller says it is already current.
 *
 * Turbo owns the caching, so an unchanged tree is a cache hit rather than a
 * rebuild — "build once" without this script keeping its own staleness notes.
 *
 * The build keeps its analytics tags. They carry a host guard that injects
 * nothing off the real site, and `e2e/analytics.spec.ts` is what proves a
 * localhost run makes no tracker request — a guard nothing exercises is a
 * guard that quietly stops working.
 */
function build() {
  if (process.env[DOCS ? "DOCS_SKIP_BUILD" : "SHOWCASE_SKIP_BUILD"] === "1")
    return;
  // Resolved from the installed package and run with this interpreter, so
  // neither the binary nor the runtime is taken from PATH.
  const require = createRequire(import.meta.url);
  const turbo = join(
    dirname(require.resolve("turbo/package.json")),
    "bin",
    "turbo"
  );
  const result = spawnSync(
    process.execPath,
    [
      turbo,
      "run",
      "build",
      `--filter=@adapttable/${APP}`,
      // Canonical docs live outside the Astro package, beyond its default
      // Turbo inputs. Force a fresh local build; CI restores one exact-head
      // artifact and sets DOCS_SKIP_BUILD, so shards never rebuild it.
      ...(DOCS ? ["--force"] : []),
    ],
    {
      cwd: ROOT,
      stdio: "inherit",
    }
  );
  if (result.status !== 0) {
    console.error(`${APP} build failed`);
    process.exit(result.status ?? 1);
  }
  if (!DOCS) {
    const consumer = spawnSync(
      process.execPath,
      [join(ROOT, "scripts/build-vue-browser-consumer.mjs")],
      { cwd: ROOT, stdio: "inherit" }
    );
    if (consumer.status !== 0) process.exit(consumer.status ?? 1);
  }
}

/** Resolve one URL path to a file inside `dist`, or null. */
function fileFor(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0] ?? "");
  } catch {
    return null;
  }
  // This test-only route is a separate packed artifact. It is never copied
  // into public showcase dist, and cannot fall through to source fixtures.
  let directory = DIST;
  if (!DOCS && decoded.startsWith(VUE_BROWSER_ROUTE)) {
    directory = join(ROOT, VUE_BROWSER_DIST);
    decoded = decoded.slice(VUE_BROWSER_ROUTE.length);
  }
  const parts = [];
  for (const part of decoded.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === ".." || part.includes("\0")) return null;
    parts.push(part);
  }
  const target = parts.length === 0 ? directory : join(directory, ...parts);
  const rel = relative(directory, target);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;

  if (existsSync(target) && statSync(target).isFile()) return target;
  // Directory routes (`/mui/realtime/`) are served by their index.
  const index = join(target, "index.html");
  return existsSync(index) ? index : null;
}

function isClientAbort(err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : "";
  return (
    code === "EPIPE" ||
    code === "ECONNRESET" ||
    code === "ERR_STREAM_DESTROYED" ||
    code === "ERR_STREAM_PREMATURE_CLOSE"
  );
}

function patchStream(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const tick = () => {
    try {
      if (res.writableEnded || res.destroyed) {
        clearInterval(id);
        return;
      }
      res.write("data: tick\n\n");
    } catch (err) {
      if (!isClientAbort(err)) throw err;
      clearInterval(id);
    }
  };
  const id = setInterval(tick, PATCH_STREAM_INTERVAL_MS);
  const stop = () => clearInterval(id);
  req.on("close", stop);
  res.on("close", stop);
  res.on("error", (err) => {
    if (!isClientAbort(err)) throw err;
    stop();
  });
  tick();
}

build();
if (!DOCS) requireVueBrowserArtifact(ROOT);

if (!existsSync(DIST)) {
  console.error(`no build at ${DIST}`);
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  if (isClientAbort(err)) return;
  console.error(err);
  process.exit(1);
});

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  if (!DOCS && url.split("?")[0] === PATCH_STREAM_PATH) {
    patchStream(req, res);
    return;
  }

  const file = fileFor(url);
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("not found");
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES.get(extname(file)) ?? "application/octet-stream",
    // The suite must see the build it just made, never a cached earlier one.
    "Cache-Control": "no-store",
  });
  // Playwright aborts in-flight navigations under parallel load. An unhandled
  // `EPIPE` / `ERR_STREAM_DESTROYED` from the file stream kills this process
  // and the rest of the suite then fails with `ERR_CONNECTION_REFUSED`.
  const stream = createReadStream(file);
  const abort = () => {
    stream.destroy();
    if (!res.writableEnded) res.destroy();
  };
  stream.on("error", abort);
  res.on("error", abort);
  res.on("close", () => stream.destroy());
  stream.pipe(res);
});
server.listen(PORT, () => {
  const address = server.address();
  const actualPort =
    address && typeof address === "object" ? address.port : PORT;
  console.log(`${APP} served from ${DIST} on http://localhost:${actualPort}`);
});
