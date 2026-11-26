/**
 * Lifecycle parity for a binding's real feature host.
 *
 * The driver mounts that binding's own table. The assertions are the
 * lifecycle contract: one declaration per id, registrations read from the
 * last one; a feature's resource is acquired once and kept across a
 * repeated, reordered or re-declared list, handed the latest declaration;
 * changed dependencies replace it; a failed mount rolls back what its pass
 * acquired; every acquired resource is released exactly once. Revision
 * fan-out is the engine's existing `all` subscription, not a new selector.
 */
/**
 * One feature the driver turns into its binding's declaration. The driver
 * builds a new declaration object for every spec object it is handed, so a
 * new spec with the same id is an inline option change.
 *
 * @public
 */
export interface LifecycleDeclaration {
  /** Stable id. */
  readonly id: string;
  /** Command key `setup` registers. */
  readonly command?: string;
  /** An option the feature's mount reads through its latest declaration. */
  readonly option?: string;
  /** Values that, when any changes, replace the mounted resource. */
  readonly dependencies?: readonly unknown[];
  /** The feature's mount throws instead of acquiring. */
  readonly fail?: boolean;
}

/**
 * What the driver can see after a reconcile.
 *
 * @public
 */
export interface LifecycleObservation {
  /**
   * Replace the composed features with this list. Rejects with the failure
   * when a mount fails.
   */
  reconcile(features: readonly LifecycleDeclaration[]): Promise<void>;
  /** Release the table. */
  dispose(): Promise<void>;
  /** Command keys on the published host, in read order. */
  commands(): readonly string[];
  /** How many times this id's mount acquired its resource. */
  mounts(id: string): number;
  /** How many times this id's resource was released. */
  cleanups(id: string): number;
  /** The option the id's mounted resource reads from its latest declaration. */
  currentOption(id: string): string | undefined;
  /** How many distinct host objects have been published. */
  hostPublications(): number;
  /** Notifications from the table engine's existing revision subscription. */
  revisionNotifications(): number;
}

/**
 * The binding's lifecycle, opened as independent and nested tables.
 *
 * @public
 */
export interface FeatureLifecycleDriver {
  /** The binding's name, used in the test title. */
  readonly name: string;
  /** One table. */
  open(): Promise<LifecycleObservation>;
  /** A table destroyed by `outer.dispose`, and the outer table. */
  openNested(): Promise<{
    readonly outer: LifecycleObservation;
    readonly inner: LifecycleObservation;
  }>;
}

/**
 * The runner's `expect`, narrowed to the matchers these cases use.
 *
 * @public
 */
export interface LifecycleHarness {
  /** The runner's `expect`. */
  readonly expect: (value: unknown) => {
    toEqual(expected: unknown): void;
    toBe(expected: unknown): void;
  };
}

/**
 * The lifecycle cases every binding runs against its own table.
 *
 * @param driver - The binding's opener.
 * @param harness - The runner's `expect`.
 * @returns The cases, in the order a runner should register them.
 *
 * @public
 */
export function featureLifecycleConformanceTests(
  driver: FeatureLifecycleDriver,
  harness: LifecycleHarness
): { readonly name: string; readonly run: () => Promise<void> }[] {
  const { expect } = harness;
  const alpha: LifecycleDeclaration = { id: "alpha", command: "alpha" };
  const beta: LifecycleDeclaration = { id: "beta", command: "beta" };
  const rejected = async (run: () => Promise<void>): Promise<boolean> => {
    try {
      await run();
      return false;
    } catch {
      return true;
    }
  };
  return [
    {
      name: `${driver.name} keeps a repeated feature list on the same host`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([alpha, beta]);
        const publications = table.hostPublications();
        const revisions = table.revisionNotifications();
        await table.reconcile([alpha, beta]);
        expect(table.mounts("alpha")).toBe(1);
        expect(table.mounts("beta")).toBe(1);
        expect(table.cleanups("alpha")).toBe(0);
        expect(table.commands()).toEqual(["alpha", "beta"]);
        expect(table.hostPublications()).toBe(publications);
        expect(table.revisionNotifications()).toBe(revisions);
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(1);
        expect(table.cleanups("beta")).toBe(1);
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(1);
        expect(table.cleanups("beta")).toBe(1);
      },
    },
    {
      name: `${driver.name} does not remount features that were only reordered`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([alpha, beta]);
        const revisions = table.revisionNotifications();
        await table.reconcile([beta, alpha]);
        expect(table.mounts("alpha")).toBe(1);
        expect(table.mounts("beta")).toBe(1);
        expect(table.cleanups("alpha")).toBe(0);
        expect(table.cleanups("beta")).toBe(0);
        expect(
          table
            .commands()
            .slice()
            .sort((left, right) => left.localeCompare(right))
        ).toEqual(["alpha", "beta"]);
        expect(table.revisionNotifications()).toBe(revisions);
        await table.dispose();
      },
    },
    {
      name: `${driver.name} keeps a resource across an inline option change and hands it the latest options`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([
          { id: "alpha", command: "alpha", option: "one" },
        ]);
        await table.reconcile([
          { id: "alpha", command: "alpha", option: "two" },
        ]);
        expect(table.mounts("alpha")).toBe(1);
        expect(table.cleanups("alpha")).toBe(0);
        expect(table.currentOption("alpha")).toBe("two");
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(1);
      },
    },
    {
      name: `${driver.name} replaces a resource when its dependencies change`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([{ id: "alpha", dependencies: [1] }]);
        await table.reconcile([{ id: "alpha", dependencies: [1] }]);
        expect(table.mounts("alpha")).toBe(1);
        await table.reconcile([{ id: "alpha", dependencies: [2] }]);
        expect(table.mounts("alpha")).toBe(2);
        expect(table.cleanups("alpha")).toBe(1);
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(2);
      },
    },
    {
      name: `${driver.name} reads every part of a duplicated id from its last declaration`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([
          { id: "alpha", command: "first", option: "first" },
          { id: "alpha", command: "second", option: "second" },
        ]);
        expect(table.commands()).toEqual(["second"]);
        expect(table.mounts("alpha")).toBe(1);
        expect(table.currentOption("alpha")).toBe("second");
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(1);
      },
    },
    {
      name: `${driver.name} rolls back what a failed mount's pass acquired`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([alpha]);
        const failed = await rejected(() =>
          table.reconcile([alpha, beta, { id: "bad", fail: true }])
        );
        expect(failed).toBe(true);
        expect(table.mounts("alpha")).toBe(1);
        expect(table.mounts("beta")).toBe(1);
        expect(table.cleanups("beta")).toBe(1);
        expect(table.cleanups("bad")).toBe(0);
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(1);
        expect(table.cleanups("beta")).toBe(1);
      },
    },
    {
      name: `${driver.name} disposes a nested table once and leaves another table alone`,
      run: async () => {
        const other = await driver.open();
        const nested = await driver.openNested();
        await other.reconcile([alpha]);
        await nested.outer.reconcile([beta]);
        await nested.inner.reconcile([{ id: "inner", command: "inner" }]);
        const revisions = other.revisionNotifications();
        await nested.outer.dispose();
        expect(nested.outer.cleanups("beta")).toBe(1);
        expect(nested.inner.cleanups("inner")).toBe(1);
        expect(other.cleanups("alpha")).toBe(0);
        expect(other.commands()).toEqual(["alpha"]);
        expect(other.revisionNotifications()).toBe(revisions);
        await nested.inner.dispose();
        await nested.outer.dispose();
        expect(nested.inner.cleanups("inner")).toBe(1);
        expect(nested.outer.cleanups("beta")).toBe(1);
        await other.dispose();
        expect(other.cleanups("alpha")).toBe(1);
      },
    },
  ];
}
