import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import Showcase from "../../../../apps/showcase/src/vue/VueAssistantShowcase.vue";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
const settle = async () => {
  for (let step = 0; step < 30; step += 1) {
    await Promise.resolve();
    await nextTick();
  }
};
async function changedTable() {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render: () => h(Showcase) });
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  await settle();
  const part = <T extends HTMLElement>(name: string): T => {
    const element = root.querySelector<T>(`[data-adapttable-part="${name}"]`);
    if (!element) throw new Error(name);
    return element;
  };
  const header = () => root.querySelector('th[data-column-key="name"]');
  const input = part<HTMLTextAreaElement>("assistant-input");
  input.value = "Sort and search for Alan";
  input.dispatchEvent(new Event("input"));
  await settle();
  part("assistant-send").click();
  await settle();
  await vi.waitFor(() =>
    expect(part<HTMLInputElement>("search").value).toBe("Alan")
  );
  expect(root.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(root.querySelector("tbody tr")?.textContent).toContain("Alan");
  expect(header()?.getAttribute("aria-sort")).toBe("descending");
  part("assistant-receipts-toggle-button").click();
  await settle();
  expect(
    root.querySelectorAll('[data-adapttable-part="assistant-receipt"]')
  ).toHaveLength(2);
  expect(
    root.querySelectorAll(
      '[data-adapttable-part="assistant-receipt-undo-button"]'
    )
  ).toHaveLength(2);
  return { root, part, header };
}
describe("actual native showcase undo", () => {
  it("undoes two neutral-supported view actions through the real turn control", async () => {
    const x = await changedTable();
    const undo = x.part<HTMLButtonElement>(
      "assistant-receipts-undo-all-button"
    );
    expect(undo.getAttribute("aria-label")).toBe("Undo all");
    expect(undo.disabled).toBe(false);
    undo.click();
    await settle();
    expect(x.part<HTMLInputElement>("search").value).toBe("");
    expect(x.header()?.getAttribute("aria-sort")).toBe("none");
    expect(x.root.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(x.root.querySelector("tbody tr")?.textContent).toContain("Ada");
  });
  it("undoes each receipt's actual field without pretending selection has an undo mapping", async () => {
    const x = await changedTable();
    const sortUndo = x.root.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="assistant-receipt"][data-kind="sort"] button[data-adapttable-part="assistant-receipt-undo-button"]'
    );
    expect(sortUndo).not.toBeNull();
    sortUndo!.click();
    await settle();
    expect(x.header()?.getAttribute("aria-sort")).toBe("none");
    expect(x.part<HTMLInputElement>("search").value).toBe("Alan");
    expect(x.root.querySelectorAll("tbody tr")).toHaveLength(1);
    const searchUndo = x.root.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="assistant-receipt"][data-kind="search"] button[data-adapttable-part="assistant-receipt-undo-button"]'
    );
    expect(searchUndo).not.toBeNull();
    searchUndo!.click();
    await settle();
    expect(x.part<HTMLInputElement>("search").value).toBe("");
    expect(x.root.querySelectorAll("tbody tr")).toHaveLength(4);
    expect(x.root.querySelector("tbody tr")?.textContent).toContain("Ada");
  });
});
