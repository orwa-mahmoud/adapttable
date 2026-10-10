import UButton from "@nuxt/ui/components/Button.vue";
import UCheckbox from "@nuxt/ui/components/Checkbox.vue";
import ui from "@nuxt/ui/vue-plugin";
import { expect, it } from "vitest";
import { createApp, h, nextTick } from "vue";

it("renders actual bundled default icon paths without an external request", async () => {
  const root = document.createElement("div");
  const app = createApp({
    render: () =>
      h("div", [
        h(UButton, { icon: "i-lucide-chevron-down", label: "Open" }),
        h(UCheckbox, { modelValue: true, label: "Selected" }),
      ]),
  }).use(ui);
  try {
    app.mount(root);
    await nextTick();
    await nextTick();
    const icons = root.querySelectorAll("svg");
    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      expect(icon.querySelector("path, polyline, line")).not.toBeNull();
      expect(icon.getAttribute("viewBox")).toBe("0 0 24 24");
    }
  } finally {
    app.unmount();
  }
});
