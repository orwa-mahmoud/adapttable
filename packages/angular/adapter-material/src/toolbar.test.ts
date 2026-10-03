import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { densityChooser } from "@adapttable/angular-material/density";
import {
  exportCsv,
  exportPdf,
  exportXlsx,
} from "@adapttable/angular-material/export";
import { fullscreen } from "@adapttable/angular-material/fullscreen";
import { print } from "@adapttable/angular-material/print";
import { rowActions } from "@adapttable/angular-material/row-actions";
import { savedViews } from "@adapttable/angular-material/saved-views";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = [
  { id: "1", name: "Dubai" },
  { id: "2", name: "Amman" },
  { id: "3", name: "Cairo" },
];

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", sortable: true, accessor: (row) => row.name },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [features]="features()"
    />
  `,
})
class Host {
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly data = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
}

async function mount(features: readonly AdaptTableFeature[]) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const part = <T extends HTMLElement>(
    name: string,
    root: ParentNode = document.body
  ) => root.querySelector<T>(kitSelector(name));
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = document.body
  ) => [...root.querySelectorAll<T>(kitSelector(name))];
  const ids = () => parts("row").map((row) => row.dataset.rowId);
  return {
    fixture,
    element,
    part,
    parts,
    ids,
    settle: () => fixture.whenStable(),
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("the Angular Material toolbar controls", () => {
  it("states comfortable rows, and switches to compact", async () => {
    const { part, settle } = await mount([densityChooser()]);
    expect(part("root")?.getAttribute("data-density")).toBe("comfortable");
    const toggle = part<HTMLButtonElement>("density-toggle");
    expect(toggle?.getAttribute("aria-label")).toBe("Density");
    toggle!.click();
    await settle();
    expect(part("root")?.getAttribute("data-density")).toBe("compact");
    expect(toggle?.textContent?.trim()).toBe("Compact");
    toggle!.click();
    await settle();
    expect(part("root")?.getAttribute("data-density")).toBe("comfortable");
  });

  it("offers no density control without the feature", async () => {
    const { part } = await mount([]);
    expect(part("density-toggle")).toBeNull();
    expect(part("root")?.getAttribute("data-density")).toBe("comfortable");
  });

  it("takes the table fullscreen where the browser allows it", async () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      configurable: true,
      value: true,
    });
    let current: Element | null = null;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => current,
    });
    const requests: Element[] = [];
    HTMLElement.prototype.requestFullscreen = function request(this: Element) {
      requests.push(this);
      current = requests.at(-1) ?? null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    };
    document.exitFullscreen = () => {
      current = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    };
    const { part, settle } = await mount([fullscreen()]);
    const toggle = part<HTMLButtonElement>("fullscreen-toggle");
    expect(toggle?.getAttribute("aria-label")).toBe("Enter fullscreen");
    toggle!.click();
    await settle();
    expect(requests).toEqual([part("root")]);
    expect(part("fullscreen-toggle")?.getAttribute("aria-label")).toBe(
      "Exit fullscreen"
    );
    part<HTMLButtonElement>("fullscreen-toggle")!.click();
    await settle();
    expect(part("fullscreen-toggle")?.getAttribute("aria-label")).toBe(
      "Enter fullscreen"
    );
  });

  it("exports the current view as a CSV file, and says so", async () => {
    const files: { name: string; csv: string }[] = [];
    const { part, settle } = await mount([
      exportCsv<City>({
        filename: "cities.csv",
        onAfterExport: ({ filename, csv }) => {
          files.push({ name: filename, csv });
        },
      }),
    ]);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: () => "blob:x",
      revokeObjectURL: () => undefined,
    });
    const button = part<HTMLButtonElement>("export-csv-button");
    expect(button?.textContent?.trim()).toBe("Export CSV");
    button!.click();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle();
    expect(files[0]?.name).toBe("cities.csv");
    expect(files[0]?.csv).toContain("Dubai");
    expect(part("export-announcer")?.textContent).not.toBe("");
  });

  it("closes the views on Escape, back on its button", async () => {
    const { part, settle } = await mount([
      savedViews({ storageKey: "esc-views", storage: null }),
    ]);
    part<HTMLButtonElement>("views-button")!.click();
    await settle();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(part("views-panel")).toBeNull();
    expect(document.activeElement).toBe(part("views-button"));
  });

  it("labels XLSX and PDF buttons, and prints from the toolbar", async () => {
    expect(exportXlsx(false)).toBeTruthy();
    expect(exportXlsx({ filename: "cities.xlsx" })).toBeTruthy();
    expect(exportPdf(false)).toBeTruthy();
    expect(print(() => undefined)).toBeTruthy();

    const printed: string[] = [];
    const workbook = await mount([exportXlsx()]);
    expect(workbook.part("export-csv-button")?.textContent).toContain("XLSX");
    workbook.fixture.destroy();

    const pdf = await mount([exportPdf()]);
    expect(pdf.part("export-csv-button")?.textContent).toContain("PDF");
    pdf.fixture.destroy();

    const { part, settle } = await mount([
      print(() => {
        printed.push("print");
      }, true),
    ]);
    const button = part<HTMLButtonElement>("print-button");
    expect(button?.textContent?.trim()).toBe("Print");
    button!.click();
    await settle();
    expect(printed).toEqual(["print"]);
  });

  it("exports with the defaults, beside an empty actions list", async () => {
    const { part } = await mount([exportCsv(), rowActions()]);
    expect(part("export-csv-button")).not.toBeNull();
    expect(part("actions-header")).toBeNull();
  });

  it("saves the current view under a name, and applies it later", async () => {
    const { part, parts, ids, settle } = await mount([
      savedViews({ storageKey: "cities-views", storage: null }),
    ]);
    const open = async () => {
      part<HTMLButtonElement>("views-button")!.click();
      await settle();
    };
    part<HTMLButtonElement>("sort-button")!.click();
    await settle();
    expect(ids()).toEqual(["2", "3", "1"]);
    await open();
    const input = part<HTMLInputElement>("views-input");
    if (!input) throw new Error("input is not rendered");
    expect(part<HTMLButtonElement>("views-save")?.disabled).toBe(true);
    input.value = "By name";
    input.dispatchEvent(new Event("input"));
    await settle();
    part<HTMLButtonElement>("views-save")!.click();
    await settle();
    expect(parts("views-item").map((item) => item.textContent?.trim())).toEqual(
      ["By name"]
    );
    // Clear the sort, then bring it back from the view.
    part<HTMLButtonElement>("sort-button")!.click();
    part<HTMLButtonElement>("sort-button")!.click();
    await settle();
    expect(ids()).toEqual(["1", "2", "3"]);
    if (!part("views-panel")) await open();
    part<HTMLButtonElement>("views-item")!.click();
    await settle();
    expect(ids()).toEqual(["2", "3", "1"]);
    expect(part("views-panel")).toBeNull();
    await open();
    part<HTMLButtonElement>("views-delete")!.click();
    await settle();
    expect(parts("views-item")).toEqual([]);
  });
});
