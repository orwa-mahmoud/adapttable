import {
  createFeatureHost,
  featureSlotKey,
  PIN_ICON,
  slotRender,
} from "@adapttable/core/binding";
import { Component, inject, input, signal, type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptControl } from "./control";
import { extendFeature, featureSlotFillsOf } from "./featureHost";
import { AdaptIcon } from "./icon";
import { ADAPTTABLE_SLOT_TABLE, type SlotTable } from "./slotContracts";
import { AdaptSlot } from "./slots";

interface Label {
  readonly text: string;
}

@Component({
  selector: "test-first",
  template: `<b class="first">{{ props().text }}</b>`,
})
class First {
  readonly props = input.required<Label>();
  readonly table = inject(ADAPTTABLE_SLOT_TABLE, { optional: true });
}

@Component({
  selector: "test-second",
  template: `<i class="second">{{ props().text }}</i>`,
})
class Second {
  readonly props = input.required<Label>();
}

const LABEL = featureSlotKey<Label>("label");
const ONE = featureSlotKey<Label>("one", { single: true });

function tableOf(
  features: Parameters<typeof featureSlotFillsOf>[0]
): SlotTable {
  return {
    slotFills: featureSlotFillsOf(features),
    featureHost: createFeatureHost([]),
  };
}

const first = { id: "a", renders: [slotRender(LABEL, () => First)] };
const both = extendFeature(
  { id: "b", renders: [slotRender(ONE, () => First)] },
  [slotRender(LABEL, () => Second), slotRender(ONE, () => Second)]
);

@Component({
  imports: [AdaptSlot, AdaptControl, AdaptIcon],
  template: `
    <ng-container
      [adaptSlot]="slot()"
      [adaptSlotProps]="props()"
      [adaptSlotTable]="table()"
    />
    <ng-container [adaptControl]="control()" [adaptControlProps]="props()" />
    <svg [adaptIcon]="icon"></svg>
  `,
})
class Host {
  readonly slot = signal(LABEL);
  readonly props = signal<Label>({ text: "Hello" });
  readonly table = signal(tableOf([first, both]));
  readonly control = signal<Type<unknown>>(First);
  readonly icon = PIN_ICON;
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const texts = (selector: string) =>
    [...element.querySelectorAll(selector)].map((node) => node.textContent);
  return { fixture, host: fixture.componentInstance, element, texts };
}

describe("AdaptSlot", () => {
  it("draws every fill of a slot, in feature order, with its props", async () => {
    const { fixture, host, texts } = await mount();
    expect(texts("test-first .first, test-second .second")).toEqual([
      "Hello",
      "Hello",
      "Hello",
    ]);
    host.props.set({ text: "Bye" });
    await fixture.whenStable();
    expect(texts(".second")).toEqual(["Bye"]);
  });

  it("gives a drawn component the table it draws in", async () => {
    const { fixture, host } = await mount();
    const drawn = fixture.debugElement.query(
      (node) => node.componentInstance instanceof First
    );
    expect((drawn.componentInstance as First).table).toBe(host.table());
  });

  it("draws only the first fill of a single slot, and nothing for an empty one", async () => {
    const { fixture, host, element } = await mount();
    host.slot.set(ONE);
    await fixture.whenStable();
    expect(element.querySelectorAll("test-second")).toHaveLength(0);
    expect(element.querySelectorAll("test-first")).toHaveLength(2);
    host.table.set(tableOf([]));
    await fixture.whenStable();
    expect(element.querySelectorAll("test-first")).toHaveLength(1);
  });
});

describe("AdaptControl", () => {
  it("draws the kit's component, and redraws when it changes", async () => {
    const { fixture, host, element } = await mount();
    host.table.set(tableOf([]));
    await fixture.whenStable();
    expect(element.querySelector("test-first")?.textContent).toBe("Hello");
    host.control.set(Second);
    await fixture.whenStable();
    expect(element.querySelector("test-first")).toBeNull();
    expect(element.querySelector("test-second")?.textContent).toBe("Hello");
  });
});

describe("AdaptIcon", () => {
  it("draws a core glyph, hidden from assistive technology", async () => {
    const { element } = await mount();
    const svg = element.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("viewBox")).toBe(PIN_ICON.viewBox);
    expect(svg?.children.length).toBe(PIN_ICON.shapes.length);
  });
});
