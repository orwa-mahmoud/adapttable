/** Mounted Angular host shared by the binding's parity scenarios. */
import type { AgentSession } from "@adapttable/ai";
import {
  type AdaptTableFeature,
  createFeatureState,
  type FeatureState,
  injectDataTable,
  injectFrontendData,
  mountTableFeatures,
  type TableRuntime,
  type TableRuntimeView,
} from "@adapttable/angular";
import { AGENT_VIEW_STATE } from "@adapttable/angular/adapter";
import {
  createNeutralTable,
  createTableEngine,
  type NeutralTable,
  type TableEngine,
} from "@adapttable/core";
import {
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  runInInjectionContext,
  type Signal,
  signal,
  untracked,
  type WritableSignal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, vi } from "vitest";

import {
  TABLE_AGENT_STATE,
  tableAgent,
  type TableAgentOptions,
} from "./tableAgent";

interface LiveFeature extends AdaptTableFeature {
  readonly testOptions: WritableSignal<TableAgentOptions>;
}

/** Mirrors an Angular host's live input rather than replacing its component. */
export function testAgent(options: TableAgentOptions): LiveFeature {
  const testOptions = signal(options);
  return { ...tableAgent(testOptions), testOptions };
}

function hasNameField(row: unknown): boolean {
  return typeof row === "object" && row !== null && "name" in row;
}

function liveFeature(feature: AdaptTableFeature): feature is LiveFeature {
  return "testOptions" in feature;
}

export interface RuntimeFixtureOptions<TRow = unknown> {
  readonly features: readonly AdaptTableFeature[];
  readonly view?: TableRuntimeView<TRow>;
  readonly createView?: () => Signal<TableRuntimeView<TRow>>;
  readonly onRead?: (value: unknown) => void;
  readonly onState?: (state: FeatureState) => void;
  /** Match frontend scenarios that publish the engine; false is the server tier. */
  readonly frontend?: boolean;
  readonly replayMount?: boolean;
}

@Component({
  standalone: true,
  template: `
    <pre data-testid="keys">{{ keys() }}</pre>
    <table>
      <tbody>
        @for (row of table.rows(); track table.rowKey(row)) {
          <tr>
            <td>{{ table.rowKey(row) }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
class RuntimeHost<TRow> {
  readonly injector = inject(Injector);
  readonly config = signal<RuntimeFixtureOptions<TRow>>({ features: [] });
  readonly state = createFeatureState();
  readonly keys = computed(
    () =>
      this.state
        .get(TABLE_AGENT_STATE)()
        ?.catalog()
        .map((entry) => entry.key)
        .join(",") ?? ""
  );
  suppliedView: Signal<TableRuntimeView<TRow>> | undefined;
  readonly data = computed(
    () => this.suppliedView?.().rows ?? this.config().view?.rows ?? []
  );
  readonly columns = [{ key: "name", header: "Name", sortable: true }];
  readonly source = injectFrontendData<TRow>({
    data: this.data,
    columns: this.columns,
    getRowId: (row: unknown) => String((row as { id: string }).id),
    urlSync: false,
  });
  readonly table = injectDataTable<TRow>({
    source: this.source,
    columns: this.columns,
    rowKey: (row: unknown) => String((row as { id: string }).id),
  });
  private engine: TableEngine<TRow> | undefined;
  private neutral: NeutralTable<TRow> | undefined;
  private previousRows: readonly TRow[] | undefined;
  readonly runtime: TableRuntime<TRow> = {
    rowAt: (index) =>
      this.view()?.visibleRows?.[index] ?? this.view()?.rows[index],
    labels: () => this.table.labels(),
    featureIds: () => this.config().features.map((feature) => feature.id ?? ""),
    view: () => this.view(),
  };
  private readonly view = computed<TableRuntimeView<TRow>>(() => {
    const config = this.config();
    const view = this.suppliedView?.() ?? config.view;
    if (config.frontend && view?.rows.length && !view.neutralTable) {
      if (!this.engine) {
        const first = view.rows[0];
        this.engine = createTableEngine<TRow>({
          data: view.rows,
          columns: hasNameField(first) ? this.columns : [],
          rowKey: (row: unknown) => String((row as { id: string }).id),
        });
        this.neutral = createNeutralTable(this.engine, "test", {
          visibleRows: () =>
            this.config().view?.visibleRows ?? this.config().view?.rows ?? [],
          operations: () => {
            const current = this.config().view;
            return {
              setPage: Boolean(current?.query?.setPage),
              setLimit: Boolean(current?.query?.setLimit),
              setSearch: Boolean(current?.query?.setSearch),
              setSort: Boolean(current?.query?.setSort),
              setFilters: Boolean(
                current?.query?.setExtras ?? current?.query?.clearExtras
              ),
              setGroupBy: Boolean(current?.groupingState?.setGroupBy),
              setSelection: Boolean(current?.selection),
            };
          },
        });
      }
      if (this.previousRows !== view.rows) {
        this.previousRows = view.rows;
        this.engine.invalidate(["data"], { data: view.rows }, { silent: true });
      }
    }
    return {
      ...view,
      rows: view?.rows ?? [],
      visibleRows: view?.visibleRows ?? view?.rows,
      neutralTable:
        view?.neutralTable ?? (config.frontend ? this.neutral : undefined),
      getRowId:
        view?.getRowId ??
        ((row: unknown) => String((row as { id: string }).id)),
      rowLabel:
        view?.rowLabel ??
        ((row: unknown) =>
          String(
            (row as { name?: string; id: string }).name ??
              (row as { id: string }).id
          )),
    };
  });
  constructor() {
    effect(() => {
      const config = this.config();
      this.state.get(TABLE_AGENT_STATE)();
      this.state.get(AGENT_VIEW_STATE)();
      untracked(() => {
        config.onState?.(this.state);
        const view = this.state.get(AGENT_VIEW_STATE)();
        if (view) config.onRead?.(view.read());
      });
    });
    inject(DestroyRef).onDestroy(() => this.engine?.dispose());
  }
}

const mounted = new Set<() => void>();
afterEach(() => {
  for (const destroy of mounted) destroy();
  mounted.clear();
});

export function mountRuntime<TRow = unknown>(
  options: RuntimeFixtureOptions<TRow>
) {
  const fixture = TestBed.createComponent(RuntimeHost<TRow>);
  const host = fixture.componentInstance;
  host.config.set(options);
  if (options.createView)
    host.suppliedView = runInInjectionContext(
      host.injector,
      options.createView
    );
  const container = fixture.nativeElement as HTMLElement;
  document.body.append(container);
  const destroy = () => {
    fixture.destroy();
    container.remove();
  };
  mounted.add(destroy);
  let features = options.features;
  let cleanup = mountTableFeatures(features, {
    runtime: host.runtime,
    state: host.state,
    injector: host.injector,
  });
  fixture.autoDetectChanges();
  fixture.detectChanges();
  TestBed.tick();
  if (options.replayMount) {
    cleanup();
    cleanup = mountTableFeatures(features, {
      runtime: host.runtime,
      state: host.state,
      injector: host.injector,
    });
    TestBed.tick();
  }
  const poll = setInterval(() => {
    const current = host.config();
    const view = host.state.get(AGENT_VIEW_STATE)();
    if (view) current.onRead?.(view.read());
  }, 5);
  host.injector.get(DestroyRef).onDestroy(() => clearInterval(poll));
  return {
    fixture,
    state: host.state,
    runtime: host.runtime,
    container,
    rerender: (next: RuntimeFixtureOptions<TRow>) => {
      const sameIds =
        features.map((feature) => feature.id).join(" ") ===
        next.features.map((feature) => feature.id).join(" ");
      if (sameIds) {
        next.features.forEach((feature, index) => {
          const previous = features[index];
          if (previous && liveFeature(previous) && liveFeature(feature))
            previous.testOptions.set(feature.testOptions());
        });
      } else {
        cleanup();
        features = next.features;
      }
      host.config.set({
        ...next,
        features,
      });
      if (!sameIds)
        cleanup = mountTableFeatures(features, {
          runtime: host.runtime,
          state: host.state,
          injector: host.injector,
        });
      fixture.detectChanges();
      TestBed.tick();
    },
    getByTestId: (id: string): HTMLElement => {
      fixture.detectChanges();
      const found = container.querySelector<HTMLElement>(
        `[data-testid="${id}"]`
      );
      if (!found) throw new Error(`Missing ${id}`);
      return found;
    },
    unmount: () => {
      cleanup();
      destroy();
      mounted.delete(destroy);
    },
  };
}

/** Flush the same Angular work a host event would commit. */
export function act<T>(run: () => Promise<T>): Promise<T>;
export function act<T>(run: () => T): T;
export function act(run: () => unknown): unknown {
  const result = run();
  TestBed.tick();
  if (result instanceof Promise) {
    return result.then((value: unknown) => {
      TestBed.tick();
      return value;
    });
  }
  return result;
}

export async function waitFor(run: () => void): Promise<void> {
  await vi.waitFor(() => {
    TestBed.tick();
    run();
  });
}

export function sessionFrom(state: FeatureState): AgentSession {
  const session = state.get(TABLE_AGENT_STATE)();
  if (!session) throw new Error("No session published");
  return session;
}
