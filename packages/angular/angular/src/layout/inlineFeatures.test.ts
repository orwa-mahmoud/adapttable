/** Inline features keep controlled selection and pins across a new array order. */

import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import { selection } from "@adapttable/angular-unstyled/selection";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, it, vi } from "vitest";

import { AdaptDataTable } from "../../../adapter-angular-unstyled/src/dataTable";

function checkbox(root: HTMLElement, id: string): HTMLInputElement | null {
  return root.querySelector<HTMLInputElement>(
    `[data-row-id="${id}"] input[type="checkbox"]`
  );
}

function rowOf(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-row-id="${id}"]`);
}

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
  expect(checkbox(root, "ada")?.checked).toBe(true);
  expect(checkbox(root, "grace")?.checked).toBe(false);
  [...(rowOf(root, "grace")?.querySelectorAll("button") ?? [])]
    .find((button) => button.textContent?.trim() === "Pin to top")
    ?.click();
  await fixture.whenStable();
  expect(rowOf(root, "grace")?.getAttribute("data-row-pin")).toBe("top");
  fixture.componentInstance.ids.set(["grace"]);
  await fixture.whenStable();
  expect(checkbox(root, "grace")?.checked).toBe(true);
  expect(checkbox(root, "ada")?.checked).toBe(false);
  expect(rowOf(root, "grace")?.getAttribute("data-row-pin")).toBe("top");
  fixture.componentInstance.pinsFirst.set(true);
  await fixture.whenStable();
  expect(checkbox(root, "grace")?.checked).toBe(true);
  expect(rowOf(root, "grace")?.getAttribute("data-row-pin")).toBe("top");
  fixture.destroy();
});

it("reads a replaced selection declaration without remounting", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const third = vi.fn();

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
    readonly pins = rowPinning();
    readonly pinsFirst = signal(false);
    readonly chosen = signal(
      selection({ onSelectionChange: (ids) => first(ids) })
    );
    readonly features = computed(() =>
      this.pinsFirst() ? [this.pins, this.chosen()] : [this.chosen(), this.pins]
    );
  }

  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  checkbox(root, "ada")?.click();
  await fixture.whenStable();
  expect(checkbox(root, "ada")?.checked).toBe(true);
  expect(first).toHaveBeenCalledWith(["ada"]);
  [...(rowOf(root, "grace")?.querySelectorAll("button") ?? [])]
    .find((button) => button.textContent?.trim() === "Pin to top")
    ?.click();
  await fixture.whenStable();
  expect(rowOf(root, "grace")?.getAttribute("data-row-pin")).toBe("top");

  fixture.componentInstance.chosen.set(
    selection({
      selectedIds: ["grace"],
      onSelectionChange: (ids) => second(ids),
    })
  );
  fixture.componentInstance.pinsFirst.set(true);
  await fixture.whenStable();
  expect(checkbox(root, "grace")?.checked).toBe(true);
  expect(checkbox(root, "ada")?.checked).toBe(false);
  expect(rowOf(root, "grace")?.getAttribute("data-row-pin")).toBe("top");
  checkbox(root, "ada")?.click();
  await fixture.whenStable();
  expect(second).toHaveBeenCalled();
  expect(first).toHaveBeenCalledTimes(1);
  const passed = second.mock.lastCall?.[0] as string[];
  expect(passed).toContain("ada");
  expect(passed).toContain("grace");

  fixture.componentInstance.chosen.set(
    selection({
      selectedIds: ["Grace"],
      getId: (row: { name: string }) => row.name,
      onSelectionChange: (ids) => third(ids),
    })
  );
  await fixture.whenStable();
  expect(checkbox(root, "grace")?.checked).toBe(true);
  expect(checkbox(root, "ada")?.checked).toBe(false);
  expect(rowOf(root, "grace")?.getAttribute("data-row-pin")).toBe("top");
  checkbox(root, "ada")?.click();
  await fixture.whenStable();
  expect(third).toHaveBeenCalled();
  const named = third.mock.lastCall?.[0] as string[];
  expect(named).toContain("Ada");
  expect(named).toContain("Grace");
  expect(second).toHaveBeenCalledTimes(1);
  fixture.destroy();
});
