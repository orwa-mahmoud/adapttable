import { renderToString } from "vue/server-renderer";
import { ElButton, ID_INJECTION_KEY } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick, ref } from "vue";

import { elementButton } from "../src/controls/button";
import ElementInput from "../src/controls/ElementInput.vue";
import { mount, node } from "./mount";

describe("Element Plus control bridge", () => {
  it("uses the kit button and keeps semantics on its native root", () => {
    const click = vi.fn();
    const render = () =>
      elementButton(
        {
          type: "submit",
          "data-adapttable-part": "page-next",
          "aria-label": "Next page",
          class: "page-control",
          onClick: click,
        },
        "Next"
      );
    expect(render().type).toBe(ElButton);
    const { root } = mount(render);
    const button = node<HTMLButtonElement>(root, "button");
    expect(button.type).toBe("submit");
    expect(button.dataset.adapttablePart).toBe("page-next");
    expect(button.getAttribute("aria-label")).toBe("Next page");
    expect(button.classList.contains("page-control")).toBe(true);
    button.click();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("defaults to a non-submitting button and honors disabled state", () => {
    const click = vi.fn();
    const { root } = mount(() =>
      elementButton({ disabled: true, onClick: click }, "Apply")
    );
    const button = node<HTMLButtonElement>(root, "button");
    expect(button.type).toBe("button");
    button.click();
    expect(click).not.toHaveBeenCalled();
  });

  it("uses the kit input and forwards semantic attributes to the native field", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(ElementInput, {
        value: "North",
        id: "query",
        "aria-label": "Search rows",
        "data-adapttable-part": "search",
        class: "search-hook",
        onChange: change,
      })
    );
    await nextTick();
    expect(root.querySelector(".el-input.search-hook")).not.toBeNull();
    const field = node<HTMLInputElement>(root, "input");
    expect(field.dataset.adapttablePart).toBe("search");
    expect(field.getAttribute("aria-label")).toBe("Search rows");
    expect(field.id).toBe("query");
    field.value = "South";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(change).toHaveBeenCalledExactlyOnceWith("South");
    await nextTick();
    expect(field.value).toBe("North");
  });

  it("renders accepted host input changes without keeping a second value", async () => {
    const value = ref("North");
    const { root } = mount(() =>
      h(ElementInput, {
        value: value.value,
        onChange: (next) => {
          value.value = next;
        },
      })
    );
    const field = node<HTMLInputElement>(root, "input");
    field.value = "South";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(value.value).toBe("South");
    expect(field.value).toBe("South");
  });

  it("keeps numeric draft values as strings", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(ElementInput, { value: "", type: "number", onChange: change })
    );
    const field = node<HTMLInputElement>(root, "input");
    field.value = "12.5";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(change).toHaveBeenCalledExactlyOnceWith("12.5");
  });

  it("renders a semantic field during server rendering", async () => {
    const app = createSSRApp(() =>
      h(ElementInput, {
        value: "North",
        id: "ssr-query",
        "data-adapttable-part": "search",
        "aria-label": "Search rows",
      })
    );
    app.provide(ID_INJECTION_KEY, { prefix: 4200, current: 0 });
    const html = await renderToString(app);
    expect(html).toMatch(/<input[^>]*data-adapttable-part="search"/);
    expect(html).toContain('aria-label="Search rows"');
    expect(html).toContain('value="North"');
  });
});
