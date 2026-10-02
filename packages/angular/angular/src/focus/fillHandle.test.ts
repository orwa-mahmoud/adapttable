import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { AdaptAttrs } from "../attrs";
import {
  AdaptFillHandleChrome,
  type FillHandleFocus,
  type FillHandleSlotProps,
} from "./fillHandle";

@Component({
  selector: "test-handle",
  imports: [AdaptAttrs],
  template: `<span
    [adaptAttrs]="props().handleProps"
    [title]="props().label"
    [class]="props().className"
  ></span>`,
})
class Handle {
  readonly props = input.required<FillHandleSlotProps>();
}

@Component({
  imports: [AdaptFillHandleChrome],
  template: `<adapt-fill-handle-chrome
    [focus]="focus()"
    [windowIndex]="2"
    [col]="1"
    [firstRowIndex]="10"
    className="corner"
    [slots]="slots"
  />`,
})
class Host {
  readonly corner = signal<{ row: number; col: number } | null>(null);
  readonly label = signal("Fill selection");
  readonly drag = vi.fn();
  readonly state: FillHandleFocus = {
    fillHandleCell: this.corner,
    fillHandleLabel: this.label,
    getFillHandleProps: () => ({ onMouseDown: this.drag }),
  };
  readonly focus = signal<FillHandleFocus | undefined>(this.state);
  readonly slots = { Handle };
}

describe("AdaptFillHandleChrome", () => {
  it("gates the required kit slot by the dataset corner and follows localization", async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    expect(root.querySelector("span")).toBeNull();
    host.corner.set({ row: 2, col: 1 });
    await fixture.whenStable();
    expect(root.querySelector("span")).toBeNull();
    host.corner.set({ row: 12, col: 1 });
    await fixture.whenStable();
    const handle = root.querySelector("span")!;
    expect(handle.title).toBe("Fill selection");
    expect(handle.className).toBe("corner");
    handle.dispatchEvent(new MouseEvent("mousedown"));
    expect(host.drag).toHaveBeenCalledOnce();
    host.label.set("Remplir la sélection");
    await fixture.whenStable();
    expect(root.querySelector("span")!.title).toBe("Remplir la sélection");
    host.focus.set(undefined);
    await fixture.whenStable();
    expect(root.querySelector("span")).toBeNull();
  });
});
