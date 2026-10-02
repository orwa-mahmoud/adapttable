import {
  Component,
  DestroyRef,
  effect,
  inject,
  InjectionToken,
  Injector,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { injectDataTable } from "./dataTable";
import {
  type AdaptTableFeature,
  featureHostFor,
  provideAdaptTableFeatures,
} from "./featureHost";
import { injectFrontendData } from "./source/frontendData";

const cleanup = vi.fn();
const provided: AdaptTableFeature = {
  setup: (host) => {
    host.registerAggregator("double", (values) => values.length * 2);
    return cleanup;
  },
};
const own: AdaptTableFeature = {
  setup: (host) => {
    host.registerCommand({
      key: "own",
      label: "Own",
      onSelect: () => undefined,
    });
  },
};

@Component({ template: `` })
class Host {
  readonly table = injectDataTable({
    source: injectFrontendData({ data: [{ id: "1" }], urlSync: false }),
    columns: [{ key: "id" }],
    rowKey: (row) => row.id,
    features: [own],
  });
}

describe("feature composition", () => {
  it("injects setup dependencies and retains each setup scope until its composition changes", async () => {
    const token = new InjectionToken<string>("setup label");
    const pulse = signal(0);
    const observations: string[] = [];
    const scopes: Injector[] = [];
    const destroyed: string[] = [];
    const disposed: string[] = [];
    const feature = (name: string): AdaptTableFeature => ({
      id: "scoped",
      setup: (host) => {
        const label = inject(token);
        scopes.push(inject(Injector));
        inject(DestroyRef).onDestroy(() => destroyed.push(name));
        effect(() => {
          observations.push(`${name}:${String(pulse())}`);
        });
        host.registerCommand({
          key: name,
          label: `${label} ${name}`,
          onSelect: () => undefined,
        });
        return () => disposed.push(name);
      },
    });
    const first = feature("first");
    const second = feature("second");
    const last = feature("last");
    @Component({ template: "" })
    class ScopedHost {
      readonly injector = inject(Injector);
      readonly features = signal<readonly AdaptTableFeature[]>([first]);
      readonly table = injectDataTable({
        source: injectFrontendData({ data: [{ id: "1" }], urlSync: false }),
        columns: [{ key: "id" }],
        rowKey: (row) => row.id,
        features: this.features,
      });
    }
    TestBed.configureTestingModule({
      providers: [{ provide: token, useValue: "Injected" }],
    });
    const fixture = TestBed.createComponent(ScopedHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const original = host.table.featureHost;
    expect(original.commands.map((command) => command.label)).toEqual([
      "Injected first",
    ]);
    expect(observations).toEqual(["first:0"]);
    expect(scopes[0]).not.toBe(host.injector);
    host.features.set([first]);
    await fixture.whenStable();
    expect(host.table.featureHost).toBe(original);
    expect(scopes).toHaveLength(1);
    expect(destroyed).toEqual([]);
    expect(disposed).toEqual([]);
    pulse.set(1);
    await fixture.whenStable();
    expect(observations).toEqual(["first:0", "first:1"]);

    host.features.set([second]);
    await fixture.whenStable();
    expect(
      host.table.featureHost.commands.map((command) => command.label)
    ).toEqual(["Injected second"]);
    expect(scopes).toHaveLength(2);
    expect(scopes[1]).not.toBe(scopes[0]);
    expect(destroyed).toEqual(["first"]);
    expect(disposed).toEqual(["first"]);
    pulse.set(2);
    await fixture.whenStable();
    expect(observations).toEqual([
      "first:0",
      "first:1",
      "second:1",
      "second:2",
    ]);

    host.features.set([]);
    await fixture.whenStable();
    expect(host.table.featureHost.commands).toEqual([]);
    expect(destroyed).toEqual(["first", "second"]);
    expect(disposed).toEqual(["first", "second"]);
    pulse.set(3);
    await fixture.whenStable();
    expect(observations).toEqual([
      "first:0",
      "first:1",
      "second:1",
      "second:2",
    ]);
    host.features.set([last]);
    await fixture.whenStable();
    expect(
      host.table.featureHost.commands.map((command) => command.label)
    ).toEqual(["Injected last"]);
    expect(observations.at(-1)).toBe("last:3");
    fixture.destroy();
    expect(destroyed).toEqual(["first", "second", "last"]);
    expect(disposed).toEqual(["first", "second", "last"]);
  });

  it.each(["host", "scope", "both"])(
    "releases the host and setup scope once when %s cleanup throws",
    (failureKind) => {
      const parent = Injector.create({
        providers: [],
        parent: TestBed.inject(Injector),
      });
      const hostError = new Error("host cleanup failed");
      const scopeError = new Error("scope cleanup failed");
      const hostCleanup = vi.fn(() => {
        if (failureKind !== "scope") throw hostError;
      });
      const scopeCleanup = vi.fn(() => {
        if (failureKind !== "host") throw scopeError;
      });
      const features = signal<readonly AdaptTableFeature[]>([
        {
          id: "failing-cleanup",
          setup: (host) => {
            inject(DestroyRef).onDestroy(scopeCleanup);
            host.registerCommand({
              key: "registered",
              label: "Registered",
              onSelect: () => undefined,
            });
            return hostCleanup;
          },
        },
      ]);
      const host = featureHostFor(parent, features);
      expect(host().commands.map((command) => command.key)).toEqual([
        "registered",
      ]);
      features.set([]);
      let reported: unknown;
      try {
        host();
      } catch (error) {
        reported = error;
      }
      const failures =
        reported instanceof AggregateError ? reported.errors : [reported];
      let expectedFailures = [hostError, scopeError];
      if (failureKind === "host") expectedFailures = [hostError];
      else if (failureKind === "scope") expectedFailures = [scopeError];
      expect(failures).toEqual(expectedFailures);
      expect(hostCleanup).toHaveBeenCalledTimes(1);
      expect(scopeCleanup).toHaveBeenCalledTimes(1);
      expect(() => parent.destroy()).not.toThrow();
      expect(hostCleanup).toHaveBeenCalledTimes(1);
      expect(scopeCleanup).toHaveBeenCalledTimes(1);
    }
  );

  it.each(["named", "anonymous"])(
    "retains a %s feature's host and registrations when a new array keeps its members",
    async (kind) => {
      const release = vi.fn();
      const setup = vi.fn(
        (host: Parameters<NonNullable<AdaptTableFeature["setup"]>>[0]) => {
          host.registerCommand({
            key: "retained",
            label: "Retained",
            onSelect: () => undefined,
          });
          return release;
        }
      );
      const feature: AdaptTableFeature = {
        ...(kind === "named" ? { id: "retained" } : {}),
        setup,
      };
      @Component({ template: "" })
      class ReactiveHost {
        readonly features = signal<readonly AdaptTableFeature[]>([feature]);
        readonly table = injectDataTable({
          source: injectFrontendData({ data: [{ id: "1" }], urlSync: false }),
          columns: [{ key: "id" }],
          rowKey: (row) => row.id,
          features: this.features,
        });
      }
      const fixture = TestBed.createComponent(ReactiveHost);
      await fixture.whenStable();
      const component = fixture.componentInstance;
      const original = component.table.featureHost;
      component.features.set([feature]);
      await fixture.whenStable();
      expect(component.table.featureHost).toBe(original);
      expect(
        component.table.featureHost.commands.map((command) => command.key)
      ).toEqual(["retained"]);
      expect(setup).toHaveBeenCalledTimes(1);
      expect(release).not.toHaveBeenCalled();
      fixture.destroy();
      expect(release).toHaveBeenCalledTimes(1);
    }
  );

  it("replaces live registrations and options, disposing each superseded host once", async () => {
    const firstRelease = vi.fn();
    const nextRelease = vi.fn();
    const feature = (key: string, release: () => void): AdaptTableFeature => ({
      id: "replaceable",
      apply: () => ({
        densityChooser: key === "first",
        fitColumns: key === "next",
      }),
      setup: (host) => {
        host.registerCommand({ key, label: key, onSelect: () => undefined });
        return release;
      },
    });
    const first = feature("first", firstRelease);
    const next = feature("next", nextRelease);
    @Component({ template: "" })
    class ReactiveHost {
      readonly features = signal<readonly AdaptTableFeature[]>([first]);
      readonly table = injectDataTable({
        source: injectFrontendData({ data: [{ id: "1" }], urlSync: false }),
        columns: [{ key: "id" }],
        rowKey: (row) => row.id,
        features: this.features,
      });
    }
    const fixture = TestBed.createComponent(ReactiveHost);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const original = component.table.featureHost;
    expect(original.commands.map((command) => command.key)).toEqual(["first"]);
    expect(component.table.featureOptions).toMatchObject({
      densityChooser: true,
      fitColumns: false,
    });
    component.features.set([next]);
    await fixture.whenStable();
    expect(component.table.featureHost).not.toBe(original);
    expect(
      component.table.featureHost.commands.map((command) => command.key)
    ).toEqual(["next"]);
    expect(component.table.featureOptions).toMatchObject({
      densityChooser: false,
      fitColumns: true,
    });
    expect(firstRelease).toHaveBeenCalledTimes(1);
    expect(nextRelease).not.toHaveBeenCalled();
    component.features.set([]);
    await fixture.whenStable();
    expect(component.table.featureHost.commands).toEqual([]);
    expect(component.table.featureOptions).toEqual({});
    expect(nextRelease).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(firstRelease).toHaveBeenCalledTimes(1);
    expect(nextRelease).toHaveBeenCalledTimes(1);
  });

  it("sets up provided and own features and disposes them with the table", async () => {
    TestBed.configureTestingModule({
      providers: [provideAdaptTableFeatures(provided)],
    });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance.table.featureHost;
    expect(host.aggregators.has("double")).toBe(true);
    expect(host.commands.map((command) => command.key)).toEqual(["own"]);
    fixture.destroy();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("shares the empty host when nothing registers", () => {
    const injector = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    });
    const table = TestBed.runInInjectionContext(() =>
      injectDataTable({
        source: injectFrontendData<{ id: string }>({
          data: [],
          urlSync: false,
          injector,
        }),
        columns: [],
        rowKey: (row) => row.id,
        injector,
      })
    );
    expect(table.featureHost.commands).toEqual([]);
  });
});
