/**
 * Write a shared suite the way a test file reads, and hand the caller's runner
 * a flat list of tests.
 *
 * A shared suite runs in many packages, each with its own runner. Its body
 * calls `describe`, `it`, `beforeEach` and `afterEach` from the registry it is
 * given; {@link collectConformanceTests} turns those calls into
 * {@link ConformanceTest}s whose names carry their `describe` path and whose
 * runs carry their hooks. The package that owns the kit registers each one:
 *
 * ```ts
 * for (const test of undoTests(kit)) it(test.name, test.run);
 * ```
 */
import type { ConformanceTest } from "./tableConformance";

/**
 * A test or hook body: synchronous, or a promise the run awaits. A function a
 * `beforeEach` body returns runs after the test.
 *
 * @public
 */
export type ConformanceBody = () => unknown;

/**
 * Registers tests under the current `describe` path.
 *
 * @public
 */
export interface ConformanceIt {
  /** Register one test. */
  (name: string, body: ConformanceBody): void;
  /**
   * Register one test per case. `%s`, `%d` and `%i` in the name take the
   * case's values in order; an array case spreads into the body's arguments.
   */
  each<TCase>(
    cases: readonly TCase[]
  ): (name: string, body: (...args: CaseArgs<TCase>) => unknown) => void;
}

/**
 * Groups tests under a name, which prefixes theirs.
 *
 * @public
 */
export interface ConformanceDescribe {
  /** Register a group. */
  (name: string, body: () => void): void;
  /** Register one group per case, named and called as {@link ConformanceIt.each} does. */
  each<TCase>(
    cases: readonly TCase[]
  ): (name: string, body: (...args: CaseArgs<TCase>) => void) => void;
}

/**
 * The arguments a case hands its body: an array case spreads, any other case
 * is the one argument.
 *
 * @public
 */
export type CaseArgs<TCase> = TCase extends readonly unknown[]
  ? [...TCase]
  : [TCase];

/**
 * What a shared suite's body is given in place of the runner's globals.
 *
 * @public
 */
export interface ConformanceRegistry {
  /** Group tests. */
  readonly describe: ConformanceDescribe;
  /** Register a test. */
  readonly it: ConformanceIt;
  /** Run before every test in the current group and the groups inside it. */
  readonly beforeEach: (body: ConformanceBody) => void;
  /** Run after every test in the current group, even one that failed. */
  readonly afterEach: (body: ConformanceBody) => void;
}

interface Scope {
  readonly name: string;
  readonly before: ConformanceBody[];
  readonly after: ConformanceBody[];
}

const PLACEHOLDER = /%[sdi]/g;

/** A case's values, in the order the body receives them. */
function caseArgs<TCase>(value: TCase): CaseArgs<TCase> {
  return (Array.isArray(value) ? value : [value]) as CaseArgs<TCase>;
}

/** A name with each placeholder replaced by the next case value. */
function formatName(name: string, args: readonly unknown[]): string {
  let index = 0;
  return name.replace(PLACEHOLDER, (placeholder) => {
    if (index >= args.length) {
      throw new Error(
        `Test name "${name}" has more placeholders than its case has values (${args.length}).`
      );
    }
    const value = args[index++];
    return placeholder === "%s"
      ? String(value)
      : String(Math.trunc(Number(value)));
  });
}

/** Run a test with its groups' hooks, outermost setup first. */
async function runWithHooks(
  scopes: readonly Scope[],
  body: ConformanceBody
): Promise<void> {
  const teardowns: ConformanceBody[] = [];
  try {
    for (const scope of scopes) {
      for (const setup of scope.before) {
        const teardown = await setup();
        if (typeof teardown === "function") {
          teardowns.push(teardown as ConformanceBody);
        }
      }
    }
    await body();
  } finally {
    for (const teardown of [...teardowns].reverse()) await teardown();
    for (const scope of [...scopes].reverse()) {
      for (const after of scope.after) await after();
    }
  }
}

/**
 * The tests a shared suite's body registers, flattened for a runner.
 *
 * @param define - The suite's body; it registers through the registry.
 * @returns The tests, in registration order, each named by its group path.
 *
 * @public
 */
export function collectConformanceTests(
  define: (registry: ConformanceRegistry) => void
): readonly ConformanceTest[] {
  const tests: ConformanceTest[] = [];
  const stack: Scope[] = [{ name: "", before: [], after: [] }];
  const current = (): Scope => stack.at(-1)!;

  const register = (name: string, body: ConformanceBody): void => {
    const scopes = [...stack];
    const path = scopes
      .map((scope) => scope.name)
      .filter((part) => part !== "");
    tests.push({
      name: [...path, name].join(" > "),
      run: () => runWithHooks(scopes, body),
    });
  };
  const group = (name: string, body: () => void): void => {
    stack.push({ name, before: [], after: [] });
    try {
      body();
    } finally {
      stack.pop();
    }
  };

  const it: ConformanceIt = Object.assign(register, {
    each:
      <TCase>(cases: readonly TCase[]) =>
      (name: string, body: (...args: CaseArgs<TCase>) => unknown) => {
        for (const value of cases) {
          const args = caseArgs(value);
          register(formatName(name, args), () => body(...args));
        }
      },
  });
  const describe: ConformanceDescribe = Object.assign(group, {
    each:
      <TCase>(cases: readonly TCase[]) =>
      (name: string, body: (...args: CaseArgs<TCase>) => void) => {
        for (const value of cases) {
          const args = caseArgs(value);
          group(formatName(name, args), () => {
            body(...args);
          });
        }
      },
  });

  define({
    describe,
    it,
    beforeEach: (body) => {
      current().before.push(body);
    },
    afterEach: (body) => {
      current().after.push(body);
    },
  });
  return tests;
}
