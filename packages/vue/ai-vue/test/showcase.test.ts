import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import VueAssistantShowcase from "../../../../apps/showcase/src/vue/VueAssistantShowcase.vue";
const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function mount() {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({ render: () => h(VueAssistantShowcase) });
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  const find = <T extends HTMLElement>(query: string): T => {
    const element = root.querySelector<T>(query);
    if (!element) throw new Error(query);
    return element;
  };
  const send = async (text: string) => {
    await vi.waitFor(() =>
      expect(find<HTMLTextAreaElement>(part("assistant-input")).disabled).toBe(
        false
      )
    );
    const input = find<HTMLTextAreaElement>(part("assistant-input"));
    input.value = text;
    input.dispatchEvent(new Event("input"));
    await nextTick();
    find(part("assistant-send")).click();
  };
  return { root, find, send };
}
describe("real native assistant showcase", () => {
  it("accepts a controlled selection and reports controlled rejection", async () => {
    const host = mount();
    await host.send("Select Ada");
    await vi.waitFor(() =>
      expect(host.find('[data-testid="selected-ids"]').textContent).toBe("ada")
    );
    await vi.waitFor(() =>
      expect(host.root.textContent).toContain("The table accepted")
    );
    host.find<HTMLInputElement>('[data-testid="accept-model"]').click();
    await nextTick();
    await host.send("Select Grace");
    await vi.waitFor(() =>
      expect(host.root.textContent).toContain("The table did not confirm")
    );
    expect(host.find('[data-testid="selected-ids"]').textContent).toBe("ada");
  });
  it("parks a real custom write until the native approval is decided", async () => {
    const host = mount();
    await host.send("Approve Grace");
    await vi.waitFor(() =>
      expect(
        host.root.querySelector(part("agent-approval-approve"))
      ).not.toBeNull()
    );
    expect(host.find('[data-testid="selected-ids"]').textContent).toBe("none");
    host.find(part("agent-approval-approve")).click();
    await vi.waitFor(() =>
      expect(host.find('[data-testid="selected-ids"]').textContent).toBe(
        "grace"
      )
    );
    await vi.waitFor(() =>
      expect(host.root.querySelector(part("agent-approval-approve"))).toBeNull()
    );
  });
  it("offers real view undo after a sort", async () => {
    const host = mount();
    await host.send("Sort names");
    await vi.waitFor(() =>
      expect(
        host.root.querySelector(part("assistant-receipts-toggle-button"))
      ).not.toBeNull()
    );
    host.find(part("assistant-receipts-toggle-button")).click();
    await vi.waitFor(() =>
      expect(
        host.root.querySelectorAll(part("assistant-receipt"))
      ).toHaveLength(1)
    );
    const undo = host.find<HTMLButtonElement>(
      part("assistant-receipt-undo-button")
    );
    expect(undo.disabled).toBe(false);
    expect(host.root.querySelector("tbody tr")?.textContent).toContain("Grace");
    undo.click();
    await vi.waitFor(() =>
      expect(host.root.querySelector("tbody tr")?.textContent).toContain("Ada")
    );
  });

  it("never describes an explicitly rejected approval as accepted", async () => {
    const host = mount();
    await host.send("Approve Ada");
    await vi.waitFor(() =>
      expect(
        host.root.querySelector(part("agent-approval-reject"))
      ).not.toBeNull()
    );
    host.find(part("agent-approval-reject")).click();
    await vi.waitFor(() =>
      expect(host.root.textContent).toContain("The table did not confirm")
    );
    expect(host.root.textContent).not.toContain("The table accepted");
    expect(host.find('[data-testid="selected-ids"]').textContent).toBe("none");
  });
});
