/**
 * The find bar: every control reaches the find state it belongs to, and the
 * keyboard walks matches and closes without leaving the box.
 */
import type { TableLabels } from "@adapttable/core";
import type {
  FindButtonProps,
  FindSearchProps,
} from "@adapttable/core/binding";
import {
  afterNextRender,
  Component,
  type ElementRef,
  input,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { AdaptFindBarChrome, type FindBarSlots } from "./findBar";
import type { FindInTableState } from "./findInTable";

const stateFor = (over: Partial<FindInTableState> = {}): FindInTableState => ({
  open: true,
  setOpen: vi.fn(),
  query: "",
  setQuery: vi.fn(),
  matches: [],
  index: 0,
  next: vi.fn(),
  previous: vi.fn(),
  matchKeys: new Set<string>(),
  current: null,
  ...over,
});

@Component({
  selector: "adapt-test-find-search",
  template: `
    <input
      #box
      type="search"
      data-adapttable-part="find-input"
      [attr.aria-label]="props().label"
      [attr.placeholder]="props().placeholder"
      [value]="props().value"
      (input)="changed($event)"
      (keydown)="props().onKeyDown($event)"
    />
  `,
})
class Search {
  readonly props = input.required<FindSearchProps>();
  private readonly box =
    viewChild.required<ElementRef<HTMLInputElement>>("box");

  constructor() {
    afterNextRender(() => {
      const element = this.box().nativeElement;
      this.props().focusRef({ focus: () => element.focus() });
    });
  }

  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLInputElement).value);
  }
}

@Component({
  selector: "adapt-test-find-button",
  template: `
    <button
      type="button"
      [attr.data-adapttable-part]="props().part"
      [attr.aria-label]="props().label"
      [disabled]="props().disabled === true"
      (click)="props().onClick()"
    >
      {{ props().kind }}
    </button>
  `,
})
class Button {
  readonly props = input.required<FindButtonProps>();
}

const SLOTS: FindBarSlots = { Search, Button };

@Component({
  imports: [AdaptFindBarChrome],
  template: `
    <adapt-find-bar-chrome
      [find]="find()"
      [labels]="labels()"
      [slots]="slots"
    />
  `,
})
class Host {
  readonly find = input.required<FindInTableState>();
  readonly labels = input<TableLabels>();
  readonly slots = SLOTS;
}

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("AdaptFindBarChrome", () => {
  async function mount(find: FindInTableState, labels?: TableLabels) {
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput("find", find);
    if (labels) fixture.componentRef.setInput("labels", labels);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  it("renders nothing while the bar is closed", async () => {
    const fixture = await mount(stateFor({ open: false }));
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-adapttable-part="find-bar"]'
      )
    ).toBeNull();
  });

  it("focuses the box the reader just opened", async () => {
    await mount(stateFor());
    expect(document.activeElement).toBe(part("find-input"));
  });

  it("reports what the reader types", async () => {
    const find = stateFor();
    await mount(find);
    const input = part("find-input") as HTMLInputElement;
    input.value = "ada";
    input.dispatchEvent(new Event("input"));
    expect(find.setQuery).toHaveBeenCalledExactlyOnceWith("ada");
  });

  it("walks matches with Enter, and back with Shift+Enter", async () => {
    const find = stateFor({ query: "a", matches: [{}, {}] as never });
    await mount(find);
    part("find-input")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter" })
    );
    expect(find.next).toHaveBeenCalledOnce();
    part("find-input")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", shiftKey: true })
    );
    expect(find.previous).toHaveBeenCalledOnce();
  });

  it("closes on Escape and leaves other keys to the input", async () => {
    const find = stateFor();
    await mount(find);
    part("find-input")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a" })
    );
    expect(find.setOpen).not.toHaveBeenCalled();
    part("find-input")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape" })
    );
    expect(find.setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("announces the count and disables the walk until something matches", async () => {
    await mount(stateFor());
    expect(part("find-count")?.tagName).toBe("OUTPUT");
    expect(part("find-count")?.textContent).toContain("No matches");
    expect((part("find-previous") as HTMLButtonElement).disabled).toBe(true);
    expect((part("find-next") as HTMLButtonElement).disabled).toBe(true);
  });

  it("walks and closes from its own controls", async () => {
    const find = stateFor({
      query: "a",
      matches: [{}, {}] as never,
      index: 0,
    });
    await mount(find);
    expect(part("find-count")?.textContent).toContain("1 of 2");
    part("find-next")!.click();
    expect(find.next).toHaveBeenCalledOnce();
    part("find-previous")!.click();
    expect(find.previous).toHaveBeenCalledOnce();
    part("find-close")!.click();
    expect(find.setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("takes localized names", async () => {
    await mount(stateFor({ matches: [{}] as never, index: 0 }), {
      findInTable: "ابحث في الجدول",
      findPlaceholder: "ابحث…",
      findNext: "التالي",
      findPrevious: "السابق",
      findClose: "إغلاق",
      findMatchCount: (current: number, total: number) => `${current}/${total}`,
    });
    expect(part("find-input")?.getAttribute("aria-label")).toBe(
      "ابحث في الجدول"
    );
    expect(part("find-input")?.getAttribute("placeholder")).toBe("ابحث…");
    expect(part("find-next")?.getAttribute("aria-label")).toBe("التالي");
    expect(part("find-previous")?.getAttribute("aria-label")).toBe("السابق");
    expect(part("find-close")?.getAttribute("aria-label")).toBe("إغلاق");
    expect(part("find-count")?.textContent).toContain("1/1");
  });
});
