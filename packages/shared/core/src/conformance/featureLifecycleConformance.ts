/**
 * Registration parity for a binding's real feature lifecycle.
 *
 * The driver mounts that binding's own host. The assertions are the
 * registration contract: last id wins, a repeated or reordered list does not
 * mount again, a failed feature rolls back alone, and a nested table's
 * cleanup runs once. Revision fan-out is the engine's existing `all`
 * subscription, not a new selector.
 */
/**
 * One feature the driver turns into its binding's declaration.
 *
 * @public
 */
export interface LifecycleDeclaration {
  /** Stable id. */
  readonly id: string;
  /** Command key `setup` registers. Omit when the feature fails first. */
  readonly command?: string;
  /** The feature fails while mounting, after it has registered a cleanup. */
  readonly fail?: boolean;
}

/**
 * What the driver can see after a reconcile.
 *
 * @public
 */
export interface LifecycleObservation {
  /** Replace the mounted features with this list. */
  reconcile(features: readonly LifecycleDeclaration[]): Promise<void>;
  /** Release the table. */
  dispose(): Promise<void>;
  /** Command keys on the published host, in read order. */
  commands(): readonly string[];
  /** How many times this id's setup ran. */
  setups(id: string): number;
  /** How many times this id's cleanup ran. */
  cleanups(id: string): number;
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
 * The registration cases every binding runs against its own lifecycle.
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
  return [
    {
      name: `${driver.name} keeps a repeated feature list on the same host`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([alpha, beta]);
        const publications = table.hostPublications();
        const revisions = table.revisionNotifications();
        await table.reconcile([alpha, beta]);
        expect(table.setups("alpha")).toBe(1);
        expect(table.setups("beta")).toBe(1);
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
        expect(table.setups("alpha")).toBe(1);
        expect(table.setups("beta")).toBe(1);
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
      name: `${driver.name} keeps the last feature of a duplicated id`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([
          { id: "alpha", command: "first" },
          { id: "alpha", command: "second" },
        ]);
        expect(table.commands()).toEqual(["second"]);
        expect(table.setups("alpha")).toBe(1);
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(1);
      },
    },
    {
      name: `${driver.name} rolls a failed feature back and leaves the earlier one`,
      run: async () => {
        const table = await driver.open();
        await table.reconcile([alpha]);
        let failed = false;
        try {
          await table.reconcile([alpha, { id: "bad", fail: true }]);
        } catch {
          failed = true;
        }
        expect(failed).toBe(true);
        expect(table.commands()).toEqual(["alpha"]);
        expect(table.setups("alpha")).toBe(1);
        expect(table.cleanups("alpha")).toBe(0);
        expect(table.cleanups("bad")).toBe(1);
        await table.dispose();
        expect(table.cleanups("alpha")).toBe(1);
        expect(table.cleanups("bad")).toBe(1);
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
