import {
  type BulkAction,
  createMemoryAdapter,
  defaultLabels,
  type ExportCsvOptions,
  type RowAction,
} from "@adapttable/core";
import { Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import {
  injectBulkActionRunner,
  rowActionsFor,
} from "../actions/bulkActionRunner";
import { injectFrontendData } from "../source/frontendData";
import { injectSavedViews } from "../url/savedViews";
import { injectDensity, injectExportCsv, injectFullscreen } from "./toolbar";

const LABELS = defaultLabels;

function inContext<T>(run: () => T): T {
  return TestBed.runInInjectionContext(run);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("injectDensity", () => {
  it("keeps the density in the URL, and writes a pending change on destroy", () => {
    const adapter = createMemoryAdapter();
    const { density, setDensity } = inContext(() =>
      injectDensity({ urlAdapter: adapter, urlKey: "t" })
    );
    expect(density()).toBe("comfortable");
    setDensity("compact");
    expect(density()).toBe("compact");
    TestBed.resetTestingModule();
    expect(adapter.getSearch()).toContain("compact");
  });

  it("starts from the default density, with an explicit injector", () => {
    const { density } = injectDensity({
      urlSync: false,
      defaultDensity: "compact",
      injector: TestBed.inject(Injector),
    });
    expect(density()).toBe("compact");
  });
});

describe("injectFullscreen", () => {
  function stubFullscreen(enabled: boolean) {
    let current: Element | null = null;
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: enabled,
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => current,
    });
    const change = () => document.dispatchEvent(new Event("fullscreenchange"));
    const requested: Element[] = [];
    HTMLElement.prototype.requestFullscreen = function request(this: Element) {
      requested.push(this);
      current = requested.at(-1) ?? null;
      change();
      return Promise.resolve();
    };
    document.exitFullscreen = () => {
      current = null;
      change();
      return Promise.resolve();
    };
  }

  it("follows the document, toggles, and exits", () => {
    stubFullscreen(true);
    const target = document.createElement("div");
    const element = signal<HTMLElement | undefined>(target);
    const state = inContext(() => injectFullscreen(element));
    TestBed.tick();
    expect(state()).toMatchObject({ active: false, supported: true });
    state().toggle();
    expect(state().active).toBe(true);
    expect(state().container).toBe(target);
    state().toggle();
    expect(state().active).toBe(false);
    state().toggle();
    state().exit();
    expect(state().active).toBe(false);
    state().exit();
    element.set(undefined);
    TestBed.tick();
    state().toggle();
    expect(state().active).toBe(false);
  });

  it("does nothing where the browser does not allow it", () => {
    stubFullscreen(false);
    const state = injectFullscreen(
      signal(document.createElement("div")),
      TestBed.inject(Injector)
    );
    TestBed.tick();
    state().toggle();
    expect(state()).toMatchObject({ active: false, supported: false });
  });
});

interface City {
  id: string;
  name: string;
}

describe("injectExportCsv", () => {
  function exporter(exportCsv: boolean | ExportCsvOptions<City>) {
    return inContext(() => {
      const source = injectFrontendData<City>({
        data: [{ id: "1", name: "Dubai" }],
        urlSync: false,
      });
      return injectExportCsv<City>({
        exportCsv,
        source,
        columns: signal([{ key: "name", accessor: (row: City) => row.name }]),
        labels: signal(LABELS),
      });
    });
  }

  it("writes the rows on screen and announces it", async () => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => undefined,
    });
    const files: string[] = [];
    const state = exporter({
      onAfterExport: ({ csv }) => {
        files.push(csv);
      },
    });
    expect(state().exportLabel).toContain("CSV");
    expect(state().exportBusy).toBe(false);
    state().onExportCsv?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(files[0]).toContain("Dubai");
    expect(state().exportAnnouncement).not.toBe("");
  });

  it("offers no export when it is off", () => {
    expect(exporter(false)().onExportCsv).toBeUndefined();
  });
});

describe("injectSavedViews", () => {
  it("saves, applies and removes views against the table's URL", () => {
    const adapter = createMemoryAdapter("?q=ada");
    const views = inContext(() =>
      injectSavedViews({ storageKey: "v", storage: null, urlAdapter: adapter })
    );
    views.save("Ada");
    expect(views.views().map((view) => view.name)).toEqual(["Ada"]);
    views.setDefault("Ada");
    expect(views.defaultView()?.name).toBe("Ada");
    adapter.setSearch("");
    views.apply("Ada");
    expect(adapter.getSearch()).toContain("q=ada");
    views.remove("Ada");
    expect(views.views()).toEqual([]);
  });

  it("falls back to the browser's storage, with an explicit injector", () => {
    const views = injectSavedViews({
      storageKey: "w",
      urlSync: false,
      injector: TestBed.inject(Injector),
    });
    views.save("One");
    expect(localStorage.getItem("w")).toContain("One");
    localStorage.clear();
  });
});

describe("injectBulkActionRunner", () => {
  it("runs an action, and holds what it failed with", async () => {
    const outcomes: string[] = [];
    const runner = inContext(() =>
      injectBulkActionRunner({
        confirm: (request) => {
          request.onConfirm();
        },
        cancelLabel: "Cancel",
        onComplete: (outcome) => outcomes.push(outcome.status),
      })
    );
    const fail: BulkAction = {
      key: "fail",
      label: "Fail",
      onClick: () => Promise.reject(new Error("Nope")),
    };
    runner.run(fail, ["1"]);
    expect(runner.pending()).toBe("fail");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(runner.pending()).toBeNull();
    expect(runner.error()).toBeInstanceOf(Error);
    expect(outcomes).toEqual(["error"]);
  });

  it("runs with an explicit injector", () => {
    const runner = injectBulkActionRunner({
      confirm: () => undefined,
      cancelLabel: "Cancel",
      injector: TestBed.inject(Injector),
    });
    expect(runner.pending()).toBeNull();
  });
});

describe("rowActionsFor", () => {
  const edit: RowAction<City> = {
    key: "edit",
    label: "Edit",
    onClick: () => undefined,
  };

  it("appends Duplicate and Delete to the host's actions", () => {
    const hidden = signal(false);
    const actions = signal<readonly RowAction<City>[] | undefined>([edit]);
    const list = rowActionsFor<City>({
      actions,
      onDuplicateRow: () => undefined,
      onDeleteRow: () => undefined,
      confirmDeleteRow: false,
      labels: signal(LABELS),
      hidden,
    });
    expect(list().rowActions?.map((action) => action.key)).toHaveLength(3);
    expect(list().hasRowActions).toBe(true);
    hidden.set(true);
    expect(list().rowActions).toBeUndefined();
    actions.set(undefined);
    hidden.set(false);
    expect(list().rowActions).toHaveLength(2);
  });

  it("has none when the host wires none", () => {
    const list = rowActionsFor<City>({
      labels: signal(LABELS),
      hidden: signal(false),
    });
    expect(list()).toMatchObject({ hasRowActions: false });
  });
});
