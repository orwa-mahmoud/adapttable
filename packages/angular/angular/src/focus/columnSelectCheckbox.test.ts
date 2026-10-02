/**
 * The column-select checkbox's Chrome: its name, when it shows, and the
 * clicks and keys it keeps from the header and the grid.
 */
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdaptColumnSelectCheckboxChrome,
  type ColumnSelectCheckboxProps,
  columnSelectLabel,
} from "./columnSelectCheckbox";

@Component({
  selector: "test-checkbox",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    type="checkbox"
    [attr.aria-label]="props().label"
    [checked]="props().checked"
    (change)="props().onToggle()"
  />`,
})
class TestCheckbox {
  readonly props = input.required<ColumnSelectCheckboxProps>();
}

@Component({
  imports: [AdaptColumnSelectCheckboxChrome],
  template: `
    <div (click)="headerClicked()" (keydown)="gridKeyed()">
      <adapt-column-select-checkbox-chrome
        label="Select column: Budget"
        [checked]="checked()"
        [onToggle]="onToggle"
        [slots]="slots"
      />
    </div>
  `,
})
class Host {
  readonly checked = signal(false);
  readonly onToggle = vi.fn();
  readonly headerClicked = vi.fn();
  readonly gridKeyed = vi.fn();
  readonly slots = { Checkbox: TestCheckbox };
}

async function mount(canHover: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: canHover,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

const wrapper = () =>
  document.querySelector<HTMLElement>(
    '[data-adapttable-part="column-select"]'
  )!;

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("AdaptColumnSelectCheckboxChrome", () => {
  it("names the column, and keeps its clicks and keys from the header and grid", async () => {
    const { host } = await mount(false);
    const box = document.querySelector("input")!;
    expect(box.getAttribute("aria-label")).toBe("Select column: Budget");
    expect(wrapper().getAttribute("role")).toBe("none");
    box.click();
    expect(host.onToggle).toHaveBeenCalledTimes(1);
    expect(host.headerClicked).not.toHaveBeenCalled();
    box.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    expect(host.gridKeyed).not.toHaveBeenCalled();
  });

  it("is always shown where nothing can hover", async () => {
    await mount(false);
    expect(wrapper().hasAttribute("data-shown")).toBe(true);
    expect(wrapper().style.opacity).toBe("1");
  });

  it("waits for a hovering pointer, focus or a selection before it shows", async () => {
    const { host, settle } = await mount(true);
    expect(wrapper().style.opacity).toBe("0");
    wrapper().dispatchEvent(new Event("pointerenter"));
    await settle();
    expect(wrapper().style.opacity).toBe("1");
    wrapper().dispatchEvent(new Event("pointerleave"));
    await settle();
    expect(wrapper().style.opacity).toBe("0");
    host.checked.set(true);
    await settle();
    expect(wrapper().style.opacity).toBe("1");
  });
});

describe("columnSelectLabel", () => {
  it("names the action and the column, by header or by key", () => {
    expect(
      columnSelectLabel("Select column", { key: "budget", header: "Budget" })
    ).toBe("Select column: Budget");
    expect(columnSelectLabel(undefined, { key: "budget" })).toBe(
      "Select column: budget"
    );
  });
});
