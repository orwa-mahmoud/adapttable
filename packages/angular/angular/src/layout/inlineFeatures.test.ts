/** Inline features keep controlled selection and pins across a new array order. */

import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import { selection } from "@adapttable/angular-unstyled/selection";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, it } from "vitest";

import { AdaptDataTable } from "../../../adapter-angular-unstyled/src/dataTable";

it("takes a new controlled selection and keeps pins when inline features are reordered", async () => {
  @Component({
    imports: [AdaptDataTable],
    template: `
      <adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [urlSync]="false"
        [forceMobile]="false"
        [features]="features()"
      />
    `,
  })
  class Host {
    readonly rows = [
      { id: "ada", name: "Ada" },
      { id: "grace", name: "Grace" },
    ];
    readonly columns = [
      { key: "name", accessor: (row: { name: string }) => row.name },
    ];
    readonly rowKey = (row: { id: string }) => row.id;
    readonly ids = signal<readonly string[]>(["ada"]);
    readonly pinsFirst = signal(false);
    private readonly chosen = selection({
      selectedIds: this.ids,
      onSelectionChange: () => undefined,
    });
    private readonly pins = rowPinning();
    readonly features = computed(() =>
      this.pinsFirst() ? [this.pins, this.chosen] : [this.chosen, this.pins]
    );
  }

  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const box = (id: string) =>
    root.querySelector<HTMLInputElement>(
      `[data-row-id="${id}"] input[type="checkbox"]`
    );
  const row = (id: string) =>
    root.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
  expect(box("ada")?.checked).toBe(true);
  expect(box("grace")?.checked).toBe(false);
  [...(row("grace")?.querySelectorAll("button") ?? [])]
    .find((button) => button.textContent?.trim() === "Pin to top")
    ?.click();
  await fixture.whenStable();
  expect(row("grace")?.getAttribute("data-row-pin")).toBe("top");
  fixture.componentInstance.ids.set(["grace"]);
  await fixture.whenStable();
  expect(box("grace")?.checked).toBe(true);
  expect(box("ada")?.checked).toBe(false);
  expect(row("grace")?.getAttribute("data-row-pin")).toBe("top");
  fixture.componentInstance.pinsFirst.set(true);
  await fixture.whenStable();
  expect(box("grace")?.checked).toBe(true);
  expect(row("grace")?.getAttribute("data-row-pin")).toBe("top");
  fixture.destroy();
});
