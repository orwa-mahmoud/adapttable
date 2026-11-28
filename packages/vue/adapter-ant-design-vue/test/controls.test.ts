import { Button } from "ant-design-vue";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick, ref } from "vue";
import { renderToString } from "vue/server-renderer";

import AntdInput from "../src/controls/AntdInput.vue";
import { antdButton } from "../src/controls/button";
import { mount, node } from "./mount";

describe("Ant Design Vue control bridge", () => {
  it("uses the kit button and keeps semantics on its native root", () => {
    const click = vi.fn();
    const render = () =>
      antdButton(
        {
          type: "submit",
          "data-adapttable-part": "page-next",
          "aria-label": "Next page",
          class: "page-control",
          onClick: click,
        },
        "Next"
      );
    const vnode = render();
    const { root } = mount(() => vnode);
    expect(vnode.component?.subTree.type).toBe(Button);
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
      antdButton({ disabled: true, onClick: click }, "Apply")
    );
    const button = node<HTMLButtonElement>(root, "button");
    expect(button.type).toBe("button");
    button.click();
    expect(click).not.toHaveBeenCalled();
  });

  it("uses the kit input and forwards semantic attributes to the native field", async () => {
    const change = vi.fn();
    const { root } = mount(() =>
      h(AntdInput, {
        value: "North",
        id: "query",
        "aria-label": "Search rows",
        "data-adapttable-part": "search",
        class: "search-hook",
        onChange: change,
      })
    );
    await nextTick();
    expect(root.querySelector(".ant-input.search-hook")).not.toBeNull();
    const field = node<HTMLInputElement>(root, "input");
    expect(field.dataset.adapttablePart).toBe("search");
    expect(field.getAttribute("aria-label")).toBe("Search rows");
    expect(field.id).toBe("query");
    field.value = "South";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(change).toHaveBeenCalledExactlyOnceWith("South");
    // The kit input restores the controlled value on its next render.
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(field.value).toBe("North");
  });

  it("renders accepted host input changes without keeping a second value", async () => {
    const value = ref("North");
    const { root } = mount(() =>
      h(AntdInput, {
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
      h(AntdInput, { value: "", type: "number", onChange: change })
    );
    const field = node<HTMLInputElement>(root, "input");
    field.value = "12.5";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    expect(change).toHaveBeenCalledExactlyOnceWith("12.5");
  });

  it("renders a semantic field during server rendering", async () => {
    const app = createSSRApp(() =>
      h(AntdInput, {
        value: "North",
        id: "ssr-query",
        "data-adapttable-part": "search",
        "aria-label": "Search rows",
      })
    );
    const html = await renderToString(app);
    expect(html).toMatch(/<input[^>]*data-adapttable-part="search"/);
    expect(html).toContain('aria-label="Search rows"');
    expect(html).toContain('value="North"');
  });
});
