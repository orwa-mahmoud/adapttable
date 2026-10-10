import type { FilterHeaderControlProps } from "@adapttable/angular/adapter";
import { defaultLabels, type ExtraFilters } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { BrnPopover } from "@spartan-ng/brain/popover";
import { expect, it, vi } from "vitest";

import { AdaptHeaderFilterTrigger } from "../header-filters/headerFilterTrigger";

function source(extra: ReturnType<typeof signal<ExtraFilters>>) {
  return {
    get extra() {
      return extra();
    },
    setExtra: (key: string, value: ExtraFilters[string]) => {
      extra.update((previous) => ({ ...previous, [key]: value }));
    },
    setExtras: (patch: ExtraFilters) => {
      extra.update((previous) => ({ ...previous, ...patch }));
    },
    allFilteredRows: [],
    facets: {},
  };
}

@Component({
  imports: [AdaptHeaderFilterTrigger],
  template: `<section [dir]="dir()">
    <adapt-header-filter-trigger [props]="props" />
  </section>`,
})
class Host {
  readonly dir = signal<"ltr" | "rtl">("rtl");
  readonly extra = signal<ExtraFilters>({});
  readonly props: FilterHeaderControlProps<never> = {
    def: {
      key: "team",
      type: "select",
      label: "Team",
      options: [
        { value: "Core", label: "Core" },
        { value: "Web", label: "Web" },
      ],
    },
    source: source(this.extra),
    labels: defaultLabels,
  };
}

@Component({ template: "render tick" })
class RenderTick {}

it("keeps inherited direction live without replacing an open header or its filter", async () => {
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const root = (
    fixture.nativeElement as HTMLElement
  ).querySelector<HTMLElement>("adapt-header-filter-trigger")!;
  const popover = fixture.debugElement
    .query(By.directive(BrnPopover))
    .injector.get(BrnPopover);
  expect(popover.align()).toBe("end");
  root.querySelector<HTMLButtonElement>("button")!.click();
  await fixture.whenStable();
  const surface = document.querySelector<HTMLElement>(
    '[data-adapttable-part="filter-header-cell"]'
  )!;
  expect(surface.dir).toBe("rtl");
  expect(surface.closest("[dir]")).toBe(surface);
  const select = surface.querySelector<HTMLSelectElement>("select")!;
  select.value = "Web";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  await fixture.whenStable();
  expect(host.extra().team).toBe("Web");
  for (const direction of ["ltr", "rtl"] as const) {
    host.dir.set(direction);
    await fixture.whenStable();
    expect(root.closest<HTMLElement>("[dir]")?.dir).toBe(direction);
    expect(
      document.querySelector('[data-adapttable-part="filter-header-cell"]')
    ).toBe(surface);
    expect(surface.querySelector("select")).toBe(select);
    expect(surface.dir).toBe(direction);
    expect(surface.closest("[dir]")).toBe(surface);
    expect(select.value).toBe("Web");
    expect(host.extra().team).toBe("Web");
    expect(popover.align()).toBe(direction === "rtl" ? "end" : "start");
  }
  select.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      keyCode: 27,
      bubbles: true,
      cancelable: true,
    })
  );
  await fixture.whenStable();
  expect(
    document.querySelector('[data-adapttable-part="filter-header-cell"]')
  ).toBeNull();
  host.dir.set("ltr");
  await fixture.whenStable();
  root.querySelector<HTMLButtonElement>("button")!.click();
  await fixture.whenStable();
  expect(popover.align()).toBe("start");
  const reopened = document.querySelector<HTMLElement>(
    '[data-adapttable-part="filter-header-cell"]'
  )!;
  expect(reopened.dir).toBe("ltr");
  expect(reopened.closest("[dir]")).toBe(reopened);
  expect(reopened.querySelector<HTMLSelectElement>("select")!.value).toBe(
    "Web"
  );
  expect(host.extra().team).toBe("Web");
  const closest = vi.spyOn(root, "closest");
  fixture.destroy();
  const readsAfterDestroy = closest.mock.calls.length;
  host.dir.set("rtl");
  const tick = TestBed.createComponent(RenderTick);
  tick.detectChanges();
  await tick.whenStable();
  expect(closest.mock.calls).toHaveLength(readsAfterDestroy);
  expect(
    document.querySelector('[data-adapttable-part="filter-header-cell"]')
  ).toBeNull();
  tick.destroy();
  closest.mockRestore();
});
