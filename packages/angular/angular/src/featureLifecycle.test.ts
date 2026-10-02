import {
  featureSlotKey,
  featureStateKey,
  slotRender,
} from "@adapttable/core/binding";
import {
  Component,
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
