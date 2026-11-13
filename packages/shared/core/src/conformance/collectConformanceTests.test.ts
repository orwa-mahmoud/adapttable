import { describe, expect, it } from "vitest";

import { collectConformanceTests } from "./collectConformanceTests";

describe("collectConformanceTests", () => {
  it("names each test by its group path, in registration order", () => {
    const tests = collectConformanceTests(({ describe: group, it: add }) => {
      add("top", () => undefined);
      group("outer", () => {
        add("one", () => undefined);
        group("inner", () => {
          add("two", () => undefined);
        });
      });
    });
    expect(tests.map((test) => test.name)).toEqual([
      "top",
      "outer > one",
      "outer > inner > two",
    ]);
  });

  it("runs setup outermost first and teardown innermost first", async () => {
    const calls: string[] = [];
    const tests = collectConformanceTests(
      ({ describe: group, it: add, beforeEach, afterEach }) => {
        beforeEach(() => {
          calls.push("before outer");
          return () => calls.push("returned teardown");
        });
        afterEach(() => calls.push("after outer"));
        group("group", () => {
          beforeEach(() => calls.push("before inner"));
          afterEach(() => calls.push("after inner"));
          add("body", async () => {
            await Promise.resolve();
            calls.push("body");
          });
        });
      }
    );
    await tests[0]!.run();
    expect(calls).toEqual([
      "before outer",
      "before inner",
      "body",
      "returned teardown",
      "after inner",
      "after outer",
    ]);
  });

  it("applies a hook registered after the test it wraps", async () => {
    const calls: string[] = [];
    const tests = collectConformanceTests(({ it: add, beforeEach }) => {
      add("body", () => calls.push("body"));
      beforeEach(() => calls.push("before"));
    });
    await tests[0]!.run();
    expect(calls).toEqual(["before", "body"]);
  });

  it("tears down after a failing test and still reports the failure", async () => {
    const calls: string[] = [];
    const tests = collectConformanceTests(({ it: add, afterEach }) => {
      afterEach(() => calls.push("after"));
      add("fails", () => {
        throw new Error("boom");
      });
    });
    await expect(tests[0]!.run()).rejects.toThrow("boom");
    expect(calls).toEqual(["after"]);
  });

  it("registers one test per case, formatting and spreading each case", async () => {
    const seen: unknown[][] = [];
    const tests = collectConformanceTests(({ it: add }) => {
      add.each([
        ["Ctrl", 1.7],
        ["Cmd", 2],
      ] as const)("opens on %s+F number %d", (key, count) => {
        seen.push([key, count]);
      });
      add.each(["solo"])("takes %s alone", (value) => {
        seen.push([value]);
      });
    });
    for (const test of tests) await test.run();
    expect(tests.map((test) => test.name)).toEqual([
      "opens on Ctrl+F number 1",
      "opens on Cmd+F number 2",
      "takes solo alone",
    ]);
    expect(seen).toEqual([["Ctrl", 1.7], ["Cmd", 2], ["solo"]]);
  });

  it("registers one group per case", () => {
    const tests = collectConformanceTests(({ describe: group, it: add }) => {
      group.each(["prop", "feature"] as const)("via %s", (path) => {
        add(`reads ${path}`, () => undefined);
      });
    });
    expect(tests.map((test) => test.name)).toEqual([
      "via prop > reads prop",
      "via feature > reads feature",
    ]);
  });

  it("refuses a name with more placeholders than its case has values", () => {
    expect(() =>
      collectConformanceTests(({ it: add }) => {
        add.each(["one"])("%s and %s", () => undefined);
      })
    ).toThrow(
      'Test name "%s and %s" has more placeholders than its case has values (1).'
    );
  });
});
