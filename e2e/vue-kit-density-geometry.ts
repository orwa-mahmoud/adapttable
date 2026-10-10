import { expect, type Locator } from "@playwright/test";

export async function expectDensityGeometry(
  group: Locator,
  labels: readonly string[]
) {
  const elements = await Promise.all(
    labels.map((label) =>
      group.getByText(label, { exact: true }).elementHandle()
    )
  );
  if (elements.some((element) => !element))
    throw new Error("Density geometry requires every native choice label");
  // Keyboard focus can scroll the page between separate browser calls. Read
  // every choice in one frame so alignment compares the same viewport.
  const options = await group.evaluate(
    (_, elements) =>
      elements.map((element) => {
        if (!element) throw new Error("Density label is missing");
        const range = document.createRange();
        range.selectNodeContents(element);
        const text = range.getBoundingClientRect();
        const control = element.closest('button, label, [role="radio"]');
        if (!control)
          throw new Error("Density label has no native choice target");
        const box = control.getBoundingClientRect();
        let left = box.left;
        let right = box.right;
        let top = box.top;
        let bottom = box.bottom;
        for (
          let node = control.parentElement;
          node;
          node = node.parentElement
        ) {
          const style = getComputedStyle(node);
          const bounds = node.getBoundingClientRect();
          if (style.overflowX !== "visible") {
            left = Math.max(left, bounds.left);
            right = Math.min(right, bounds.right);
          }
          if (style.overflowY !== "visible") {
            top = Math.max(top, bounds.top);
            bottom = Math.min(bottom, bounds.bottom);
          }
          if (node.dataset.adapttablePart === "density-toggle") break;
        }
        return {
          width: text.width,
          height: text.height,
          clipped: Math.max(
            left - text.left,
            text.right - right,
            top - text.top,
            text.bottom - bottom
          ),
          centerY: box.top + box.height / 2,
          left: box.left,
          right: box.right,
        };
      }),
    elements
  );
  for (const option of options) {
    expect(option.width).toBeGreaterThan(0);
    expect(option.height).toBeGreaterThan(0);
    expect(option.clipped).toBeLessThanOrEqual(1);
  }
  const [first, second] = options;
  if (!first || !second)
    throw new Error("Density geometry requires both native choices");
  expect(Math.abs(first.centerY - second.centerY)).toBeLessThanOrEqual(1);
  expect(
    Math.min(first.right, second.right) - Math.max(first.left, second.left)
  ).toBeLessThanOrEqual(1);
}
