#!/usr/bin/env node
/**
 * Write the showcase's matrix HTML entries.
 *
 * The showcase is a multi-page app: Vite needs a real HTML file per route, and
 * a crawler needs that file to already carry the page's title, description,
 * heading and copy — the demo is client-rendered, so an empty root is an empty
 * page to everything that does not run JavaScript.
 *
 * A hundred and fifty-two of those files (eight adapters × eighteen
 * features, plus a landing each) cannot be hand-written and stay true. So they
 * are written from
 * `apps/showcase/matrix.mjs`, the same module the live page renders from: one
 * feature's words exist once, and the served HTML cannot drift from the page it
 * boots. The files are committed — Vite reads them as build inputs and the dev
 * server serves them straight off disk — and `scripts/showcase-html.test.mjs`
 * fails the gate when what is on disk is not what this writes.
 *
 * Run it after editing `matrix.mjs`:
 *
 *     node scripts/build-showcase-html.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  fillTemplate,
  introFor,
  LANDING,
  landingHead,
  MATRIX_FEATURES,
  matrixPages,
} from "../apps/showcase/matrix.mjs";
import { REPLACED_PAGES } from "../apps/showcase/pages.mjs";
import { SITE } from "./sitemap-routes.mjs";

const SHOWCASE = fileURLToPath(new URL("../apps/showcase/", import.meta.url));

/** Where the docs site publishes the written reference for a feature. */
const DOCS = `${SITE}/`;

/** The social card every demo page shares. */
const OG_IMAGE = `${SITE}/og.png`;

/** Cloudflare Web Analytics — cookieless, and already on every other page. */
const CF_TOKEN = "dd71ff9f3b7b4064969d3f81e8c6ee9b";

const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/**
 * A paragraph of matrix copy, as HTML: escaped, with `backticked` spans marked
 * up as code. The words are written once for the page and for the crawler, so
 * the one thing that differs — inline code — is applied in both places from
 * the same convention.
 */
const paragraph = (text) =>
  escapeHtml(text).replace(/`([^`]+)`/g, "<code>$1</code>");

/** `../` repeated far enough to climb back to the showcase root. */
const upTo = (dir) => "../".repeat(dir.split("/").length);

/**
 * The head every demo page shares: fonts, analytics, the theme bootstrap, and
 * the pre-mount stylesheet. Identical on all of them by design — the parts that
 * differ are passed in.
 */
const head = ({
  dir,
  title,
  description,
  route,
}) => `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="${upTo(dir)}favicon.svg" />
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${SITE}${route}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="AdaptTable" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${SITE}${route}" />
    <meta property="og:image" content="${OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${OG_IMAGE}" />
    <script type="application/ld+json">
      ${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "AdaptTable",
        description,
        url: `${SITE}${route}`,
        applicationCategory: "DeveloperApplication",
        operatingSystem: "Any",
        license: "https://opensource.org/license/mit",
        programmingLanguage: "TypeScript",
        codeRepository: "https://github.com/orwa-mahmoud/adapttable",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      })}
    </script>
    <!-- Cloudflare Web Analytics — cookieless, no consent banner needed. -->
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon='{"token": "${CF_TOKEN}"}'
    ></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap"
      rel="stylesheet"
    />
    <link
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap"
      rel="stylesheet"
      media="print"
      onload="this.media = 'all'"
    />
    <title>${escapeHtml(title)}</title>
    <script>
      try {
        if (localStorage.getItem("adapttable-demo-theme") === "dark")
          document.documentElement.dataset.theme = "dark";
      } catch {}
    </script>
    <style>
      /* The pre-mount fallback inside #root. React replaces it on mount, so
         this paints only while the bundle is still downloading — or
         permanently, when JavaScript is unavailable. Styled so that moment
         reads as the page arriving rather than as broken markup. */
      .at-fallback {
        max-width: 46rem;
        margin: 0 auto;
        padding: 4.5rem 1.5rem;
        font-family: "Schibsted Grotesk", ui-sans-serif, system-ui, sans-serif;
        color: #52525b;
        line-height: 1.65;
      }
      .at-fallback p {
        text-wrap: pretty;
      }
      .at-fallback__kicker {
        margin: 0 0 0.75rem;
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #71717a;
      }
      .at-fallback h1 {
        font-size: 2rem;
        font-weight: 800;
        color: #18181b;
        margin: 0 0 1rem;
        letter-spacing: -0.03em;
        line-height: 1.1;
      }
      .at-fallback h2 {
        font-size: 0.95rem;
        font-weight: 600;
        color: #18181b;
        margin: 2rem 0 0.6rem;
      }
      .at-fallback pre {
        overflow-x: auto;
        padding: 1rem 1.1rem;
        border: 1px solid #e4e4e7;
        border-radius: 12px;
        background: #fafafa;
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 0.8rem;
        line-height: 1.7;
        color: #3f3f46;
      }
      .at-fallback p code {
        padding: 1px 5px;
        border-radius: 5px;
        background: #f4f4f5;
        font-family: "JetBrains Mono", ui-monospace, monospace;
        font-size: 0.86em;
        color: #27272a;
      }
      .at-fallback ul {
        padding-inline-start: 1.2rem;
        margin: 0;
      }
      .at-fallback li {
        margin: 0.4rem 0;
      }
      .at-fallback a {
        color: #4f46e5;
      }
      [data-theme="dark"] .at-fallback {
        color: #a1a1aa;
      }
      [data-theme="dark"] .at-fallback :is(h1, h2) {
        color: #fafafa;
      }
      [data-theme="dark"] .at-fallback pre {
        border-color: #3f3f46;
        background: #18181b;
        color: #d4d4d8;
      }
      [data-theme="dark"] .at-fallback p code {
        background: #27272a;
        color: #e4e4e7;
      }
      [data-theme="dark"] .at-fallback a {
        color: #a5b4fc;
      }
    </style>`;

/** A document, assembled from its head and its body. */
const htmlDocument = (headHtml, bodyHtml) => `<!doctype html>
<html lang="en">
  <head>
${headHtml}
  </head>
  <body>
${bodyHtml}
  </body>
</html>
`;

/** The written reference links a page closes with. */
const docsList = (slugs) =>
  slugs.map((slug) => `<a href="${DOCS}${slug}/">${slug}</a>`).join(", ");

/**
 * A navigation list, indented to sit inside the fallback `<main>`.
 *
 * The demo's kit and feature navigation is React's, so until the bundle mounts
 * — and permanently for anything that does not run JavaScript — every one of
 * these 152 pages is reachable only from the one page that happens to link it.
 * A crawler that cannot walk between them treats them as orphans and spends its
 * budget accordingly. So the served markup carries the same grid of links the
 * mounted page offers: each page names its kit's other features, the same
 * feature in the other kits, and the way back up.
 *
 * @param {{ href: string, text: string, note?: string }[]} items
 */
const linkList = (items) =>
  [
    "        <ul>",
    ...items.map(({ href, text, note }) => {
      const trailer = note ? ` — ${escapeHtml(note)}` : "";
      return `          <li><a href="${href}">${escapeHtml(text)}</a>${trailer}</li>`;
    }),
    "        </ul>",
  ].join("\n");

/** The built kits other than this one, in matrix order. */
const otherKits = (adapter) =>
  builtAdapters().filter((other) => other.key !== adapter.key);

/** This kit's features other than this one, in demand order. */
const siblingFeatures = (feature) =>
  MATRIX_FEATURES.filter((other) => other.slug !== feature.slug);

/**
 * One feature page's static HTML: the words a crawler reads, and the mount
 * point React takes over.
 */
const featurePage = (adapter, feature) => {
  const fill = (text) => fillTemplate(text, adapter);
  const dir = `${adapter.key}/${feature.slug}`;
  const route = `/demo/${dir}/`;
  const note = feature.notes[adapter.key];
  const body = `    <!-- Replaced by React on mount — the served markup carries the page's
         own words so a crawler, and anyone whose bundle has not arrived, reads
         a real page. Written by scripts/build-showcase-html.mjs. -->
    <div id="root" data-matrix-page="${dir}">
      <main class="at-fallback">
        <p class="at-fallback__kicker">AdaptTable for ${escapeHtml(adapter.label)}</p>
        <h1>${escapeHtml(fill(feature.h1))}</h1>
${introFor(feature, adapter)
  .map((line) => `        <p>${paragraph(fill(line))}</p>`)
  .join("\n")}
${note ? `        <p>${paragraph(note)}</p>\n` : ""}        <h2>The code</h2>
        <pre><code>${escapeHtml(fill(feature.snippet))}</code></pre>
        <h2>Install</h2>
        <pre><code>${escapeHtml(adapter.install)}</code></pre>
        <h2>The same feature in the other kits</h2>
${linkList(
  otherKits(adapter).map((other) => ({
    href: `../../${other.key}/${feature.slug}/`,
    text: fillTemplate(feature.h1, other),
    note: other.blurb,
  }))
)}
        <h2>More ${escapeHtml(adapter.label)} features</h2>
${linkList(
  siblingFeatures(feature).map((sibling) => ({
    href: `../${sibling.slug}/`,
    text: fill(sibling.h1),
    note: fill(sibling.card),
  }))
)}
        <p>
          Reference: ${docsList(feature.docs)}. More of this kit:
          <a href="../">AdaptTable for ${escapeHtml(adapter.label)}</a>, or
          <a href="/adapttable/demo/">the live demo</a>.
        </p>
      </main>
    </div>
    <script type="module" src="/src/entry-matrix.tsx"></script>`;
  return {
    dir,
    html: htmlDocument(
      head({
        dir,
        route,
        title: fill(feature.title),
        description: fill(feature.description),
      }),
      body
    ),
  };
};

/** An adapter landing page's static HTML. */
const landingPage = (adapter) => {
  const fill = (text) => fillTemplate(text, adapter);
  const dir = adapter.key;
  const route = `/demo/${dir}/`;
  const head_ = landingHead(adapter);
  const body = `    <!-- Replaced by React on mount — see the note on a feature page for why the
         served markup carries content. Written by
         scripts/build-showcase-html.mjs. -->
    <div id="root" data-matrix-page="${dir}">
      <main class="at-fallback">
        <p class="at-fallback__kicker">${escapeHtml(adapter.pkg)}</p>
        <h1>${escapeHtml(fill(LANDING.h1))}</h1>
${LANDING.intro.map((line) => `        <p>${paragraph(fill(line))}</p>`).join("\n")}
        <h2>Install</h2>
        <pre><code>${escapeHtml(adapter.install)}</code></pre>
        <h2>Every feature, on its own page</h2>
${linkList(
  MATRIX_FEATURES.map((feature) => ({
    href: `./${feature.slug}/`,
    text: fill(feature.h1),
    note: fill(feature.card),
  }))
)}
        <h2>${escapeHtml(fill(LANDING.kitsTitle))}</h2>
        <p>${paragraph(fill(LANDING.kitsLead))}</p>
${linkList(
  otherKits(adapter).map((other) => ({
    href: `../${other.key}/`,
    text: fillTemplate(LANDING.h1, other),
    note: other.blurb,
  }))
)}
        <p>
          Reference: <a href="${DOCS}getting-started/">getting started</a>. Or
          open <a href="/adapttable/demo/">the live demo</a> and switch kits on
          the same table.
        </p>
      </main>
    </div>
    <script type="module" src="/src/entry-matrix.tsx"></script>`;
  return {
    dir,
    html: htmlDocument(
      head({
        dir,
        route,
        title: fill(head_.title),
        description: fill(head_.description),
      }),
      body
    ),
  };
};

/**
 * A page that only forwards the reader on.
 *
 * Static hosting has no redirect layer, so the move is declared in the
 * document: meta-refresh carries a reader across, and the canonical link tells
 * a crawler which URL is the real one. It boots no bundle — there is nothing on
 * it to run.
 */
const stubPage = ([from, to]) => {
  const [adapterKey, featureSlug] = to.split("/");
  const adapter = adapterByKey(adapterKey);
  const feature = featureBySlug(featureSlug);
  if (!adapter || !feature) {
    throw new Error(
      `build-showcase-html: /demo/${from}/ forwards to /demo/${to}/, which the matrix does not build`
    );
  }
  const name = fillTemplate(feature.h1, adapter).toLowerCase();
  const title = `AdaptTable demo — ${feature.label.toLowerCase()} moved to /demo/${to}/`;
  const description = `The AdaptTable ${feature.label.toLowerCase()} demo is now ${name} at /demo/${to}/ — the same table, with that kit's install line and code on the page.`;
  const body = `    <main class="at-fallback">
      <h1>This demo is now at /demo/${to}/</h1>
      <p>
        The demo is adapter-first: this page became
        <a href="${upTo(from)}${to}/">${escapeHtml(name)}</a>, which carries the
        same table plus ${escapeHtml(adapter.label)}'s own install line, imports
        and code. Every capability that lived at this address lives there.
      </p>
      <p>
        Your browser follows the move on its own. If it has not, open
        <a href="${upTo(from)}${to}/">/demo/${to}/</a> directly, or start from
        <a href="/adapttable/demo/">the main showcase</a>.
      </p>
    </main>`;
  const headHtml = `    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="${upTo(from)}favicon.svg" />
    <!-- Static hosting has no redirect layer, so the move is declared in the
         document: meta-refresh carries a reader across, and the canonical
         link tells a crawler which URL is the real one. -->
    <meta http-equiv="refresh" content="0; url=${upTo(from)}${to}/" />
    <link rel="canonical" href="${SITE}/demo/${to}/" />
    <meta name="description" content="${escapeHtml(description)}" />
    <title>${escapeHtml(title)}</title>
    <script>
      try {
        if (localStorage.getItem("adapttable-demo-theme") === "dark")
          document.documentElement.dataset.theme = "dark";
      } catch {}
    </script>
    <style>
      .at-fallback {
        max-width: 44rem;
        margin: 0 auto;
        padding: 4.5rem 1.5rem;
        font-family: ui-sans-serif, system-ui, sans-serif;
        color: #52525b;
        line-height: 1.65;
      }
      .at-fallback h1 {
        font-size: 1.6rem;
        font-weight: 700;
        color: #18181b;
        margin: 0 0 1rem;
        letter-spacing: -0.01em;
      }
      .at-fallback a {
        color: #4f46e5;
      }
      [data-theme="dark"] .at-fallback {
        color: #a1a1aa;
      }
      [data-theme="dark"] .at-fallback h1 {
        color: #fafafa;
      }
      [data-theme="dark"] .at-fallback p code {
        background: #27272a;
        color: #e4e4e7;
      }
      [data-theme="dark"] .at-fallback a {
        color: #a5b4fc;
      }
    </style>`;
  return { dir: from, html: htmlDocument(headHtml, body) };
};

/** Every HTML file this writes, as `{ dir, html }`. */
export const showcaseHtmlFiles = () => [
  ...matrixPages().map((page) => {
    const adapter = adapterByKey(page.adapter);
    if (!adapter) throw new Error(`unknown adapter: ${page.adapter}`);
    if (page.feature === null) return landingPage(adapter);
    const feature = featureBySlug(page.feature);
    if (!feature) throw new Error(`unknown feature: ${page.feature}`);
    return featurePage(adapter, feature);
  }),
  ...REPLACED_PAGES.map(stubPage),
];

/** What is on disk for a page, or `null` when the file is not there. */
export const readShowcaseHtml = (dir) => {
  try {
    return readFileSync(join(SHOWCASE, dir, "index.html"), "utf8");
  } catch {
    return null;
  }
};

const main = () => {
  const files = showcaseHtmlFiles();
  for (const { dir, html } of files) {
    mkdirSync(join(SHOWCASE, dir), { recursive: true });
    writeFileSync(join(SHOWCASE, dir, "index.html"), html);
  }
  console.log(`showcase HTML written — ${files.length} pages`);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
