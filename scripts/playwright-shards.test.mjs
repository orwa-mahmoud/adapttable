import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { planShards, reportTests } from "./playwright-shards.mjs";

/** A JSON report with one file holding `titles`, each run for `ms`. */
function report(file, timings) {
  return {
    suites: [
      {
        file,
        specs: Object.entries(timings).map(([title, ms]) => ({
          title,
          tests: [{ projectName: "chromium", results: [{ duration: ms }] }],
        })),
      },
    ],
  };
}

describe("playwright shards", () => {
  const timed = [
    ...reportTests(report("a.spec.ts", { slow: 900, quick: 100 })),
    ...reportTests(report("b.spec.ts", { mid: 500, mid2: 400 })),
  ];

  it("places every test unit in exactly one list", () => {
    const shards = planShards(timed, timed, 3);
    const lines = shards.flatMap((shard) => shard.lines).sort();
    assert.deepEqual(lines, [
      "[chromium] › a.spec.ts › quick",
      "[chromium] › a.spec.ts › slow",
      "[chromium] › b.spec.ts › mid",
      "[chromium] › b.spec.ts › mid2",
    ]);
  });

  it("balances the lists by measured time", () => {
    const totals = planShards(timed, timed, 2)
      .map((shard) => shard.ms)
      .sort((a, b) => a - b);
    assert.deepEqual(totals, [900, 1000]);
  });

  it("counts a test with no timing as the median unit", () => {
    const current = [
      ...timed,
      ...reportTests(report("c.spec.ts", { fresh: 0 })),
    ];
    const shards = planShards(current, timed, 2);
    assert.ok(
      shards.some((shard) =>
        shard.lines.includes("[chromium] › c.spec.ts › fresh")
      )
    );
    assert.equal(
      shards.reduce((sum, shard) => sum + shard.ms, 0),
      1900 + 500
    );
  });

  it("schedules a file whole when a title holds the list delimiter", () => {
    const tests = reportTests(report("d.spec.ts", { "a › b": 10 }));
    assert.deepEqual(planShards(tests, tests, 1)[0].lines, [
      "[chromium] › d.spec.ts",
    ]);
  });

  it("schedules a file that imports specs whole, naming both files", () => {
    const tests = reportTests({
      suites: [
        {
          file: "wrapper.spec.ts",
          specs: [
            {
              title: "own",
              file: "wrapper.spec.ts",
              tests: [{ projectName: "chromium", results: [{ duration: 5 }] }],
            },
          ],
          suites: [
            {
              title: "imported",
              specs: [
                {
                  title: "case",
                  file: "../pkg/browser/case.spec.ts",
                  tests: [
                    { projectName: "chromium", results: [{ duration: 7 }] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const shards = planShards(tests, tests, 2);
    assert.deepEqual(
      shards.map((shard) => shard.lines),
      [
        [
          "[chromium] › wrapper.spec.ts",
          "[chromium] › ../pkg/browser/case.spec.ts",
        ],
        [],
      ]
    );
    assert.equal(shards[0].ms, 12);
  });
});
