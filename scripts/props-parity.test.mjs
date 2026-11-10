import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { propsProblems } from "./props-parity.mjs";

const BASE = {
  core: ["locale"],
  props: {
    react: ["locale", "columns"],
    vue: ["locale", "columns"],
    angular: ["locale", "columns"],
  },
  featureProps: [],
  allow: {},
};

describe("props parity", () => {
  it("passes options and props every binding takes", () => {
    assert.deepEqual(propsProblems(BASE).problems, []);
  });

  it("counts a prop a feature carries as reaching the table", () => {
    const viaFeature = {
      ...BASE,
      core: ["locale", "pinnedRowIds"],
      props: { ...BASE.props, react: [...BASE.props.react, "pinnedRowIds"] },
      featureProps: ["pinnedRowIds"],
    };
    assert.deepEqual(propsProblems(viaFeature).problems, []);
  });

  it("fails a core option one binding cannot reach, until it is allow-listed", () => {
    const gap = { ...BASE, core: ["locale", "maxHeight"] };
    const problems = propsProblems(gap).problems;
    assert.equal(problems.length, 3);
    assert.match(problems[0], /maxHeight reaches core but not/);
    const allowed = {
      ...gap,
      allow: {
        react: { maxHeight: "x" },
        vue: { maxHeight: "x" },
        angular: { maxHeight: "x" },
      },
    };
    assert.deepEqual(propsProblems(allowed).problems, []);
  });

  it("fails a listed gap that closed, or a name nothing declares", () => {
    const stale = {
      ...BASE,
      allow: { react: { locale: "x", gone: "y" } },
    };
    const problems = propsProblems(stale).problems.join("\n");
    assert.match(problems, /locale now reaches every binding/);
    assert.match(
      problems,
      /gone is allow-listed but no binding or core names it/
    );
  });
});
