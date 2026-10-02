import {
  featureSlotKey,
  featureStateKey,
  slotRender,
} from "@adapttable/core/binding";
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectDataTable } from "./dataTable";
import {
  type AdaptTableFeature,
  provideAdaptTableFeatures,
  tableFeaturesOf,
} from "./featureHost";
import {
  createFeatureResources,
  type FeatureMountContext,
  mountTableFeatures,
} from "./featureLifecycle";
import { createFeatureState, injectFeatureState } from "./featureState";
import { tableRuntimeFor } from "./layout/tableRuntime";
import { AdaptSlot } from "./slots";
import { injectFrontendData } from "./source/frontendData";

const LABEL = featureStateKey<string>("test-label");
const DRAW = featureSlotKey<object>("test-draw");

@Component({ template: `<output>{{ label() }}</output>` })
class LabelSlot {
  readonly props = input.required<object>();
  readonly label = injectFeatureState(LABEL);
}

const setups = vi.fn();
const mounts = vi.fn();
const cleanup = vi.fn();
const oldSetup = vi.fn();
const oldMount = vi.fn();
const effects = vi.fn();
let mounted: FeatureMountContext | undefined;
const own: AdaptTableFeature = {
  id: "shared",
  apply: () => ({ densityChooser: true }),
  setup: () => {
    setups();
  },
  renders: [slotRender(DRAW, () => LabelSlot)],
  mount: (context) => {
    mounts();
    mounted = context;
    expect(injectFeatureState(LABEL)).toBe(context.state.get(LABEL));
    effect(() => {
      context.runtime.view();
      effects();
    });
    context.state.set(LABEL, "mounted");
    return () => {
      context.state.set(LABEL, undefined);
      cleanup();
    };
  },
};

@Component({
  imports: [AdaptSlot],
  template: `<ng-container
    [adaptSlot]="slot"
    [adaptSlotProps]="{}"
    [adaptSlotTable]="table"
  />`,
})
class Host {
  readonly injector = inject(Injector);
  readonly rows = signal([{ id: "1" }]);
  readonly source = injectFrontendData({
    data: this.rows,
    columns: [{ key: "id" }],
    urlSync: false,
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: [{ key: "id" }],
    rowKey: (row) => row.id,
    features: [own],
  });
  readonly slot = DRAW;
  readonly features = tableFeaturesOf(this.injector, [own]);
  readonly runtime = tableRuntimeFor(this.table, this.source, this.features);
  readonly dispose = mountTableFeatures(this.features, {
    runtime: this.runtime,
    state: this.table.featureState,
    injector: this.injector,
  });
}

@Component({
  imports: [AdaptSlot],
  template: `<ng-container
    [adaptSlot]="slot"
    [adaptSlotProps]="{}"
    [adaptSlotTable]="table"
  />`,
})
class ReactiveHost {
  readonly injector = inject(Injector);
  readonly features = signal<readonly AdaptTableFeature[]>([]);
  readonly source = injectFrontendData({
    data: [{ id: "1" }],
    columns: [{ key: "id" }],
    urlSync: false,
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: [{ key: "id" }],
    rowKey: (row) => row.id,
    features: this.features,
  });
  readonly slot = DRAW;
  readonly resolved = computed(() =>
    tableFeaturesOf(this.injector, this.features())
  );
  readonly runtime = tableRuntimeFor(this.table, this.source, this.resolved);
  readonly dispose = mountTableFeatures(this.resolved, {
    runtime: this.runtime,
    state: this.table.featureState,
    injector: this.injector,
  });
}

describe("reactive mounted feature lifecycle", () => {
  it("updates slot state and options on a retained table while releasing removed mounts once", async () => {
    const firstMount = vi.fn();
    const firstCleanup = vi.fn();
    const firstDestroy = vi.fn();
    const secondMount = vi.fn();
    const secondCleanup = vi.fn();
    const unrelatedMount = vi.fn();
    const unrelatedCleanup = vi.fn();
    const first: AdaptTableFeature = {
      id: "first",
      apply: () => ({ densityChooser: true }),
      renders: [slotRender(DRAW, () => LabelSlot)],
      mount: ({ state }) => {
        firstMount();
        inject(DestroyRef).onDestroy(firstDestroy);
        state.set(LABEL, "first label");
        return () => {
          state.set(LABEL, undefined);
          firstCleanup();
        };
      },
    };
    const second: AdaptTableFeature = {
      id: "second",
      apply: () => ({ fitColumns: true }),
      renders: [slotRender(DRAW, () => LabelSlot)],
      mount: ({ state }) => {
        secondMount();
        state.set(LABEL, "second label");
        return () => {
          state.set(LABEL, undefined);
          secondCleanup();
        };
      },
    };
    const unrelated: AdaptTableFeature = {
      id: "unrelated",
      mount: () => {
        unrelatedMount();
        return unrelatedCleanup;
      },
    };
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const table = host.table;
    const state = table.featureState.get(LABEL);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector("output")).toBeNull();
    host.features.set([first]);
    await fixture.whenStable();
    const output = element.querySelector("output")!;
    expect(output.textContent).toBe("first label");
    expect(table.featureOptions).toEqual({ densityChooser: true });
    expect(table.hasSlot(DRAW)).toBe(true);
    expect(firstMount).toHaveBeenCalledTimes(1);

    host.features.set([first]);
    await fixture.whenStable();
    expect(element.querySelector("output")).toBe(output);
    expect(firstMount).toHaveBeenCalledTimes(1);
    expect(firstCleanup).not.toHaveBeenCalled();
    host.features.set([first, unrelated]);
    await fixture.whenStable();
    expect(output.textContent).toBe("first label");
    expect(firstMount).toHaveBeenCalledTimes(1);
    expect(unrelatedMount).toHaveBeenCalledTimes(1);

    host.features.set([second, unrelated]);
    await fixture.whenStable();
    expect(host.table).toBe(table);
    expect(table.featureState.get(LABEL)).toBe(state);
    expect(state()).toBe("second label");
    expect(element.querySelector("output")!.textContent).toBe("second label");
    expect(table.featureOptions).toEqual({ fitColumns: true });
    expect(host.runtime.featureIds()).toEqual(["second", "unrelated"]);
    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(firstDestroy).toHaveBeenCalledTimes(1);
    expect(secondMount).toHaveBeenCalledTimes(1);
    expect(unrelatedMount).toHaveBeenCalledTimes(1);

    host.features.set([]);
    await fixture.whenStable();
    expect(element.querySelector("output")).toBeNull();
    expect(table.hasSlot(DRAW)).toBe(false);
    expect(table.featureOptions).toEqual({});
    expect(state()).toBeUndefined();
    expect(secondCleanup).toHaveBeenCalledTimes(1);
    expect(unrelatedCleanup).toHaveBeenCalledTimes(1);
    host.dispose();
    host.dispose();
    fixture.destroy();
    expect(firstCleanup).toHaveBeenCalledTimes(1);
    expect(firstDestroy).toHaveBeenCalledTimes(1);
    expect(secondCleanup).toHaveBeenCalledTimes(1);
    expect(unrelatedCleanup).toHaveBeenCalledTimes(1);
  });

  it("keeps anonymous mounts for the same member and replaces a changed member with the same id", async () => {
    const anonymousMount = vi.fn();
    const anonymousCleanup = vi.fn();
    const originalMount = vi.fn();
    const originalCleanup = vi.fn();
    const replacementMount = vi.fn();
    const replacementCleanup = vi.fn();
    const anonymous: AdaptTableFeature = {
      mount: () => {
        anonymousMount();
        return anonymousCleanup;
      },
    };
    const original: AdaptTableFeature = {
      id: "replaceable",
      mount: () => {
        originalMount();
        return originalCleanup;
      },
    };
    const replacement: AdaptTableFeature = {
      id: "replaceable",
      mount: () => {
        replacementMount();
        return replacementCleanup;
      },
    };
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.autoDetectChanges();
    const host = fixture.componentInstance;
    host.features.set([anonymous, original]);
    await fixture.whenStable();
    expect(anonymousMount).toHaveBeenCalledTimes(1);
    expect(originalMount).toHaveBeenCalledTimes(1);
    host.features.set([anonymous, original]);
    await fixture.whenStable();
    expect(anonymousMount).toHaveBeenCalledTimes(1);
    expect(originalMount).toHaveBeenCalledTimes(1);
    expect(anonymousCleanup).not.toHaveBeenCalled();
    expect(originalCleanup).not.toHaveBeenCalled();
    host.features.set([anonymous, replacement]);
    await fixture.whenStable();
    expect(anonymousMount).toHaveBeenCalledTimes(1);
    expect(originalCleanup).toHaveBeenCalledTimes(1);
    expect(replacementMount).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(anonymousCleanup).toHaveBeenCalledTimes(1);
    expect(originalCleanup).toHaveBeenCalledTimes(1);
    expect(replacementCleanup).toHaveBeenCalledTimes(1);
  });
});

describe("feature resources", () => {
  it("retains state for equal dependencies and releases replaced, omitted and parent-owned scopes once", () => {
    const parent = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    });
    const resources = createFeatureResources(parent);
    const releases: string[] = [];
    const create = (name: string) => (injector: Injector) => {
      expect(inject(Injector)).toBe(injector);
      inject(DestroyRef).onDestroy(() => releases.push(name));
      return { count: signal(0) };
    };
    const dependency = {};
    const original = resources.reconcile(() => {
      resources.use("removed", [], create("removed"));
      return resources.use(
        "retained",
        [dependency, Number.NaN],
        create("original")
      );
    });
    original.count.set(7);
    const retained = resources.reconcile(() =>
      resources.use("retained", [dependency, Number.NaN], create("unused"))
    );
    expect(retained).toBe(original);
    expect(retained.count()).toBe(7);
    expect(releases).toEqual(["removed"]);
    const replacement = resources.reconcile(() =>
      resources.use("retained", [{}, Number.NaN], create("replacement"))
    );
    expect(replacement).not.toBe(original);
    expect(replacement.count()).toBe(0);
    expect(releases).toEqual(["removed", "original"]);
    parent.destroy();
    expect(releases).toEqual(["removed", "original", "replacement"]);
    resources.dispose();
    expect(releases).toEqual(["removed", "original", "replacement"]);
    expect(() => resources.reconcile(() => undefined)).toThrow(
      "Table feature resources have been disposed"
    );
    expect(() => resources.use("late", [], create("late"))).toThrow(
      "Table feature resources have been disposed"
    );
  });

  it("copies dependency lists and replaces a resource when their values or length change", () => {
    const parent = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    });
    const resources = createFeatureResources(parent);
    const release = vi.fn();
    const create = vi.fn(() => {
      inject(DestroyRef).onDestroy(release);
      return {};
    });
    const dependencies: unknown[] = ["initial"];
    const initial = resources.reconcile(() =>
      resources.use("item", dependencies, create)
    );
    dependencies[0] = "changed";
    const changed = resources.reconcile(() =>
      resources.use("item", dependencies, create)
    );
    expect(changed).not.toBe(initial);
    expect(release).toHaveBeenCalledTimes(1);
    const extended = resources.reconcile(() =>
      resources.use("item", ["changed", "extra"], create)
    );
    expect(extended).not.toBe(changed);
    expect(create).toHaveBeenCalledTimes(3);
    expect(release).toHaveBeenCalledTimes(2);
    resources.dispose();
    parent.destroy();
    expect(release).toHaveBeenCalledTimes(3);
  });

  it.each(["omission", "disposal"])(
    "reports all scope cleanup failures during %s and still releases every resource once",
    (operation) => {
      const parent = Injector.create({
        providers: [],
        parent: TestBed.inject(Injector),
      });
      const resources = createFeatureResources(parent);
      const firstError = new Error("first scope failed");
      const lastError = new Error("last scope failed");
      const releases: string[] = [];
      resources.reconcile(() => {
        for (const [name, failure] of [
          ["first", firstError],
          ["middle", undefined],
          ["last", lastError],
        ] as const) {
          resources.use(name, [], () => {
            inject(DestroyRef).onDestroy(() => {
              releases.push(name);
              if (failure) throw failure;
            });
          });
        }
      });
      let reported: unknown;
      try {
        if (operation === "omission") resources.reconcile(() => undefined);
        else resources.dispose();
      } catch (error) {
        reported = error;
      }
      expect(reported).toBeInstanceOf(AggregateError);
      expect((reported as AggregateError).errors).toEqual([
        lastError,
        firstError,
      ]);
      expect(releases).toEqual(["last", "middle", "first"]);
      expect(() => resources.dispose()).not.toThrow();
      parent.destroy();
      expect(releases).toEqual(["last", "middle", "first"]);
    }
  );

  it("releases a failed creation scope and preserves creation and cleanup errors", () => {
    const parent = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    });
    const resources = createFeatureResources(parent);
    const creationError = new Error("cannot create controller");
    const cleanupError = new Error("cannot release controller");
    const release = vi.fn(() => {
      throw cleanupError;
    });
    let reported: unknown;
    try {
      resources.reconcile(() =>
        resources.use("failed", [], () => {
          inject(DestroyRef).onDestroy(release);
          throw creationError;
        })
      );
    } catch (error) {
      reported = error;
    }
    expect(reported).toBeInstanceOf(AggregateError);
    expect((reported as AggregateError).errors).toEqual([
      creationError,
      cleanupError,
    ]);
    expect(release).toHaveBeenCalledTimes(1);
    resources.dispose();
    parent.destroy();
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("mounted feature lifecycle", () => {
  it("resolves provided and own features once for setup, apply, slots and mount", async () => {
    const providedMount = vi.fn();
    const providedCleanup = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideAdaptTableFeatures(
          { id: "shared", setup: oldSetup, mount: oldMount },
          {
            id: "provided",
            apply: () => ({ fitColumns: true }),
            mount: () => {
              providedMount();
              return providedCleanup;
            },
          }
        ),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    expect(host.table.featureOptions).toMatchObject({
      densityChooser: true,
      fitColumns: true,
    });
    expect(oldSetup).not.toHaveBeenCalled();
    expect(oldMount).not.toHaveBeenCalled();
    expect(setups).toHaveBeenCalledTimes(1);
    expect(mounts).toHaveBeenCalledTimes(1);
    expect(providedMount).toHaveBeenCalledTimes(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector("output")
        ?.textContent
    ).toBe("mounted");
    mounted!.state.set(LABEL, "changed");
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector("output")
        ?.textContent
    ).toBe("changed");
    const effectCount = effects.mock.calls.length;
    host.rows.set([{ id: "2" }]);
    await fixture.whenStable();
    expect(effects.mock.calls.length).toBeGreaterThan(effectCount);
    const settledCount = effects.mock.calls.length;
    await fixture.whenStable();
    expect(effects).toHaveBeenCalledTimes(settledCount);
    host.dispose();
    host.dispose();
    fixture.destroy();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(providedCleanup).toHaveBeenCalledTimes(1);
    expect(host.table.featureState.get(LABEL)()).toBeUndefined();
  });

  it("runs cleanup on table destruction and does not flush a destroyed table", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const context = mounted!;
    expect(context.flush(() => 42)).toBe(42);
    fixture.destroy();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(() => context.flushAdmission()).not.toThrow();
  });

  it("mounts anonymous callbacks and prevents recursive admission flushes", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    let nested: FeatureMountContext | undefined;
    const reads = vi.fn(() => {
      nested?.flushAdmission();
      return host.runtime.view();
    });
    const dispose = mountTableFeatures(
      [
        {
          mount: (context) => {
            nested = context;
          },
        },
        {},
      ],
      {
        runtime: { ...host.runtime, view: reads },
        state: createFeatureState(),
        injector: host.injector,
      }
    );
    nested!.flushAdmission();
    expect(reads).toHaveBeenCalledTimes(1);
    dispose();
    fixture.destroy();
  });

  it("runs every cleanup and destroys the injection scope after a cleanup throws", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const failure = new Error("feature cleanup failed");
    const first = vi.fn();
    const last = vi.fn();
    const injectedDestroy = vi.fn();
    const failed = vi.fn(() => {
      throw failure;
    });
    const dispose = mountTableFeatures(
      [
        {
          id: "a",
          mount: () => {
            inject(DestroyRef).onDestroy(injectedDestroy);
            return first;
          },
        },
        { id: "b", mount: () => failed },
        { id: "c", mount: () => last },
      ],
      {
        runtime: host.runtime,
        state: createFeatureState(),
        injector: host.injector,
      }
    );
    expect(dispose).toThrow(AggregateError);
    expect(first).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(last).toHaveBeenCalledTimes(1);
    expect(injectedDestroy).toHaveBeenCalledTimes(1);
    expect(() => dispose()).not.toThrow();
    fixture.destroy();
    expect(first).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(last).toHaveBeenCalledTimes(1);
    expect(injectedDestroy).toHaveBeenCalledTimes(1);
  });

  it("preserves mounting and disposal errors after releasing every mounted feature", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const mountError = new Error("cannot mount");
    const cleanupError = new Error("cannot clean up");
    const injectorError = new Error("cannot destroy provider");
    const released = vi.fn();
    let reported: unknown;
    try {
      mountTableFeatures(
        [
          {
            id: "a",
            mount: () => {
              inject(DestroyRef).onDestroy(() => {
                throw injectorError;
              });
              return released;
            },
          },
          {
            id: "b",
            mount: () => () => {
              throw cleanupError;
            },
          },
          {
            id: "c",
            mount: () => {
              throw mountError;
            },
          },
        ],
        {
          runtime: host.runtime,
          state: createFeatureState(),
          injector: host.injector,
        }
      );
    } catch (error) {
      reported = error;
    }
    expect(reported).toBeInstanceOf(AggregateError);
    const combined = reported as AggregateError;
    expect(combined.errors[0]).toBe(mountError);
    expect(combined.errors[1]).toBeInstanceOf(AggregateError);
    expect((combined.errors[1] as AggregateError).errors).toEqual([
      cleanupError,
      injectorError,
    ]);
    expect(released).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(released).toHaveBeenCalledTimes(1);
  });

  it("disposes earlier mounts if a later mount throws", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const release = vi.fn();
    expect(() =>
      mountTableFeatures(
        [
          { id: "a", mount: () => release },
          {
            id: "b",
            mount: () => {
              throw new Error("mount failed");
            },
          },
        ],
        {
          runtime: host.runtime,
          state: createFeatureState(),
          injector: host.injector,
        }
      )
    ).toThrow("mount failed");
    expect(release).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
