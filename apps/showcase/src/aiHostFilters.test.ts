import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyHostFilters, hostFiltersFromBag } from "./aiHostFilters";

const rows = [
  { id: "c1", team: "Core", status: "Active" },
  { id: "f1", team: "Core", status: "On leave" },
  { id: "p1", team: "Platform", status: "Active" },
];

describe("hostFiltersFromBag", () => {
  it("keeps the scripted Core team extras", () => {
    assert.deepEqual(hostFiltersFromBag({ team: ["Core"] }), {
      teams: ["Core"],
    });
  });

  it("reads a status list so Active can hide On leave", () => {
    assert.deepEqual(hostFiltersFromBag({ status: ["Active"] }), {
      statuses: ["Active"],
    });
  });

  it("unwraps a nested filters bag and conditions", () => {
    assert.deepEqual(hostFiltersFromBag({ filters: { team: "Core" } }), {
      teams: ["Core"],
    });
    assert.deepEqual(
      hostFiltersFromBag([{ key: "status", value: ["Active"] }]),
      { statuses: ["Active"] }
    );
  });

  it("clears on an empty bag", () => {
    assert.deepEqual(hostFiltersFromBag({}), {});
  });
});

describe("applyHostFilters", () => {
  it("keeps only Core when the scripted example runs", () => {
    const next = applyHostFilters(rows, hostFiltersFromBag({ team: ["Core"] }));
    assert.deepEqual(
      next.map((row) => row.id),
      ["c1", "f1"]
    );
  });

  it("keeps only Active when the reader asks for that status", () => {
    const next = applyHostFilters(
      rows,
      hostFiltersFromBag({ status: ["Active"] })
    );
    assert.deepEqual(
      next.map((row) => row.id),
      ["c1", "p1"]
    );
  });

  it("returns the same array when nothing is filtered", () => {
    assert.equal(applyHostFilters(rows, {}), rows);
  });
});
