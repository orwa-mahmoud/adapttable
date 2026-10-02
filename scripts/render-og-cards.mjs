#!/usr/bin/env node
/**
 * Render the docs Open Graph cards into `apps/docs/public/og/<slug>.png`.
 *
 * `apps/docs/scripts/og-cards.html` builds one 1200x630 card per sidebar
 * entry. It imports `sidebar.mjs` as a module, which a browser only allows
 * over HTTP, so the default mode serves the repo on a free local port, opens the
 * page in Chromium and screenshots each card element.
 *
 * By default only cards without a PNG are rendered, so existing images keep
 * their bytes; `--all` re-renders every card. `--static` renders the same
 * registered titles and framework metadata from escaped SVG through Sharp,
 * without a server or browser. Sharp is a declared dependency of apps/docs.
 *
 *   node scripts/render-og-cards.mjs [--all] [--static]
 */
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { ogCardMetadata, ogCardSvg } from "./og-cards.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_APP = join(ROOT, "apps", "docs");
const OUT = join(DOCS_APP, "public", "og");
const ALL = process.argv.includes("--all");

const TYPES = { ".html": "text/html", ".mjs": "text/javascript" };

function serve() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const path = normalize(join(ROOT, pathname));
    if (!path.startsWith(`${ROOT}/`) || !existsSync(path)) {
      response.writeHead(404).end();
      return;
    }
    if (statSync(path).isDirectory()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "content-type": TYPES[extname(path)] ?? "application/octet-stream",
    });
    createReadStream(path).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  const cards = ogCardMetadata().filter(
    ({ slug }) => ALL || !existsSync(join(OUT, `${slug}.png`))
  );
  if (cards.length === 0) {
    console.log("og cards: every sidebar page already has an image.");
    return;
  }
  if (process.argv.includes("--static")) {
    const requireDocs = createRequire(join(DOCS_APP, "package.json"));
    const sharp = requireDocs("sharp");
    for (const card of cards) {
      const file = join(OUT, `${card.slug}.png`);
      mkdirSync(dirname(file), { recursive: true });
      await sharp(Buffer.from(ogCardSvg(card)))
        .png({ compressionLevel: 9 })
        .toFile(file);
      console.log(`wrote apps/docs/public/og/${card.slug}.png (static SVG)`);
    }
    return;
  }
  const { chromium } = await import("@playwright/test");
  const server = await serve();
  const { port } = server.address();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
    });
    await page.goto(`http://127.0.0.1:${port}/apps/docs/scripts/og-cards.html`);
    await page.evaluate(() => document.fonts.ready);
    for (const { slug } of cards) {
      mkdirSync(dirname(join(OUT, `${slug}.png`)), { recursive: true });
      await page
        .locator(`[id="c-${slug}"]`)
        .screenshot({ path: join(OUT, `${slug}.png`) });
      console.log(`wrote apps/docs/public/og/${slug}.png`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
