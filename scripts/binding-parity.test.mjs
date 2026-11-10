import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bindingEntries,
  comparableName,
  parityProblems,
} from "./binding-parity.mjs";

const NONE = { frameworkOnlyEntries: {}, names: {} };

describe("binding parity", () => {
  it("reads Angular's inject functions and Adapt components as the others' names", () => {
    assert.equal(comparableName("injectDataTable", "angular"), "useDataTable");
    assert.equal(comparableName("AdaptDataTable", "angular"), "DataTable");
    assert.equal(
      comparableName("RowEditingInjectOptions", "angular"),
      "RowEditingOptions"
    );
    assert.equal(comparableName("injectDataTable", "react"), "injectDataTable");
  });

  it("groups contract surfaces by binding and entry", () => {
    const entries = bindingEntries({
      react: ["a"],
      "react-pdf": ["b"],
      "vue-adapter": ["c"],
      core: ["d"],
    });
    assert.deepEqual(entries.react, { ".": ["a"], pdf: ["b"] });
    assert.deepEqual(entries.vue, { adapter: ["c"] });
  });

  it("passes names every binding exports", () => {
    const entries = {
      react: { ".": ["useDataTable"] },
      vue: { ".": ["useDataTable"] },
      angular: { ".": ["injectDataTable"] },
    };
    assert.deepEqual(parityProblems(entries, NONE).problems, []);
  });

  it("fails a name one binding adds, until it is allow-listed", () => {
    const entries = {
      react: { ".": ["useDataTable", "useExtra"] },
      vue: { ".": ["useDataTable"] },
      angular: { ".": ["injectDataTable"] },
    };
    assert.match(
      parityProblems(entries, NONE).problems.join("\n"),
      /react \.: useExtra is not in every binding/
    );
    const listed = {
      ...NONE,
      names: { react: { ".": { useExtra: "React-only hook" } } },
    };
    assert.deepEqual(parityProblems(entries, listed).problems, []);
  });

  it("fails a listed name that every binding now exports, or none does", () => {
    const entries = {
      react: { ".": ["shared"] },
      vue: { ".": ["shared"] },
      angular: { ".": ["shared"] },
    };
    const listed = {
      ...NONE,
      names: { react: { ".": { shared: "x", gone: "y" } } },
    };
    const problems = parityProblems(entries, listed).problems.join("\n");
    assert.match(problems, /shared is now in every binding/);
    assert.match(problems, /gone is allow-listed but no longer exported/);
  });

  it("fails a shared entry one binding lacks, unless it is framework-only", () => {
    const entries = {
      react: { ".": [], pdf: [] },
      vue: { ".": [], pdf: [] },
      angular: { ".": [], router: [] },
    };
    const problems = parityProblems(entries, {
      ...NONE,
      frameworkOnlyEntries: { angular: ["router"] },
    }).problems;
    assert.deepEqual(problems, ["angular: no ./pdf entry"]);
  });
});
