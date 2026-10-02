/** Exercise metadata, navigation and link registration for nested docs sources. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  auditDescriptions,
  auditDocLinks,
  auditLlmsIndex,
  auditLlmsOrder,
  auditNav,
  auditOgImages,
  auditTitles,
} from "./check-doc-surface.mjs";
import { docsRoute, siteUrl } from "./site.mjs";

const pages = ["filtering.md", "angular/filtering.md"];
const temporary = [];
const fixture = () => {
  const directory = mkdtempSync(
    join(tmpdir(), "adapttable-docs-registration-")
  );
  temporary.push(directory);
  mkdirSync(join(directory, "angular"));
  return directory;
};
after(() =>
  temporary.forEach((directory) =>
    rmSync(directory, { recursive: true, force: true })
  )
);

describe("nested docs registration guards", () => {
  it("detects nested pages with no metadata and metadata for removed pages", () => {
    const titles = auditTitles(pages, {
      "filtering.md": "React filtering",
      "angular/removed.md": "Removed",
    });
    assert.deepEqual(titles.untitled, ["angular/filtering.md"]);
    assert.deepEqual(titles.stale, ["angular/removed.md"]);
    const descriptions = auditDescriptions(pages, {
      "filtering.md": "React filters",
      "angular/removed.md": "Removed guide",
    });
    assert.deepEqual(descriptions.undescribed, ["angular/filtering.md"]);
    assert.deepEqual(descriptions.stale, ["angular/removed.md"]);
  });

  it("detects nested orphan pages and dead sidebar links", () => {
    assert.deepEqual(auditNav(pages, ["filtering", "angular/removed"]), {
      orphans: ["angular/filtering"],
      dead: ["angular/removed"],
    });
  });

  it("detects missing, stale and duplicate nested LLM registrations", () => {
    assert.deepEqual(
      auditLlmsOrder(pages, [
        "filtering.md",
        "filtering.md",
        "angular/removed.md",
      ]),
      {
        unlisted: ["angular/filtering.md"],
        stale: ["angular/removed.md"],
        duplicate: ["filtering.md"],
      }
    );
    const root = `[React](${siteUrl(docsRoute("filtering"))})`;
    const angular = `[Angular](${siteUrl(docsRoute("angular/filtering"))})`;
    assert.deepEqual(auditLlmsIndex(pages, root), [
      { file: "angular/filtering.md", count: 0 },
    ]);
    assert.deepEqual(auditLlmsIndex(pages, `${root}\n${angular}\n${angular}`), [
      { file: "angular/filtering.md", count: 2 },
    ]);
    assert.deepEqual(auditLlmsIndex(pages, `${root}\n${angular}`), []);
  });

  it("requires a distinct Angular OG file even when the React card exists", () => {
    const directory = fixture();
    writeFileSync(join(directory, "filtering.png"), "fixture");
    assert.deepEqual(auditOgImages(pages, directory), ["angular/filtering.md"]);
  });

  it("rejects missing Angular sibling guides while resolving shared parents", () => {
    const directory = fixture();
    writeFileSync(join(directory, "filtering.md"), "# React");
    writeFileSync(
      join(directory, "angular/filtering.md"),
      "[React](../filtering.md) [Missing](./missing.md#details)"
    );
    assert.deepEqual(auditDocLinks(directory), [
      {
        file: "angular/filtering.md",
        href: "./missing.md#details",
        target: "angular/missing.md",
      },
    ]);
  });
});
