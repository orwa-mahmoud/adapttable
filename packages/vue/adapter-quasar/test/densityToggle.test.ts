import { resolveLabels } from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import { QBtnToggle, QSelect, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { QuasarDensityToggle } from "../src/controls/QuasarDensityToggle";
import { densityChooser } from "../src/density";

const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => {
  await nextTick();
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});
const part = '[data-adapttable-part="density-toggle"]';
function buttons(root: ParentNode): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>(`${part} button`)];
}
async function key(button: HTMLButtonElement, value: "Enter" | " ") {
  const keyCode = value === "Enter" ? 13 : 32;
  button.focus();
  for (const type of ["keydown", "keyup"])
    button.dispatchEvent(
      new KeyboardEvent(type, {
        key: value,
        keyCode,
        bubbles: true,
        cancelable: true,
      })
    );
  await settle();
}

it.each([
  [false, "ltr"],
  [false, "rtl"],
  [true, "ltr"],
  [true, "rtl"],
] as const)(
  "keeps both native density buttons visible and controlled for mobile=%s dir=%s",
  async (mobile, dir) => {
    const density = shallowRef<"comfortable" | "compact">("comfortable");
    const accept = shallowRef(false);
    const change = vi.fn((value: "comfortable" | "compact") => {
      if (accept.value) density.value = value;
    });
    const wrapper = mount(
      defineComponent(
        () => () =>
          h(DataTable<{ id: string }>, {
            data: [{ id: "a" }, { id: "b" }],
            columns: [{ key: "id" }],
            rowKey: (row) => row.id,
            features: [densityChooser()],
            density: density.value,
            onDensityChange: change,
            labels: {
              density: "Densité",
              densityComfortable: "Confortable",
              densityCompact: "Compacte",
            },
            dir,
            forceMobile: mobile,
            urlSync: false,
            searchable: false,
            paginationMode: "paged",
            defaults: { limit: 1 },
            classNames: {
              densityToggle: "density-paint",
              densitySelect: "legacy-paint",
            },
          })
      ),
      { attachTo: document.body, global: { plugins: [Quasar] } }
    );
    wrappers.push(wrapper);
    await settle();
    const group = wrapper.get(part);
    const options = buttons(wrapper.element);
    expect(wrapper.findComponent(QBtnToggle).exists()).toBe(true);
    expect(group.attributes()).toMatchObject({
      role: "group",
      "aria-label": "Densité",
      dir,
    });
    expect(group.classes()).toEqual(
      expect.arrayContaining(["density-paint", "legacy-paint"])
    );
    expect(options.map((button) => button.textContent)).toEqual([
      "Confortable",
      "Compacte",
    ]);
    expect(group.find('[role="combobox"]').exists()).toBe(false);
    expect(
      options.map((button) => button.getAttribute("aria-pressed"))
    ).toEqual(["true", "false"]);
    await key(options[1]!, "Enter");
    expect(change).toHaveBeenCalledExactlyOnceWith("compact");
    expect(density.value).toBe("comfortable");
    expect(options[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(document.activeElement).toBe(options[1]);
    accept.value = true;
    await key(options[1]!, " ");
    expect(density.value).toBe("compact");
    expect(options[1]?.getAttribute("aria-pressed")).toBe("true");
    expect(buttons(wrapper.element)).toEqual(options);
    expect(document.activeElement).toBe(options[1]);
    await key(options[0]!, " ");
    expect(density.value).toBe("comfortable");
    expect(options[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(wrapper.findComponent(QSelect).exists()).toBe(true);
    expect(
      wrapper.get('[data-adapttable-part="rows-per-page"]').element.tagName
    ).toBe("INPUT");
    expect(wrapper.find(mobile ? "article" : "table").exists()).toBe(true);
  }
);

it("rejects invalid and retired native callbacks across ownership changes and KeepAlive", async () => {
  const labels = resolveLabels(undefined);
  const active = shallowRef(true);
  const revision = shallowRef(0);
  const first = vi.fn();
  const second = vi.fn();
  const change = vi.fn();
  const Owner = defineComponent(
    () => () =>
      h(QuasarDensityToggle, {
        control: {
          attrs: {
            ref: revision.value === 0 ? first : second,
            "aria-label": labels.density,
          },
          value: "comfortable",
          options: [
            { value: "comfortable", label: labels.densityComfortable },
            { value: "compact", label: labels.densityCompact },
          ],
          onChange: change,
        },
      })
  );
  const wrapper = mount(
    defineComponent(
      () => () => h(KeepAlive, {}, () => (active.value ? h(Owner) : null))
    ),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  await settle();
  const native = wrapper.getComponent(QBtnToggle);
  const group = native.element;
  const initial: unknown = native.vm.$.vnode.props?.["onUpdate:modelValue"];
  if (typeof initial !== "function") throw new Error("Missing native update");
  initial(null);
  initial("invalid");
  expect(change).not.toHaveBeenCalled();
  expect(first).toHaveBeenCalledExactlyOnceWith(group);
  revision.value++;
  await settle();
  expect(first.mock.calls).toEqual([[group], [null]]);
  expect(second).toHaveBeenCalledExactlyOnceWith(group);
  initial("compact");
  expect(change).not.toHaveBeenCalled();
  const retained: unknown = native.vm.$.vnode.props?.["onUpdate:modelValue"];
  if (typeof retained !== "function") throw new Error("Missing current update");
  active.value = false;
  await settle();
  retained("compact");
  active.value = true;
  await settle();
  retained("compact");
  expect(change).not.toHaveBeenCalled();
  wrapper.getComponent(QBtnToggle).vm.$emit("update:modelValue", "compact");
  expect(change).toHaveBeenCalledExactlyOnceWith("compact");
  wrapper.unmount();
  wrappers.pop();
  expect(second).toHaveBeenLastCalledWith(null);
});
