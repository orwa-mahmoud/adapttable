#!/usr/bin/env node
/**
 * Render the docs Open Graph cards into `apps/docs/public/og/<slug>.png`.
 *
 * `apps/docs/scripts/og-cards.html` builds one 1200x630 card per sidebar
 * entry. It imports `sidebar.mjs` as a module, which a browser only allows
 * over HTTP, so this script serves `apps/docs` on a free local port, opens the
 * page in Chromium and screenshots each card element.
 *
 * By default only cards without a PNG are rendered, so existing images keep
 * their bytes; `--all` re-renders every card.
 *
 *   node scripts/render-og-cards.mjs [--all]
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

import { sidebarSlugs } from "../apps/docs/sidebar.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS_APP = join(ROOT, "apps", "docs");
const OUT = join(DOCS_APP, "public", "og");
const ALL = process.argv.includes("--all");

const TYPES = { ".html": "text/html", ".mjs": "text/javascript" };

function serve() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(request.url.split("?")[0]);
    const path = normalize(join(DOCS_APP, pathname));
    if (!path.startsWith(DOCS_APP) || !existsSync(path)) {
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
  const slugs = sidebarSlugs().filter(
    (slug) => ALL || !existsSync(join(OUT, `${slug}.png`))
  );
  if (slugs.length === 0) {
    console.log("og cards: every sidebar page already has an image.");
    return;
  }
  const server = await serve();
  const { port } = server.address();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
    });
    await page.goto(`http://127.0.0.1:${port}/scripts/og-cards.html`);
    await page.evaluate(() => document.fonts.ready);
    for (const slug of slugs) {
      await page
        .locator(`#c-${slug}`)
        .screenshot({ path: join(OUT, `${slug}.png`) });
      console.log(`wrote apps/docs/public/og/${slug}.png`);
    }
  } finally {
    await browser.close();
    server.close();
  }
}

await main();
