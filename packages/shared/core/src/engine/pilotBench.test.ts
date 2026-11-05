/**
 * Controller timings for the composed-engine pilot.
 *
 * Plain work runs on both evaluators. Grouping runs on the full one, which
 * is the convenience engine. `node scripts/bench.mjs --pilot` records the
 * same run.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { cpus, platform, release, totalmem } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { incrementalViewOf } from "../rows/incrementalView";
import { createBasicTableEngine } from "./basicTableEngine";
import {
  createTableEngine,
  type CreateTableEngineOptions,
  type TableEngine,
} from "./createTableEngine";

interface Row {
  id: string;
  name: string;
  team: string;
  points: number;
}

const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
  { key: "points", header: "Points", sortable: true },
];

const SIZES = [100, 10_000, 100_000] as const;
const REPETITIONS: Record<(typeof SIZES)[number], number> = {
  100: 21,
  10000: 11,
  100000: 5,
};

type Factory = (options: CreateTableEngineOptions<Row>) => TableEngine<Row>;

function makeRows(count: number): Row[] {
  const rows = new Array<Row>(count);
  for (let index = 0; index < count; index += 1) {
    rows[index] = {
      id: String(index),
      name: `n${index}`,
      team: index % 4 === 0 ? "core" : "web",
      points: index % 97,
    };
  }
  return rows;
}

function plainOptions(data: readonly Row[]): CreateTableEngineOptions<Row> {
  return {
    data,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    filterFn: (row) => row.team === "core" || row.points % 2 === 0,
  };
}

function patched(data: readonly Row[]): Row[] {
  const next = data.slice();
  const row = data[0];
  if (!row) return next;
  next[0] = { ...row, points: row.points + 1 };
  return next;
}

function quantile(samples: readonly number[], p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[rank] ?? 0;
}

function sample(run: () => void, repetitions: number): number[] {
  run();
  run();
  const samples: number[] = [];
  for (let index = 0; index < repetitions; index += 1) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  return samples;
}

function distribution(samples: readonly number[]) {
  return {
    repetitions: samples.length,
    min: Math.min(...samples),
    p50: quantile(samples, 50),
    p95: quantile(samples, 95),
    max: Math.max(...samples),
  };
}

/** A reproducible regression: slower at the tail, and not by a sub-frame gap. */
function regressed(basic: readonly number[], full: readonly number[]): boolean {
  const gap = quantile(basic, 95) - quantile(full, 95);
  return gap > 15 && quantile(basic, 95) > quantile(full, 95) * 1.5;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

describe("composed engine pilot", () => {
  it("keeps grouping projection in one core function", () => {
    const projection = readFileSync(
      join(ROOT, "packages/shared/core/src/grouping/groupingProjection.ts"),
      "utf8"
    );
    expect(projection.match(/export function projectGrouping\b/g)).toHaveLength(
      1
    );
    for (const path of [
      "packages/react/react/src/features/grouping.tsx",
      "packages/angular/angular/src/grouping/tableGrouping.ts",
      "packages/vue/vue/src/features/grouping.ts",
    ]) {
      const source = readFileSync(join(ROOT, path), "utf8");
      expect(source, path).toContain("projectGrouping(");
      expect(source, path).not.toContain("export function projectGrouping");
    }
  });

  it("matches plain results, releases subscriptions, and does not regress the tail", () => {
    const report: Record<string, unknown>[] = [];
    const problems: string[] = [];
    const timed = new Map<string, number[]>();

    for (const count of SIZES) {
      const data = makeRows(count);
      const options = plainOptions(data);
      const next = patched(data);
      const repetitions = REPETITIONS[count];
      const factories = {
        basic: createBasicTableEngine,
        full: createTableEngine,
      } satisfies Record<string, Factory>;

      const basic = createBasicTableEngine(options);
      const full = createTableEngine(options);
      basic.configure({ sortBy: "name", sortDir: "asc", search: "n1" });
      full.configure({ sortBy: "name", sortDir: "asc", search: "n1" });
      expect(basic.rows("full").map((row) => row.id)).toEqual(
        full.rows("full").map((row) => row.id)
      );
      basic.dispose();
      full.dispose();

      const grouped = createTableEngine(options);
      grouped.configure({ groupBy: "team" });
      const groups = incrementalViewOf<{
        groups?: readonly unknown[];
      }>(grouped.rows("full"))?.groups;
      expect(groups?.length).toBeGreaterThan(1);
      const groupedNext = patched(data);
      grouped.invalidate(["data"], { data: groupedNext });
      expect(grouped.rowByKey("0")?.points).toBe(data[0]!.points + 1);
      grouped.dispose();

      const basicFlat = createBasicTableEngine(options);
      basicFlat.configure({ groupBy: "team" });
      expect(
        incrementalViewOf<{ groups?: readonly unknown[] }>(
          basicFlat.rows("full")
        )?.groups
      ).toBeUndefined();
      basicFlat.dispose();

      for (const [name, create] of Object.entries(factories)) {
        const construct = sample(() => {
          const engine = create(options);
          engine.rows("full");
          engine.dispose();
        }, repetitions);
        const patch = sample(() => {
          const engine = create(options);
          engine.invalidate(["data"], { data: next });
          engine.rows("full");
          engine.dispose();
        }, repetitions);
        const callback = sample(() => {
          const engine = create({
            ...options,
            filterFn: (row) => row.team === "core",
          });
          engine.refreshCallbacks({
            filterFn: (row) => row.team === "core",
          });
          engine.dispose();
        }, repetitions);
        const stage = sample(() => {
          const engine = create(options);
          engine.stageCandidate({ search: "nomatch" });
          engine.discardCandidate();
          engine.dispose();
        }, repetitions);

        const engine = create(options);
        const committed = engine.rows("full");
        let notices = 0;
        engine.subscribe("all", () => {
          notices += 1;
        });
        engine.stageCandidate({ search: "nomatch" }, { data: next });
        engine.discardCandidate();
        expect(engine.rows("full")).toBe(committed);
        expect(notices).toBe(0);
        engine.refreshCallbacks({
          filterFn: (row) => row.team === "core" || row.points % 2 === 0,
        });
        expect(notices).toBe(0);
        engine.refreshCallbacks({ filterFn: undefined });
        expect(notices).toBe(1);
        engine.invalidate(["data"], { data: next });
        expect(engine.rowByKey("0")?.points).toBe(data[0]!.points + 1);
        engine.dispose();
        expect(() => engine.rows("full")).toThrow(/disposed/);

        let mounts = 0;
        for (let index = 0; index < 40; index += 1) {
          const mounted = create(options);
          mounted.subscribe("all", () => {
            mounts += 1;
          });
          mounted.dispatch({ type: "setSearch", search: "n0" });
          mounted.dispose();
        }
        expect(mounts).toBe(40);

        timed.set(`${name}:${count}:construct`, construct);
        timed.set(`${name}:${count}:patch`, patch);
        report.push({
          evaluator: name,
          rows: count,
          grouped: false,
          construct: distribution(construct),
          oneRowPatch: distribution(patch),
          callbackRefresh: distribution(callback),
          stageDiscard: distribution(stage),
          mountDisposeNotices: mounts,
        });
      }

      const basicConstruct = timed.get(`basic:${count}:construct`) ?? [];
      const fullConstruct = timed.get(`full:${count}:construct`) ?? [];
      const basicPatch = timed.get(`basic:${count}:patch`) ?? [];
      const fullPatch = timed.get(`full:${count}:patch`) ?? [];
      if (regressed(basicConstruct, fullConstruct)) {
        problems.push(`construct ${count}`);
      }
      if (regressed(basicPatch, fullPatch)) {
        problems.push(`one-row patch ${count}`);
      }
    }

    const collect = (globalThis as { gc?: () => void }).gc;
    collect?.();
    const heapBefore = process.memoryUsage().heapUsed;
    for (let index = 0; index < 40; index += 1) {
      const engine = createBasicTableEngine(plainOptions(makeRows(1000)));
      engine.subscribe("all", () => undefined);
      engine.dispose();
    }
    collect?.();
    const heapAfter = process.memoryUsage().heapUsed;

    const groupedReport = [100, 10_000].map((count) => {
      const data = makeRows(count);
      const options = plainOptions(data);
      const repetitions = count === 100 ? 21 : 11;
      const construct = sample(() => {
        const engine = createTableEngine(options);
        engine.configure({ groupBy: "team" });
        engine.rows("full");
        engine.dispose();
      }, repetitions);
      return { rows: count, grouped: true, construct: distribution(construct) };
    });

    expect(problems, problems.join(", ")).toEqual([]);

    const out = process.env.PILOT_OUT;
    if (out) {
      writeFileSync(
        out,
        `${JSON.stringify(
          {
            toolchain: { node: process.version },
            hardware: {
              platform: platform(),
              release: release(),
              cpus: cpus().length,
              cpu: cpus()[0]?.model,
              totalMem: totalmem(),
            },
            rows: [...SIZES],
            repetitions: REPETITIONS,
            heap: {
              note: "trend only",
              gcForced: typeof collect === "function",
              before: heapBefore,
              after: heapAfter,
              delta: heapAfter - heapBefore,
            },
            plain: report,
            grouped: groupedReport,
            problems,
          },
          null,
          2
        )}\n`
      );
    }
  }, 120_000);
});
