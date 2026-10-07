import { createApp, createSSRApp, h, nextTick, ref, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";
import { createVuetify } from "vuetify/framework";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import VuetifyInput from "../src/controls/VuetifyInput.vue";
import { DataTable } from "../src";

const cleanups: (() => void)[] = [];
function kit() {
  return createVuetify({
    ssr: true,
    icons: { defaultSet: "mdi", aliases, sets: { mdi } },
  });
}
function mount(render: () => VNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ setup: () => render }).use(kit());
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return host;
}
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function searchbox(host: ParentNode): HTMLInputElement {
  const candidates = host.querySelectorAll(
    '[role="searchbox"], input[type="search"]:not([role])'
  );
  expect(candidates).toHaveLength(1);
  const input = candidates[0];
  if (!(input instanceof HTMLInputElement))
    throw new Error("The only searchbox must be the native input");
  return input;
}
it.each(["Search", "بحث"])(
  "keeps one native searchbox named %s with stable refs and events",
  async (label) => {
    const target = vi.fn();
    const changed = vi.fn();
    const keydown = vi.fn();
    const decoration = ref("first");
    const host = mount(() =>
      h(VuetifyInput, {
        value: "",
        type: "search",
        attrs: {
          role: "searchbox",
          "aria-label": label,
          "aria-describedby": "search-help",
          id: "search-input",
          "data-adapttable-part": "search-input",
          class: decoration.value,
          ref: target,
          onKeydown: keydown,
        },
        onChange: changed,
      })
    );
    await nextTick();
    const input = searchbox(host);
    expect(input.getAttribute("aria-label")).toBe(label);
    expect(input.getAttribute("aria-describedby")).toBe("search-help");
    expect(input.id).toBe("search-input");
    expect(target).toHaveBeenLastCalledWith(input);
    expect(
      host
        .querySelector('[data-adapttable-part="search-input"]')
        ?.classList.contains("v-text-field")
    ).toBe(true);
    input.focus();
    decoration.value = "second";
    await nextTick();
    expect(searchbox(host)).toBe(input);
    expect(document.activeElement).toBe(input);
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(changed).toHaveBeenCalledExactlyOnceWith("Ada");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    expect(keydown).toHaveBeenCalledOnce();
  }
);
it.each(["Search", "بحث"])(
  "server-renders one native searchbox named %s in DataTable",
  async (label) => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<{ id: string; name: string }>, {
            data: [{ id: "ada", name: "Ada" }],
            columns: [{ key: "name", header: "Name" }],
            rowKey: (row) => row.id,
            labels: { search: label },
            urlSync: false,
            forceMobile: false,
          }),
      }).use(kit())
    );
    const host = document.createElement("div");
    host.innerHTML = html;
    const input = searchbox(host);
    expect(input.getAttribute("aria-label")).toBe(label);
  }
);
