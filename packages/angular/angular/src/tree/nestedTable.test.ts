/**
 * A row's detail: the host's own panel, or a nested table inside a named
 * region, handed the defaults every nested table is mounted with.
 */
import type { TableLabels } from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import type { Renderer } from "../columnDef";
import {
  AdaptRowDetail,
  type NestedTableContext,
  type NestedTableFor,
  type RowDetailContext,
} from "./nestedTable";

interface Person {
  id: string;
  name: string;
  orders?: string[];
}

@Component({
  selector: "test-detail-card",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p class="card">Card for {{ row().name }}</p>`,
})
class DetailCard {
  readonly row = input.required<Person>();
}

@Component({
  imports: [AdaptRowDetail],
  template: `
    <ng-template #own let-row
      ><p class="own">About {{ row.name }}</p></ng-template
    >
    <ng-template #orders let-d let-row="row"
      ><p class="nested">
        {{ d.tableLabel }}|{{ d.urlSync }}|{{ d.searchable }}|{{ d.density }}|{{
          d.labels?.search
        }}|{{ row.orders.length }}
      </p></ng-template
    >
    <adapt-row-detail
      [row]="row()"
      [render]="render()"
      [nested]="nested()"
      [parent]="{ density: 'compact', labels: labels }"
    />
  `,
})
class Host {
  readonly own =
    viewChild.required<TemplateRef<RowDetailContext<Person>>>("own");
  readonly orders =
    viewChild.required<TemplateRef<NestedTableContext<Person>>>("orders");
  readonly row = signal<Person>({ id: "1", name: "Ada", orders: ["a"] });
  readonly render = signal<Renderer<RowDetailContext<Person>> | undefined>(
    undefined
  );
  readonly nested = signal<NestedTableFor<Person> | undefined>(undefined);
  readonly labels: TableLabels = { search: "Chercher" };
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

const text = (selector: string) =>
  document.querySelector(selector)?.textContent?.trim();

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptRowDetail", () => {
  it("draws the host's own panel for the row, from a template or a component", async () => {
    const { host, settle } = await mount();
    expect(
      document.querySelector("adapt-row-detail")?.textContent?.trim()
    ).toBe("");
    host.render.set(host.own());
    await settle();
    expect(text(".own")).toBe("About Ada");

    host.render.set(DetailCard);
    await settle();
    expect(text(".card")).toBe("Card for Ada");
  });

  it("nests a table inside a named region, mounted with the nested defaults", async () => {
    const { host, settle } = await mount();
    host.nested.set((row) =>
      row.orders
        ? { label: `Orders for ${row.name}`, table: host.orders() }
        : undefined
    );
    await settle();
    const region = document.querySelector(
      '[data-adapttable-part="nested-table"]'
    )!;
    expect(region.tagName).toBe("SECTION");
    expect(region.getAttribute("aria-label")).toBe("Orders for Ada");
    expect(text(".nested")).toBe(
      "Orders for Ada|false|false|compact|Chercher|1"
    );
  });

  it("names an unnamed nested table, and falls back to the host's panel for a row without one", async () => {
    const { host, settle } = await mount();
    host.render.set(host.own());
    host.nested.set((row) =>
      row.orders ? { table: host.orders() } : undefined
    );
    await settle();
    expect(
      document
        .querySelector('[data-adapttable-part="nested-table"]')
        ?.getAttribute("aria-label")
    ).toBe("Row details");

    host.row.set({ id: "2", name: "Grace" });
    await settle();
    expect(
      document.querySelector('[data-adapttable-part="nested-table"]')
    ).toBeNull();
    expect(text(".own")).toBe("About Grace");
  });
});
