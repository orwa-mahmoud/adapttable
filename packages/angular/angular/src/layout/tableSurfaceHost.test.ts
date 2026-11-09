/** Lean structural host: one body, and controllers only for composed features. */
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, it } from "vitest";

import type { AdaptTableFeature } from "../featureHost";
import { cellNavigation } from "../features/cellNavigation";
import { editing } from "../features/editing";
import { grouping } from "../features/grouping";
import { injectTableSurfaceHost } from "./tableSurfaceHost";

interface Person {
  readonly id: string;
  readonly name: string;
  readonly team: string;
}

const columns = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
];
const rowKey = (row: Person): string => row.id;
const rows = [
  { id: "ada", name: "Ada", team: "engines" },
  { id: "grace", name: "Grace", team: "compilers" },
];

it("renders rows and merges a custom patch without optional controllers", async () => {
  @Component({ selector: "host", template: "" })
  class Host {
    readonly data = signal(rows);
    readonly view = injectTableSurfaceHost<Person>({
      data: this.data,
      columns,
      rowKey,
      features: [{ id: "custom", apply: () => ({ multiSort: true }) }],
    });
  }
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await fixture.whenStable();
  const view = fixture.componentInstance.view();
  expect(view.body().some((slot) => slot.kind === "row")).toBe(true);
  expect(view.table.featureOptions.multiSort).toBe(true);
  expect(view.grid).toBeUndefined();
  expect(view.editing).toBeUndefined();
  expect(view.grouping).toBeUndefined();
  fixture.destroy();
});

it("mounts grouping, navigation and editing when they are composed", async () => {
  @Component({ selector: "host", template: "" })
  class Host {
    readonly data = signal(rows);
    readonly view = injectTableSurfaceHost<Person>({
      data: this.data,
      columns,
      rowKey,
      features: [grouping("team"), cellNavigation(), editing(() => undefined)],
    });
  }
  const fixture = TestBed.createComponent(Host);
  fixture.detectChanges();
  await fixture.whenStable();
  const view = fixture.componentInstance.view();
  expect(view.body().some((slot) => slot.kind === "group")).toBe(true);
  expect(view.grid).toBeDefined();
  expect(view.editing?.()).toBeDefined();
  expect(view.grouping?.()?.groupBy).toEqual(["team"]);
  fixture.destroy();
});

it("follows navigation, editing and grouping added, removed and added again after mount", async () => {
  const composed = [
    grouping("team"),
    cellNavigation(),
    editing(() => undefined),
  ] as const;
  @Component({ selector: "host", template: "" })
  class Host {
    readonly features = signal<readonly AdaptTableFeature[]>([]);
    readonly view = injectTableSurfaceHost<Person>({
      data: signal(rows),
      columns,
      rowKey,
      features: this.features,
    });
  }
  const fixture = TestBed.createComponent(Host);
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.componentInstance.view();
  };

  let view = await settle();
  expect(view.grid).toBeUndefined();
  expect(view.editing).toBeUndefined();
  expect(view.grouping).toBeUndefined();

  fixture.componentInstance.features.set(composed);
  view = await settle();
  expect(view.grid).toBeDefined();
  expect(view.editing?.()).toBeDefined();
  expect(view.grouping?.()?.groupBy).toEqual(["team"]);
  expect(view.body().some((slot) => slot.kind === "group")).toBe(true);

  fixture.componentInstance.features.set([]);
  view = await settle();
  expect(view.grid).toBeUndefined();
  expect(view.editing).toBeUndefined();
  expect(view.grouping).toBeUndefined();
  expect(view.body().some((slot) => slot.kind === "group")).toBe(false);

  fixture.componentInstance.features.set(composed);
  view = await settle();
  expect(view.grid).toBeDefined();
  expect(view.editing?.()).toBeDefined();
  expect(view.grouping?.()?.groupBy).toEqual(["team"]);
  fixture.destroy();
});
