import {
  createFeatureHost,
  featureSlotKey,
  featureStateKey,
  slotRender,
} from "@adapttable/core/binding";
import { Component, computed, inject, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { featureSlotFillsOf } from "./featureHost";
import { createFeatureState, injectFeatureState } from "./featureState";
import { ADAPTTABLE_SLOT_TABLE, type SlotTable } from "./slotContracts";
import { AdaptSlot } from "./slots";

const VALUE = featureStateKey<string>("slot-value");
const SLOT = featureSlotKey<object>("state-slot");
const HANDLE = featureStateKey<{ read(): string }>("stable-handle");

@Component({
  template: `<output>{{ value() }}</output
    ><span>{{ caption() }}</span>`,
})
class ValueSlot {
  readonly props = input.required<object>();
  readonly value = injectFeatureState(VALUE);
  readonly table = inject(ADAPTTABLE_SLOT_TABLE);
  readonly handle = injectFeatureState(HANDLE);
  readonly caption = computed(() => this.handle()?.read());
}

function stateTable(value: string): SlotTable {
  const featureState = createFeatureState();
  featureState.set(VALUE, value);
  return {
    slotFills: featureSlotFillsOf([
      { id: "value", renders: [slotRender(SLOT, () => ValueSlot)] },
    ]),
    featureHost: createFeatureHost([]),
    featureState,
  };
}

@Component({
  imports: [AdaptSlot],
  template: `<ng-container
    [adaptSlot]="slot"
    [adaptSlotProps]="{}"
    [adaptSlotTable]="table()"
  />`,
})
class Host {
  readonly slot = SLOT;
  readonly table = signal(stateTable("first"));
}

describe("feature state in slots", () => {
  it("refreshes a mounted computed reader without replacing its live handle", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const state = fixture.componentInstance.table().featureState!;
    let label = "original catalog";
    const handle = { read: () => label };
    state.set(HANDLE, handle);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector("span")?.textContent).toBe("original catalog");
    label = "current catalog";
    state.set(HANDLE, handle);
    await fixture.whenStable();
    expect(state.get(HANDLE)()).toBe(handle);
    expect(element.querySelector("span")?.textContent).toBe("current catalog");
    fixture.destroy();
  });

  it("changes injection scopes when tables share the same rendered component", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const original = host.table();
    const oldSlot = fixture.debugElement.query(
      (node) => node.componentInstance instanceof ValueSlot
    ).componentInstance as ValueSlot;
    expect(element.textContent).toBe("first");
    const next = stateTable("second");
    host.table.set(next);
    await fixture.whenStable();
    const newSlot = fixture.debugElement.query(
      (node) => node.componentInstance instanceof ValueSlot
    ).componentInstance as ValueSlot;
    expect(newSlot).not.toBe(oldSlot);
    expect(newSlot.table).toBe(next);
    expect(element.textContent).toBe("second");
    original.featureState!.set(VALUE, "stale approval");
    await fixture.whenStable();
    expect(element.textContent).toBe("second");
    next.featureState!.set(VALUE, "fresh");
    await fixture.whenStable();
    expect(element.textContent).toBe("fresh");
    fixture.destroy();
  });
});
