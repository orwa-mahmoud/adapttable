/**
 * The shell's own lifecycle work. The kit's library locale loads its labels
 * in a pending task, so server rendering waits for them, and that task
 * settles whether the language loads or fails. Entrance motion looks for
 * nothing while it is off.
 */
import type { TableSource } from "@adapttable/core";
import { getLabels } from "@adapttable/i18n";
import type * as Load from "@adapttable/i18n/load";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ADAPTTABLE_CONTEXT_MENU } from "../actions/tableContextMenu";
import { injectFrontendData } from "../source/frontendData";
import { AdaptDataTableShell } from "./dataTableShell";
import type { KitEnvironment } from "./kitEnvironment";

const load = vi.hoisted(() => ({ fail: new Set<string>() }));

vi.mock("@adapttable/i18n/load", async (importOriginal) => {
  const actual = await importOriginal<typeof Load>();
  return {
    loadLabels: async (locale: string) => {
      if (load.fail.has(locale)) throw new Error(`chunk for ${locale} failed`);
      return actual.loadLabels(locale);
    },
  };
});

interface Row {
  id: string;
  name: string;
}

@Component({
  template: "",
  providers: [
    { provide: ADAPTTABLE_CONTEXT_MENU, useFactory: () => signal(null) },
  ],
})
class ArabicShell extends AdaptDataTableShell<Row> {
  readonly current = this.view;
  protected override kitEnvironment(): KitEnvironment {
    return { locale: "ar" };
  }
}

async function mount() {
  const base = TestBed.runInInjectionContext(() =>
    injectFrontendData({
      data: [{ id: "one", name: "Ada" }],
      columns: [{ key: "name" }],
      urlSync: false,
    })
  );
  const fixture = TestBed.createComponent(ArabicShell);
  fixture.componentRef.setInput("source", signal<TableSource<Row>>(base()));
  fixture.componentRef.setInput("columns", [{ key: "name" }]);
  fixture.componentRef.setInput("rowKey", (row: Row) => row.id);
  fixture.componentRef.setInput("urlSync", false);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

afterEach(() => {
  load.fail.clear();
  vi.restoreAllMocks();
});

describe("library locale labels", () => {
  it("settles once the language has loaded", async () => {
    const fixture = await mount();
    expect(fixture.componentInstance.current()?.table.labels().search).toBe(
      getLabels("ar").search
    );
  });

  it("settles when the language fails, keeping the current copy", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    load.fail.add("ar");
    const fixture = await mount();
    expect(log).toHaveBeenCalledWith(
      '[adapttable] labels for "ar" did not load',
      expect.objectContaining({ message: "chunk for ar failed" })
    );
    expect(fixture.componentInstance.current()?.table.labels().search).toBe(
      getLabels("en").search
    );
  });
});

@Component({
  template: '<div #root><span data-stagger=""></span></div>',
  providers: [
    { provide: ADAPTTABLE_CONTEXT_MENU, useFactory: () => signal(null) },
  ],
})
class MarkedShell extends AdaptDataTableShell<Row> {}

describe("entrance motion", () => {
  async function mountMarked(animate: boolean) {
    const base = TestBed.runInInjectionContext(() =>
      injectFrontendData({
        data: [{ id: "one", name: "Ada" }],
        columns: [{ key: "name" }],
        urlSync: false,
      })
    );
    const fixture = TestBed.createComponent(MarkedShell);
    fixture.componentRef.setInput("source", signal<TableSource<Row>>(base()));
    fixture.componentRef.setInput("columns", [{ key: "name" }]);
    fixture.componentRef.setInput("rowKey", (row: Row) => row.id);
    fixture.componentRef.setInput("urlSync", false);
    fixture.componentRef.setInput("animate", animate);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture;
  }
  const scans = (scan: { mock: { calls: unknown[][] } }) =>
    scan.mock.calls.filter(([selector]) => selector === "[data-stagger]");

  it("looks for no animation marks while animate is off", async () => {
    const scan = vi.spyOn(Element.prototype, "querySelectorAll");
    const fixture = await mountMarked(false);
    fixture.componentRef.setInput("columns", [{ key: "name" }, { key: "id" }]);
    await fixture.whenStable();
    expect(scans(scan)).toEqual([]);
  });

  it("still finds the marks when animate is on", async () => {
    const scan = vi.spyOn(Element.prototype, "querySelectorAll");
    await mountMarked(true);
    expect(scans(scan).length).toBeGreaterThan(0);
  });
});
