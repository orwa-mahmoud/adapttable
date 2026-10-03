import { within } from "@testing-library/dom";
import { expect, vi } from "vitest";

/** Native pointer activation focuses its target before clicking it. */
export function focusAndClick(control: HTMLElement): void {
  control.focus();
  control.click();
}

/** CDK observes pointerdown and click, rather than mousedown alone. */
export function clickOutside(target: HTMLElement = document.body): void {
  target.dispatchEvent(
    new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
  );
  target.click();
}

/** Supply only jsdom's missing geometry; CDK still chooses focus targets. */
export function provideFocusLayout(selector: string): void {
  const original = Object.getOwnPropertyDescriptor(
    Element.prototype,
    "getClientRects"
  )?.value as HTMLElement["getClientRects"] | undefined;
  if (!original) throw new Error("Native getClientRects is unavailable");
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(
    function (this: HTMLElement) {
      if (!this.closest(selector)) return original.call(this);
      const hidden = this.closest('[hidden], [aria-hidden="true"]');
      const style = getComputedStyle(this);
      const rects =
        hidden || style.display === "none" || style.visibility === "hidden"
          ? []
          : [new DOMRect(0, 0, 100, 24)];
      return Object.assign(rects, {
        item: (index: number) => rects[index] ?? null,
      });
    }
  );
}

/** Assert the accessible name of Brain's real pane, not just inner content. */
export function expectNamedPopover(content: HTMLElement, name: string): void {
  const pane = content.closest<HTMLElement>(".cdk-overlay-pane");
  expect(pane).not.toBeNull();
  expect(pane?.getAttribute("role")).toBe("dialog");
  expect(within(document.body).getByRole("dialog", { name })).toBe(pane);
}
