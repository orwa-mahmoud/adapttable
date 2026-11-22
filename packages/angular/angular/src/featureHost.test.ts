import {
  Component,
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

const provided: AdaptTableFeature = {
  setup: (host) => {
    host.registerAggregator("double", (values) => values.length * 2);
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
  it("reads injected values while it registers, and registers again only for a new declaration", async () => {
    const token = new InjectionToken<string>("setup label");
    const registered: string[] = [];
    const feature = (name: string): AdaptTableFeature => ({
      id: "scoped",
      setup: (host) => {
        registered.push(name);
        host.registerCommand({
          key: name,
          label: `${inject(token)} ${name}`,
          onSelect: () => undefined,
        });
      },
    });
    const first = feature("first");
    const second = feature("second");
    @Component({ template: "" })
    class ScopedHost {
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
    host.features.set([first]);
    await fixture.whenStable();
    expect(host.table.featureHost).toBe(original);
    expect(registered).toEqual(["first"]);
    host.features.set([second]);
    await fixture.whenStable();
    expect(
      host.table.featureHost.commands.map((command) => command.label)
    ).toEqual(["Injected second"]);
    host.features.set([]);
    await fixture.whenStable();
    expect(host.table.featureHost.commands).toEqual([]);
    fixture.destroy();
  });

  it("refuses a setup that returns a cleanup, naming where it belongs", () => {
    const parent = Injector.create({
      providers: [],
      parent: TestBed.inject(Injector),
    });
    const leaky = {
      id: "leaky",
      setup: () => () => undefined,
    } as unknown as AdaptTableFeature;
    const host = featureHostFor(parent, signal([leaky]));
    expect(() => host()).toThrow(/mount/);
    parent.destroy();
  });

  it.each(["named", "anonymous"])(
    "retains a %s feature's host and registrations when a new array keeps its members",
    async (kind) => {
      const setup = vi.fn(
        (host: Parameters<NonNullable<AdaptTableFeature["setup"]>>[0]) => {
          host.registerCommand({
            key: "retained",
            label: "Retained",
            onSelect: () => undefined,
          });
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
      fixture.destroy();
    }
  );

  it("replaces live registrations and options", async () => {
    const feature = (key: string): AdaptTableFeature => ({
      id: "replaceable",
      apply: () => ({
        densityChooser: key === "first",
        fitColumns: key === "next",
      }),
      setup: (host) => {
        host.registerCommand({ key, label: key, onSelect: () => undefined });
      },
    });
    const first = feature("first");
    const next = feature("next");
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
    component.features.set([]);
    await fixture.whenStable();
    expect(component.table.featureHost.commands).toEqual([]);
    expect(component.table.featureOptions).toEqual({});
    fixture.destroy();
  });

  it("registers provided and own features", async () => {
    TestBed.configureTestingModule({
      providers: [provideAdaptTableFeatures(provided)],
    });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const host = fixture.componentInstance.table.featureHost;
    expect(host.aggregators.has("double")).toBe(true);
    expect(host.commands.map((command) => command.key)).toEqual(["own"]);
    fixture.destroy();
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
