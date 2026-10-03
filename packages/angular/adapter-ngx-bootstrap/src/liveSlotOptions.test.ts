import {
  type FilterDef,
  injectFrontendData,
  type SavedViewsControllerOptions,
} from "@adapttable/angular";
import {
  createMemoryAdapter,
  defaultLabels,
  type FilterOption,
} from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { ngxBootstrapPart } from "../testUtils";
import { AdaptAutoFilterForm } from "./components/autoFilterForm";
import { AdaptSavedViewsMenu } from "./components/savedViewsMenu";

interface Row {
  id: string;
  team: string;
}

const OLD = [{ value: "old", label: "Old choice" }];
const CURRENT = [{ value: "new", label: "Current choice" }];

@Component({
  imports: [AdaptAutoFilterForm, AdaptSavedViewsMenu],
  template: `
    <adapt-auto-filter-form
      [defs]="defs()"
      [source]="source()"
      [labels]="labels"
    />
    <adapt-saved-views-menu [props]="viewProps()" />
  `,
})
class Host {
  readonly labels = defaultLabels;
  readonly defs = signal<readonly FilterDef<Row>[]>([
    { key: "team", type: "select", options: OLD },
    { key: "tags", type: "multiSelect", options: OLD },
  ]);
  readonly source = injectFrontendData<Row>({
    data: [{ id: "1", team: "new" }],
    columns: [{ key: "team", accessor: (row) => row.team }],
    urlSync: false,
    arrayExtraKeys: ["tags"],
  });
  readonly originalUrl = createMemoryAdapter("old.q=original");
  readonly options = signal<SavedViewsControllerOptions>({
    storageKey: "views",
    storage: null,
    urlAdapter: this.originalUrl,
    urlKey: "old",
  });
  readonly viewProps = computed(() => ({
    options: this.options(),
    labels: this.labels,
  }));
}

async function mount(prepare?: (host: Host) => void) {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  prepare?.(host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const settle = () => fixture.whenStable();
  const part = <T extends HTMLElement>(name: string) => {
    const selector = ngxBootstrapPart(name);
    const node =
      element.querySelector<T>(selector) ?? document.querySelector<T>(selector);
    if (!node) throw new Error(`Missing ${name}`);
    return node;
  };
  const items = () =>
    [
      ...document.querySelectorAll<HTMLElement>(
        '[data-ngx-bootstrap-part="views-item"]'
      ),
    ].map((node) => node.textContent?.trim());
  const save = async (name: string) => {
    const input = part<HTMLInputElement>("views-input");
    input.value = name;
    input.dispatchEvent(new Event("input"));
    await settle();
    part<HTMLButtonElement>("views-save").click();
    await settle();
  };
  return { host, fixture, element, settle, part, items, save };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("live slot options", () => {
  it("replaces choices on the same mounted fields and writes the new selection", async () => {
    const { host, element, settle } = await mount();
    const mounted = element.querySelector("adapt-select-filter-field");
    host.defs.update((defs) =>
      defs.map((def) => ({ ...def, options: CURRENT }))
    );
    await settle();
    expect(element.querySelector("adapt-select-filter-field")).toBe(mounted);
    const select = element.querySelector<HTMLSelectElement>(
      '[data-adapttable-part="filter-select"]'
    );
    if (!select) throw new Error("Missing select");
    expect(
      [...select.options].map((option) => option.textContent?.trim())
    ).toEqual([defaultLabels.filterAll, "Current choice"]);
    select.value = "new";
    select.dispatchEvent(new Event("change"));
    await settle();
    const check = element.querySelector<HTMLInputElement>(
      '[data-adapttable-part="filter-checkbox"] input'
    );
    if (!check) throw new Error("Missing current checkbox");
    expect(check.closest("label")?.textContent).toContain("Current choice");
    expect(
      element.querySelector("adapt-multi-select-filter-field")?.textContent
    ).not.toContain("Old choice");
    check.click();
    await settle();
    expect(host.source().extra.team).toBe("new");
    expect(host.source().extra.tags).toEqual(["new"]);
    expect(check.checked).toBe(true);
  });

  it("keeps replacement choices when the old async options arrive late", async () => {
    let resolve: ((options: readonly FilterOption[]) => void) | undefined;
    const pending = new Promise<readonly FilterOption[]>((done) => {
      resolve = done;
    });
    const { host, element, settle } = await mount((instance) => {
      instance.defs.update((defs) =>
        defs.map((def) => ({ ...def, options: () => pending }))
      );
    });
    host.defs.update((defs) =>
      defs.map((def) => ({ ...def, options: CURRENT }))
    );
    await settle();
    resolve?.(OLD);
    await settle();
    const select = element.querySelector<HTMLSelectElement>(
      '[data-adapttable-part="filter-select"]'
    );
    if (!select) throw new Error("Missing select");
    expect(
      [...select.options].map((option) => option.textContent?.trim())
    ).toEqual([defaultLabels.filterAll, "Current choice"]);
    select.value = "new";
    select.dispatchEvent(new Event("change"));
    await settle();
    expect(
      element.querySelector("adapt-multi-select-filter-field")?.textContent
    ).toContain("Current choice");
    expect(
      element.querySelector("adapt-multi-select-filter-field")?.textContent
    ).not.toContain("Old choice");
    expect(host.source().extra.team).toBe("new");
  });

  it("preserves local views and saves and applies against replacement URL options", async () => {
    const { host, part, items, save, settle } = await mount();
    const oldWrite = vi.spyOn(host.originalUrl, "setSearch");
    part<HTMLButtonElement>("views-button").click();
    await settle();
    await save("Local");
    const current = createMemoryAdapter("new.q=current&other.q=kept");
    host.options.update((options) => ({
      ...options,
      urlAdapter: current,
      urlKey: "new",
      visibility: "team",
      migrate: (view) => view,
    }));
    await settle();
    expect(items()).toEqual(["Local"]);
    await save("Current");
    expect(items()).toEqual(["Local", "Current"]);
    current.setSearch("new.q=changed&other.q=kept");
    const currentItem = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-ngx-bootstrap-part="views-item"]'
      ),
    ].find((node) => node.textContent?.trim() === "Current");
    if (!currentItem) throw new Error("Missing saved current view");
    currentItem.click();
    await settle();
    expect(new URLSearchParams(current.getSearch()).get("new.q")).toBe(
      "current"
    );
    expect(new URLSearchParams(current.getSearch()).get("other.q")).toBe(
      "kept"
    );
    expect(oldWrite).not.toHaveBeenCalled();

    const storage = {
      getItem: vi.fn((key: string) =>
        JSON.stringify([{ name: key, search: "new.q=stored" }])
      ),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    host.options.update((options) => ({
      ...options,
      storage,
      storageKey: "Replacement",
    }));
    await settle();
    part<HTMLButtonElement>("views-button").click();
    await settle();
    expect(items()).toEqual(["Replacement"]);
    part<HTMLButtonElement>("views-item").click();
    await settle();
    expect(new URLSearchParams(current.getSearch()).get("new.q")).toBe(
      "stored"
    );
    part<HTMLButtonElement>("views-button").click();
    await settle();
    await save("Stored here");
    expect(storage.setItem).toHaveBeenLastCalledWith(
      "Replacement",
      expect.stringContaining("Stored here")
    );
  });
});
