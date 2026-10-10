import { afterEach, describe, expect, it } from "vitest";
import { createApp, nextTick } from "vue";

import SelectionContractDemo from "../browser/selection/SelectionContractDemo.vue";
const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((run) => run());
  history.replaceState(null, "", "/");
});
function input(root: ParentNode, selector: string): HTMLInputElement {
  const value = root.querySelector<HTMLInputElement>(selector);
  if (!value) throw new Error(`Missing ${selector}`);
  return value;
}
async function mount(query: string) {
  history.replaceState(null, "", `/?${query}`);
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(SelectionContractDemo);
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  await nextTick();
  return root;
}
describe("browser fixture for dual-emitting native model widget", () => {
  it.each([false, true])(
    "dispatches once, retains mixed header and resolves actual DOM ref, mobile=%s",
    async (mobile) => {
      const root = await mount(`mobile=${mobile}&host=reject`);
      const selector = `[data-selection-table="model"] ${mobile ? "article input" : "tbody input"}`;
      const row = input(root, selector);
      row.click();
      await nextTick();
      row.click();
      await nextTick();
      expect(root.querySelector("#requests")?.textContent).toBe(
        '[["off-page"],["off-page"]]'
      );
      expect(row.checked).toBe(true);
      expect(row.getAttribute("aria-describedby")).toBe("selection-hint");
      expect(row.name).toBe("selectedRows");
      const button = [
        ...root.querySelectorAll<HTMLButtonElement>("button"),
      ].find(
        (button) => button.textContent?.trim() === "Focus last model checkbox"
      );
      if (!button) throw new Error("Missing focus-last-model-checkbox control");
      button.click();
      expect(document.activeElement).toBe(
        [...root.querySelectorAll(selector)].at(-1)
      );
      if (!mobile) {
        const header = input(
          root,
          '[data-selection-table="model"] thead input'
        );
        expect(header.indeterminate).toBe(true);
        expect(header.getAttribute("aria-label")).toBeTruthy();
      }
    }
  );
  it("prevents disabled toggles and leaves off-page ids untouched", async () => {
    const root = await mount("disabled=true");
    const row = input(root, '[data-selection-table="model"] tbody input');
    expect(row.disabled).toBe(true);
    row.click();
    await nextTick();
    expect(root.querySelector("#requests")?.textContent).toBe("[]");
    expect(root.querySelector("#selected")?.textContent).toBe(
      '["a","off-page"]'
    );
  });
});
