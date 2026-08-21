#!/usr/bin/env node
/**
 * Notify IndexNow that the published pages changed.
 *
 * IndexNow is a push protocol: instead of waiting for a crawler to come
 * back, the site tells Bing, Yandex, Seznam and Naver which URLs to fetch.
 * Google does not participate — its indexing stays on the sitemap.
 *
 * After a Pages deploy the composed dist is hashed. Only URLs whose HTML
 * changed (or that are new since the last successful deploy) are POSTed.
 * The first run seeds the hash map and submits nothing, so a whole-site
 * blast is not the default.
 *
 * Runs from the Site workflow after a Pages deploy, and standalone via
 * `node scripts/indexnow.mjs [--dist dir] [--state file]`.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { hashesFromDist, urlsToSubmit } from "./indexnow-delta.mjs";

/**
 * The key is public by design — it is served verbatim at KEY_LOCATION, and
 * hosting that file is what proves control of the domain. It is not a
 * secret and must not be moved into one: a reader needs to be able to
 * check that this value and the deployed file agree.
 */
const KEY = "3066b6ad5c3c436ab2078c12c23ce05c";

const HOST = "orwa-mahmoud.github.io";

/**
 * The key lives at the host root so it authorises every project served from
 * this domain — IndexNow requires the key file to sit at or above every
 * submitted URL.
 *
 * An identical copy ships at /adapttable/ via apps/docs/public/. The site is
 * registered in Bing Webmaster Tools as that subdirectory, and its per-site
 * views look for the key at the registered root. The protocol allows many key
 * files per host, so both locations serve the same value.
 */
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const ENDPOINT = "https://api.indexnow.org/indexnow";

const DEFAULT_DIST = fileURLToPath(
  new URL("../apps/docs/dist", import.meta.url)
);

async function submit(urlList) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  if (res.status !== 200 && res.status !== 202) {
    throw new Error(
      `IndexNow returned HTTP ${res.status} ${res.statusText}\n` +
        `${await res.text()}\n` +
        `Check that ${KEY_LOCATION} is live and contains exactly "${KEY}".`
    );
  }
  return res.status;
}

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i === -1 || i + 1 >= process.argv.length) return fallback;
  return process.argv[i + 1];
}

function readState(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  const dist = arg("--dist", DEFAULT_DIST);
  const statePath = arg("--state", "");
  const previous = statePath ? readState(statePath) : {};
  const next = hashesFromDist(dist);
  const urls = urlsToSubmit(previous, next);

  if (statePath) {
    mkdirSync(dirname(statePath), { recursive: true });
    writeFileSync(statePath, `${JSON.stringify(next)}\n`);
  }

  if (urls.length === 0) {
    const seeded = Object.keys(previous).length === 0;
    console.log(
      seeded
        ? `indexnow: seeded ${Object.keys(next).length} URLs, no POST`
        : "indexnow: no URL hashes changed, no POST"
    );
    return;
  }

  const status = await submit(urls);
  console.log(
    `indexnow: submitted ${urls.length} URLs, HTTP ${status}` +
      (status === 202 ? " (accepted, key validation pending)" : "")
  );
}

await main();
