import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { savedViews } from "@adapttable/spartan/saved-views";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { toolbarTests } from "../../angular/test/kit/suites/toolbar";
import { kit } from "../testing/kit";
import { expectNamedPopover, focusAndClick } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

for (const test of toolbarTests(kit)) it(test.name, test.run);

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
    root: ParentNode = element
  ) =>
    root.querySelector<T>(
      `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
    ) ??
    (root === element
      ? document.querySelector<T>(
          `.cdk-overlay-container :is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
        )
      : null);
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => [
    ...root.querySelectorAll<T>(
      `:is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
    ),
    ...(root === element
      ? document.querySelectorAll<T>(
          `.cdk-overlay-container :is([data-adapttable-part="${name}"], [data-spartan-part="${name}"])`
        )
      : []),
  ];
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

describe("the Spartan Angular toolbar controls", () => {
  it("closes the views on Escape, back on its button", async () => {
    const { part, settle } = await mount([
      savedViews({ storageKey: "esc-views", storage: null }),
    ]);
    focusAndClick(part<HTMLButtonElement>("views-button")!);
    await settle();
    expectNamedPopover(
      part("views-panel")!,
      part("views-button")!.textContent.trim()
    );
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", keyCode: 27 })
    );
    await settle();
    expect(part("views-panel")).toBeNull();
    expect(document.activeElement).toBe(part("views-button"));
  });

  it("saves the current view under a name, and applies it later", async () => {
    const { part, parts, ids, settle } = await mount([
      savedViews({ storageKey: "cities-views", storage: null }),
    ]);
    const open = async () => {
      focusAndClick(part<HTMLButtonElement>("views-button")!);
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

  it("leaves the Arabic views panel's gutter correction to its native host", async () => {
    document.documentElement.setAttribute("dir", "rtl");
    const width = vi
      .spyOn(document.documentElement, "getBoundingClientRect")
      .mockReturnValue({ width: 375 } as DOMRect);
    const inner = vi.spyOn(window, "innerWidth", "get").mockReturnValue(390);
    try {
      const { element, part, settle } = await mount([
        savedViews({ storageKey: "gutter-views", storage: null }),
      ]);
      element.setAttribute("dir", "rtl");
      for (const node of element.querySelectorAll<HTMLElement>("[dir]")) {
        node.setAttribute("dir", "rtl");
      }
      const open = async () => {
        focusAndClick(part<HTMLButtonElement>("views-button")!);
        await settle();
      };
      await open();
      expect(part("views-panel")?.style.translate).toBe("0px");
      document.body.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", keyCode: 27 })
      );
      await settle();
      inner.mockReturnValue(375);
      width.mockReturnValue({ width: 375 } as DOMRect);
      await open();
      expect(part("views-panel")?.style.translate).toBe("0px");
    } finally {
      document.documentElement.removeAttribute("dir");
      width.mockRestore();
      inner.mockRestore();
    }
  });
});
