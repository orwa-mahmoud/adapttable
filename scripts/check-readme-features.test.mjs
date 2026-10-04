import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { readmeFeatureMentioned } from "./readme-feature-rules.mjs";

const scripts = dirname(fileURLToPath(import.meta.url));
const roots = [];
after(() =>
  roots.forEach((root) => rmSync(root, { recursive: true, force: true }))
);
const OTHER_FEATURES = `cell editing; feature composition; keyboard navigation;
column groups; column management; filtering; AND/OR filter tree; RTL;
pagination; row expansion; grouping; pivot; row reordering; row pinning;
pinned summary rows; cell spanning; full-width rows; row styling; PDF export;
export; formula engine; sparkline; saved views; tree data; selection; sorting;
virtualization; mobile cards; global search; header filters; custom filter types;
nested tables; row actions; aggregation; xlsx; command palette; view controls; csv`;
const readme = (ssr = "Server components", other = OTHER_FEATURES) =>
  `# Table\n\n## Features\n${other}\n${ssr}\n\n## Usage\nExamples.\n`;
function write(root, file, content) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), content);
}
function fixture(replacements = {}) {
  const root = mkdtempSync(join(tmpdir(), "vue-readme-guard-"));
  roots.push(root);
  mkdirSync(join(root, "scripts"));
  for (const file of [
    "check-readme-features.mjs",
    "packages.mjs",
    "readme-feature-rules.mjs",
  ])
    copyFileSync(join(scripts, file), join(root, "scripts", file));
  write(root, "docs/ssr-rsc.md", "Server rendering.\n");
  write(root, "README.md", replacements.root ?? readme());
  for (const [group, name] of [
    ["shared", "core"],
    ["shared", "cli"],
    ["shared", "i18n"],
    ["react", "adapter-react"],
    ["vue", "adapter-vue"],
    ["angular", "adapter-angular"],
  ]) {
    write(
      root,
      `packages/${group}/${name}/package.json`,
      JSON.stringify({ name: `@adapttable/${name}` })
    );
    write(
      root,
      `packages/${group}/${name}/README.md`,
      replacements[name] ??
        readme(
          name === "adapter-vue" ? "SSR and hydration" : "Server components"
        )
    );
  }
  return root;
}
function audit(root) {
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts/check-readme-features.mjs")],
    { cwd: root, encoding: "utf8" }
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("framework-specific README SSR terminology", () => {
  const mentions = (text, framework = "vue") =>
    readmeFeatureMentioned("ssr-rsc", /server component/i, text, framework);
  for (const text of [
    "SSR and hydration with request-local state, no browser globals during server rendering, and resources activated after mount.",
    "Server-side rendering and deterministic hydration.",
    "Server rendering with matching initial data.",
    "Server-rendered HTML hydrates on the client.",
    "SSR-safe setup.",
  ])
    it(`accepts explicit Vue server rendering: ${text}`, () =>
      assert.equal(mentions(text), true));

  for (const text of [
    "Deterministic hydration.",
    "No browser globals and resources activated after mount.",
    "React Server Components are a React-only integration.",
    "CSS runtime and client rendering.",
  ])
    it(`does not infer Vue SSR from: ${text}`, () =>
      assert.equal(mentions(text), false));

  it("preserves React, root and Angular server-component requirements", () => {
    for (const framework of ["react", undefined, "shared", "angular"]) {
      assert.equal(
        readmeFeatureMentioned(
          "ssr-rsc",
          /server component/i,
          "SSR and hydration",
          framework
        ),
        false
      );
      assert.equal(
        readmeFeatureMentioned(
          "ssr-rsc",
          /server component/i,
          "Server components",
          framework
        ),
        true
      );
    }
  });

  it("preserves every other feature's supplied matcher", () => {
    assert.equal(
      readmeFeatureMentioned(
        "cell-editing",
        /cell edit/i,
        "SSR and hydration",
        "vue"
      ),
      false
    );
    assert.equal(
      readmeFeatureMentioned(
        "cell-editing",
        /cell edit/i,
        "Cell editing",
        "vue"
      ),
      true
    );
  });
});

describe("README command uses package framework and existing feature scope", () => {
  it("accepts truthful Vue SSR alongside unchanged React/core/Angular text", () => {
    const result = audit(fixture());
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /README feature parity: 5 READMEs/);
  });

  it("rejects Vue hydration alone and an RSC disclaimer alone", () => {
    for (const phrase of [
      "Hydration",
      "React Server Components are React-only",
    ]) {
      const result = audit(fixture({ "adapter-vue": readme(phrase) }));
      assert.equal(result.status, 1);
      assert.match(
        result.output,
        /packages\/vue\/adapter-vue\/README.md does not mention: ssr-rsc/
      );
    }
  });

  it("does not borrow Vue SSR wording from outside Features", () => {
    const result = audit(
      fixture({
        "adapter-vue":
          readme("Hydration") + "\nSSR with request-local state.\n",
      })
    );
    assert.equal(result.status, 1);
    assert.match(result.output, /does not mention: ssr-rsc/);
  });

  it("keeps the existing React and root requirements", () => {
    for (const target of ["adapter-react", "root"]) {
      const result = audit(fixture({ [target]: readme("SSR and hydration") }));
      assert.equal(result.status, 1);
      assert.match(result.output, /does not mention: ssr-rsc/);
    }
  });

  it("still rejects an unrelated missing feature and an unregistered docs page", () => {
    const root = fixture({
      "adapter-vue": readme("SSR", OTHER_FEATURES.replace("cell editing;", "")),
    });
    write(root, "docs/new-feature.md", "A new feature.\n");
    const result = audit(root);
    assert.equal(result.status, 1);
    assert.match(result.output, /does not mention: cell-editing/);
    assert.match(
      result.output,
      /docs\/new-feature.md is a feature page with no entry/
    );
  });
});
