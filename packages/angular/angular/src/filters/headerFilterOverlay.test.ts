/**
 * The header-filter overlay: local open state, a shared host, outside
 * presses, and a finished write that dismisses.
 */
import type {
  ExtraFilters,
  FilterDef,
  FilterFormSource,
  HeaderFilterOpenHost,
} from "@adapttable/core";
import {
  Component,
  computed,
  signal,
  type WritableSignal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { injectHeaderFilterOverlay } from "./headerFilterOverlay";

interface Row {
  city: string;
}

const DEF: FilterDef<Row> = { key: "city", type: "select", label: "City" };

function headerHost(key: WritableSignal<string | null>): HeaderFilterOpenHost {
  return {
    get openKey() {
      return key();
    },
    setOpenKey(next) {
      key.set(next);
    },
  };
}

function sourceFrom(
  extra: WritableSignal<ExtraFilters>
): FilterFormSource<Row> {
  return {
    get extra() {
      return extra();
    },
    setExtra: (key, value) => {
      extra.update((prev) => ({ ...prev, [key]: value }));
    },
    setExtras: (patch) => {
      extra.update((prev) => ({ ...prev, ...patch }));
    },
  };
}

@Component({ template: "" })
class LocalHost {
  readonly extra = signal<ExtraFilters>({});
  readonly closeOnSelect = signal(false);
  readonly pointerDismiss = signal(true);
  readonly def = signal(DEF);
  readonly source = computed(() => sourceFrom(this.extra));
  readonly overlay = injectHeaderFilterOverlay(
    {
      def: this.def,
      source: this.source,
      closeOnSelect: this.closeOnSelect,
    },
    {
      nestedSelector: "[data-nested]",
      pointerDismiss: this.pointerDismiss,
    }
  );
}

@Component({ template: "" })
class SharedHost {
  readonly extra = signal<ExtraFilters>({});
  readonly key = signal<string | null>(null);
  readonly shared = headerHost(this.key);
  readonly source = computed(() => sourceFrom(this.extra));
  readonly overlay = injectHeaderFilterOverlay(
    { def: DEF, source: this.source },
    { host: this.shared }
  );
}

async function mount<T>(component: new () => T) {
  const fixture = TestBed.createComponent(component);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

async function arm() {
  await Promise.resolve();
}

describe("injectHeaderFilterOverlay", () => {
  it("opens locally, ignores inside and nested presses, and dismisses outside", async () => {
    const fixture = await mount(LocalHost);
    const host = fixture.componentInstance;
    expect(host.overlay.open()).toBe(false);
    expect(host.overlay.resetKey()).toBe(0);
    host.overlay.setOpen(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await arm();
    expect(host.overlay.open()).toBe(true);

    const inside = document.createElement("div");
    inside.setAttribute(
      "data-adapttable-header-filter",
      host.overlay.sessionId
    );
    const nested = document.createElement("div");
    nested.setAttribute("data-nested", "");
    document.body.append(inside, nested);
    inside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    nested.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await fixture.whenStable();
    expect(host.overlay.open()).toBe(true);

    host.overlay.source().setExtra("city", "Amman");
    await arm();
    expect(host.overlay.open()).toBe(true);
    expect(host.extra().city).toBe("Amman");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await fixture.whenStable();
    expect(host.overlay.open()).toBe(false);
    expect(host.overlay.resetKey()).toBe(1);

    host.overlay.setOpen(true);
    fixture.detectChanges();
    await fixture.whenStable();
    await arm();
    const outside = document.createElement("div");
    document.body.append(outside);
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await fixture.whenStable();
    expect(host.overlay.open()).toBe(false);
    inside.remove();
    nested.remove();
    outside.remove();
    fixture.nativeElement.remove();
  });

  it("dismisses a finished select write when closeOnSelect is on", async () => {
    const fixture = await mount(LocalHost);
    const host = fixture.componentInstance;
    host.closeOnSelect.set(true);
    host.overlay.setOpen(true);
    fixture.detectChanges();
    await fixture.whenStable();
    host.overlay.source().setExtra("city", "Amman");
    await arm();
    expect(host.overlay.open()).toBe(false);
    expect(host.overlay.resetKey()).toBe(1);
    fixture.nativeElement.remove();
  });

  it("keeps a shared host's open key and can ignore outside presses", async () => {
    const shared = await mount(SharedHost);
    const host = shared.componentInstance;
    host.overlay.setOpen(true);
    shared.detectChanges();
    await shared.whenStable();
    await arm();
    expect(host.key()).toBe("city");
    expect(host.overlay.open()).toBe(true);
    const cell = document.createElement("div");
    cell.setAttribute("data-adapttable-part", "filter-header-cell");
    document.body.append(cell);
    cell.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await shared.whenStable();
    expect(host.overlay.open()).toBe(true);
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await shared.whenStable();
    expect(host.key()).toBeNull();
    expect(host.overlay.open()).toBe(false);
    expect(host.overlay.resetKey()).toBe(1);
    cell.remove();
    shared.nativeElement.remove();

    const local = await mount(LocalHost);
    const quiet = local.componentInstance;
    quiet.pointerDismiss.set(false);
    quiet.overlay.setOpen(true);
    local.detectChanges();
    await local.whenStable();
    await arm();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await local.whenStable();
    expect(quiet.overlay.open()).toBe(true);
    local.nativeElement.remove();
  });
});
