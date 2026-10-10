import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { DESCRIPTIONS, TITLES } from "../apps/docs/sync-docs.mjs";
import {
  auditDescriptions,
  auditLlmsIndex,
  auditOgImages,
  auditTitles,
} from "./check-doc-surface.mjs";
import { ogCardMetadata } from "./og-cards.mjs";
const page = "angular/migrating-to-0-5.md";
test("Angular 0.5 migration registers its descriptive title and snippet", () => {
  assert.deepEqual(
    auditTitles().untitled.filter((name) => name === page),
    []
  );
  assert.deepEqual(
    auditDescriptions().undescribed.filter((name) => name === page),
    []
  );
  assert.match(TITLES[page], /Angular.*0\.5/);
  assert.match(DESCRIPTIONS[page], /root, features and adapter/);
});
test("Angular 0.5 migration has its own generated Angular social card", () => {
  assert.deepEqual(auditOgImages([page]), []);
  const card = ogCardMetadata().find(
    (card) => card.slug === "angular/migrating-to-0-5"
  );
  assert.equal(card.framework, "angular");
  assert.match(card.title, /Angular 0\.5/);
  const png = readFileSync(
    new URL(
      "../apps/docs/public/og/angular/migrating-to-0-5.png",
      import.meta.url
    )
  );
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});

test("Angular 0.5 migration has exactly one canonical LLM index link", () => {
  assert.deepEqual(auditLlmsIndex([page]), []);
});
