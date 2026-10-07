import { expect, type Locator } from "@playwright/test";

/** Text must fit its real control and every clipping ancestor in the group. */
async function optionBounds(label: Locator) {
  return label.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const text = range.getBoundingClientRect();
    const control = element.closest('button, label, [role="radio"]');
    if (!control) throw new Error("Density label has no native choice target");
    const box = control.getBoundingClientRect();
    let left = box.left;
    let right = box.right;
    let top = box.top;
    let bottom = box.bottom;
    for (let node = control.parentElement; node; node = node.parentElement) {
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
  });
}

export async function expectDensityGeometry(
  group: Locator,
  labels: readonly string[]
) {
  const options = await Promise.all(
    labels.map((label) => optionBounds(group.getByText(label, { exact: true })))
  );
  for (const option of options) {
    expect(option.width).toBeGreaterThan(0);
    expect(option.height).toBeGreaterThan(0);
    expect(option.clipped).toBeLessThanOrEqual(1);
  }
  expect(Math.abs(options[0].centerY - options[1].centerY)).toBeLessThanOrEqual(
    1
  );
  expect(
    Math.min(options[0].right, options[1].right) -
      Math.max(options[0].left, options[1].left)
  ).toBeLessThanOrEqual(1);
}
