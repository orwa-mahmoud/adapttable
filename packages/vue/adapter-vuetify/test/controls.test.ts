import { renderToString } from "@vue/server-renderer";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type VNode,
} from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import VuetifyButton from "../src/controls/VuetifyButton.vue";
import VuetifyCheckbox from "../src/controls/VuetifyCheckbox.vue";
import VuetifyInput from "../src/controls/VuetifyInput.vue";
import VuetifySelect from "../src/controls/VuetifySelect.vue";
import { vuetifyTableControls } from "../src/tableControls";

function vuetify() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}

const cleanups: (() => void)[] = [];
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ setup: () => render }).use(vuetify());
  app.mount(host);
  const unmount = () => {
    app.unmount();
    host.remove();
  };
  cleanups.push(unmount);
  return host;
}
function inputIn(host: ParentNode): HTMLInputElement {
  const input = host.querySelector("input:not([type=hidden])");
  if (!(input instanceof HTMLInputElement))
    throw new Error("Expected a native input");
  return input;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

it("keeps Vuetify compound-host ownership and native ARIA, events and refs", async () => {
  const target = vi.fn();
  const onChange = vi.fn();
  const onKeydown = vi.fn();
  const host = mount(() =>
    h(VuetifyInput, {
      attrs: {
        id: "search-input",
        class: "host-search-input",
        "data-adapttable-part": "search-input",
        "aria-label": "Search records",
        "aria-describedby": "search-help",
        ref: target,
        onKeydown,
      },
      value: "Ada",
      type: "search",
      onChange,
    })
  );
  await nextTick();
  const input = inputIn(host);
  const field = host.querySelector('[data-adapttable-part="search-input"]');
  expect(field?.classList.contains("v-text-field")).toBe(true);
  expect(field?.classList.contains("host-search-input")).toBe(true);
  expect(input.classList.contains("v-field__input")).toBe(true);
  expect(input.getAttribute("aria-describedby")).toBe("search-help");
  expect(input.getAttribute("aria-label")).toBe("Search records");
  expect(input.id).toBe("search-input");
  expect(input.dataset.adapttablePart).toBeUndefined();
  expect(target).toHaveBeenLastCalledWith(input);
  input.value = "Grace";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  expect(onChange).toHaveBeenCalledExactlyOnceWith("Grace");
  input.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  expect(onKeydown).toHaveBeenCalledOnce();
  cleanups.pop()?.();
  expect(target).toHaveBeenLastCalledWith(null);
});

it("releases replaced refs and resolves the documented controlRef to a focusable input", async () => {
  const first = vi.fn();
  const second = vi.fn();
  const current = ref(first);
  const host = mount(() =>
    h(VuetifySelect, {
      attrs: {
        ref: current.value,
        "aria-label": "Team",
        "data-adapttable-part": "filter-select",
      },
      value: "platform",
      options: [{ value: "platform", label: "Platform" }],
      onChange: vi.fn(),
    })
  );
  await nextTick();
  const input = inputIn(host);
  expect(first).toHaveBeenLastCalledWith(input);
  input.focus();
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute("role")).toBe("combobox");
  expect(input.getAttribute("aria-label")).toBe("Team");
  expect(
    host
      .querySelector('[data-adapttable-part="filter-select"]')
      ?.classList.contains("v-select")
  ).toBe(true);
  current.value = second;
  await nextTick();
  expect(first).toHaveBeenLastCalledWith(null);
  expect(second).toHaveBeenLastCalledWith(input);
  cleanups.pop()?.();
  expect(second).toHaveBeenLastCalledWith(null);
});

it("retains the real Vuetify checkbox, mixed semantics and one controlled update", async () => {
  const onChange = vi.fn();
  const target = vi.fn();
  const checked = ref(false);
  const indeterminate = ref(true);
  const host = mount(() =>
    h(VuetifyCheckbox, {
      attrs: {
        id: "select-all",
        class: "host-checkbox",
        "data-adapttable-part": "selection-checkbox",
        "aria-label": "Select all rows",
        ref: target,
      },
      checked: checked.value,
      indeterminate: indeterminate.value,
      onChange,
    })
  );
  await nextTick();
  const input = inputIn(host);
  expect(host.querySelector(".v-checkbox-btn")).not.toBeNull();
  expect(input.classList.contains("host-checkbox")).toBe(true);
  expect(input.getAttribute("aria-checked")).toBe("mixed");
  expect(input.indeterminate).toBe(true);
  expect(target).toHaveBeenLastCalledWith(input);
  input.click();
  expect(onChange).toHaveBeenCalledExactlyOnceWith(true);
  await nextTick();
  expect(input.checked).toBe(false);
  expect(input.indeterminate).toBe(true);
  checked.value = true;
  indeterminate.value = false;
  await nextTick();
  expect(input.checked).toBe(true);
  expect(input.getAttribute("aria-checked")).toBe("true");
  expect(
    host.querySelector(".v-checkbox-btn")?.getAttribute("data-adapttable-part")
  ).toBeNull();
  cleanups.pop()?.();
  expect(target).toHaveBeenLastCalledWith(null);
});

it("resolves a Vuetify button ref to its actual button", async () => {
  const target = vi.fn();
  const onClick = vi.fn();
  const host = mount(() =>
    h(VuetifyButton, {
      attrs: {
        ref: target,
        "data-adapttable-part": "page-next",
        "aria-label": "Next page",
        onClick,
      },
      content: "Next",
    })
  );
  await nextTick();
  const button = host.querySelector("button");
  expect(button?.classList.contains("v-btn")).toBe(true);
  expect(target).toHaveBeenLastCalledWith(button);
  button?.click();
  expect(onClick).toHaveBeenCalledOnce();
  cleanups.pop()?.();
  expect(target).toHaveBeenLastCalledWith(null);
});

it("renders compound ownership on the server and hydrates without relocating markers", async () => {
  const content = defineComponent({
    setup() {
      const value = ref("Ada");
      return () =>
        h("section", [
          h(VuetifyInput, {
            attrs: {
              id: "server-search",
              "aria-label": "Search records",
              "data-adapttable-part": "search-input",
              class: "server-search-class",
            },
            value: value.value,
            onChange: (next: string) => {
              value.value = next;
            },
          }),
          h(VuetifySelect, {
            attrs: {
              id: "server-team",
              "aria-label": "Team",
              "data-adapttable-part": "filter-select",
            },
            value: "platform",
            options: [{ value: "platform", label: "Platform" }],
            onChange: () => undefined,
          }),
          h(VuetifyCheckbox, {
            attrs: {
              id: "server-selection",
              "aria-label": "Select all",
              "data-adapttable-part": "selection-checkbox",
            },
            checked: false,
            indeterminate: true,
            onChange: () => undefined,
          }),
        ]);
    },
  });
  const html = await renderToString(createSSRApp(content).use(vuetify()));
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  const input = inputIn(host);
  expect(input.id).toBe("server-search");
  expect(input.getAttribute("aria-label")).toBe("Search records");
  const field = host.querySelector('[data-adapttable-part="search-input"]');
  expect(field?.classList.contains("v-text-field")).toBe(true);
  expect(field?.classList.contains("server-search-class")).toBe(true);
  expect(
    host.querySelectorAll('[data-adapttable-part="search-input"]')
  ).toHaveLength(1);
  expect(
    host
      .querySelector('[data-adapttable-part="filter-select"]')
      ?.classList.contains("v-select")
  ).toBe(true);
  expect(host.querySelector("#server-team")?.getAttribute("role")).toBe(
    "combobox"
  );
  expect(
    host.querySelector("#server-selection")?.getAttribute("aria-checked")
  ).toBe("mixed");
  const warning = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const client = createSSRApp(content).use(vuetify());
  client.mount(host);
  cleanups.push(() => {
    client.unmount();
    host.remove();
  });
  await nextTick();
  expect(inputIn(host)).toBe(input);
  expect(warning).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

it("does not restore detached checkbox paint after unmount before nextTick", async () => {
  const host = mount(() =>
    h(VuetifyCheckbox, {
      attrs: { "aria-label": "Select row" },
      checked: false,
      onChange: () => undefined,
    })
  );
  await nextTick();
  const input = inputIn(host);
  input.click();
  expect(input.checked).toBe(true);
  cleanups.pop()?.();
  await nextTick();
  expect(input.isConnected).toBe(false);
  expect(input.checked).toBe(true);
});

it("does not let queued checkbox paint affect a replacement owner", async () => {
  const owner = ref("first");
  const changed = vi.fn(() => {
    owner.value = "second";
  });
  const host = mount(() =>
    h(VuetifyCheckbox, {
      key: owner.value,
      attrs: { id: owner.value, "aria-label": "Select row" },
      checked: false,
      onChange: changed,
    })
  );
  await nextTick();
  const previous = inputIn(host);
  previous.click();
  await nextTick();
  const current = inputIn(host);
  expect(changed).toHaveBeenCalledExactlyOnceWith(true);
  expect(current).not.toBe(previous);
  expect(current.id).toBe("second");
  expect(current.checked).toBe(false);
  expect(previous.isConnected).toBe(false);
  expect(previous.checked).toBe(true);
});

it("releases the input ref if its owner unmounts before pending post-flush work", async () => {
  const target = vi.fn();
  mount(() =>
    h(VuetifyInput, {
      attrs: { ref: target, "aria-label": "Search" },
      value: "",
      onChange: () => undefined,
    })
  );
  cleanups.pop()?.();
  const afterUnmount = target.mock.calls.length;
  await nextTick();
  expect(
    target.mock.calls
      .slice(afterUnmount)
      .some(([value]) => value instanceof HTMLElement)
  ).toBe(false);
  expect(target).toHaveBeenLastCalledWith(null);
});

it("uses one model request for search and restores rejected edits without resetting accepted text", async () => {
  const value = ref("Ada");
  const decoration = ref("first");
  let accept = true;
  const legacyInput = vi.fn();
  const changed = vi.fn((next: string) => {
    if (accept) value.value = next;
  });
  const host = mount(() =>
    h(VuetifyInput, {
      attrs: {
        "aria-label": "Search",
        class: decoration.value,
        value: "stale native value",
        onInput: legacyInput,
      },
      value: value.value,
      onChange: changed,
    })
  );
  await nextTick();
  const input = inputIn(host);
  expect(input.value).toBe("Ada");
  input.focus();
  input.value = "Bea";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
  expect(changed).toHaveBeenCalledExactlyOnceWith("Bea");
  expect(legacyInput).not.toHaveBeenCalled();
  expect(input.value).toBe("Bea");
  accept = false;
  input.value = "Mira";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
  await nextTick();
  expect(value.value).toBe("Bea");
  expect(input.value).toBe("Bea");
  decoration.value = "second";
  await nextTick();
  expect(inputIn(host)).toBe(input);
  expect(input.value).toBe("Bea");
  expect(document.activeElement).toBe(input);
});

it("uses a native Vuetify divider target for keyboard and pointer resizing", async () => {
  const target = vi.fn();
  const keydown = vi.fn();
  const controls = vuetifyTableControls<unknown>();
  const render = controls.ResizeHandle;
  if (!render) throw new Error("Missing Vuetify resize control");
  const host = mount(() =>
    h("div", [
      render({
        attrs: {
          role: "separator",
          tabindex: 0,
          "aria-orientation": "vertical",
          "aria-label": "Resize Name",
          "data-adapttable-part": "resize-handle",
          ref: target,
          onKeydown: keydown,
          style: { width: "8px" },
        },
      }),
    ])
  );
  await nextTick();
  const divider = host.querySelector("hr.v-divider");
  expect(divider?.getAttribute("data-adapttable-part")).toBe("resize-handle");
  expect(divider?.getAttribute("role")).toBe("separator");
  expect(divider?.getAttribute("tabindex")).toBe("0");
  expect(target).toHaveBeenLastCalledWith(divider);
  divider?.dispatchEvent(
    new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
  );
  expect(keydown).toHaveBeenCalledOnce();
  cleanups.pop()?.();
  expect(target).toHaveBeenLastCalledWith(null);
});
