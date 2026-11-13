import { mount } from "@vue/test-utils";
import {
  Comment,
  defineComponent,
  Fragment,
  h,
  nextTick,
  shallowRef,
  Text,
  type VNode,
  type VNodeChild,
} from "vue";
import { createVuetify } from "vuetify";
import { VMenu } from "vuetify/components/VMenu";
import { VSelect } from "vuetify/components/VSelect";
import { VTextarea } from "vuetify/components/VTextarea";
import { VTextField } from "vuetify/components/VTextField";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable } from "../src";
import VuetifyInput from "../src/controls/VuetifyInput.vue";
import VuetifySelect from "../src/controls/VuetifySelect.vue";
import { vuetifyEditingButton } from "../src/editing/actionButton";
import VuetifyEditorSelect from "../src/editing/VuetifyEditorSelect.vue";
import VuetifyHeaderMulti from "../src/filters/VuetifyHeaderMulti.vue";
import { groupingPanel } from "../src/grouping-panel";
import LoadingState from "../src/LoadingState.vue";
import { rowActions } from "../src/row-actions";
import { rowDetail } from "../src/row-detail";
import { rowReorder } from "../src/row-reorder";
import RowActions from "../src/RowActions.vue";
import { requiredControl } from "../src/table/requiredControl";

const wrappers: ReturnType<typeof mount>[] = [];
function render(content: () => VNode) {
  const wrapper = mount(
    defineComponent(() => content),
    {
      attachTo: document.body,
      global: {
        plugins: [
          createVuetify({
            ssr: true,
            icons: { defaultSet: "mdi", aliases, sets: { mdi } },
          }),
        ],
      },
    }
  );
  wrappers.push(wrapper);
  return wrapper;
}
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.replaceChildren();
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const data = [
  { id: "a", name: "Ada", amount: 2 },
  { id: "b", name: "Bea", amount: 3 },
];
type Row = (typeof data)[number];
const base = {
  data,
  columns: [{ key: "name", header: "Name", sortable: true }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
  forceMobile: false,
};

it.each([false, true])(
  "renders native loading skeletons and normalizes invalid counts, mobile=%s",
  async (mobile) => {
    const rows = shallowRef(2.9);
    const wrapper = render(() =>
      h(LoadingState, {
        rows: rows.value,
        columns: 0,
        mobile,
        classNames: { loadingLine: "host-loading" },
      })
    );
    expect(
      wrapper.findAll(part(mobile ? "loading-card" : "loading-row"))
    ).toHaveLength(2);
    expect(wrapper.findAll(".host-loading")).toHaveLength(mobile ? 2 : 3);
    expect(wrapper.find(".v-skeleton-loader").exists()).toBe(true);
    expect(wrapper.attributes("aria-hidden")).toBe("true");
    rows.value = Number.NaN;
    await nextTick();
    expect(
      wrapper.findAll(part(mobile ? "loading-card" : "loading-row"))
    ).toHaveLength(0);
    rows.value = -2;
    await nextTick();
    expect(
      wrapper.findAll(part(mobile ? "loading-card" : "loading-row"))
    ).toHaveLength(0);
  }
);

const headerContents: [string, () => VNodeChild, boolean][] = [
  ["false", () => false, false],
  ["number", () => 0, true],
  ["whitespace", () => " ", false],
  ["array", () => [false, "Action"], true],
  ["comment", () => h(Comment), false],
  ["fragment", () => h(Fragment, [h(Comment), h("button", "Action")]), true],
  ["empty fragment", () => h(Fragment, []), false],
  ["text", () => h(Text, "Action"), true],
  ["empty text", () => h(Text, " "), false],
  ["element", () => h("button", "Action"), true],
];
it.each(headerContents)(
  "omits empty header-action chrome for %s content",
  (_name, content, visible) => {
    const wrapper = render(() =>
      h(DataTable<Row>, {
        ...base,
        columns: [{ key: "name", headerActions: content }],
      })
    );
    expect(wrapper.find(part("header-actions")).exists()).toBe(visible);
    expect(wrapper.findAll(part("header-cell"))).toHaveLength(1);
  }
);

it.each([false, true])(
  "renders footer summaries around enabled structural columns, mobile=%s",
  async (mobile) => {
    const wrapper = render(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: mobile,
        selectable: true,
        columns: [
          { key: "name", mobileLabel: "Person" },
          {
            key: "amount",
            footer: ({ value }) => h("strong", `Sum ${String(value)}`),
          },
        ],
        summaryRow: () => ({ amount: 5 }),
        features: [
          rowDetail<Row>(() => h("p", "Details")),
          rowReorder<Row>(vi.fn()),
          rowActions<Row>([{ key: "open", label: "Open", onClick: vi.fn() }]),
        ],
      })
    );
    await nextTick();
    await nextTick();
    const summary = wrapper.get(part(mobile ? "summary-card" : "summary"));
    expect(summary.text()).toContain("Sum 5");
    expect(summary.find("input").exists()).toBe(false);
    if (mobile) expect(wrapper.get(part("card-label")).text()).toBe("Person");
    else expect(summary.findAll("td,th")).toHaveLength(6);
  }
);

it("renders summary cells without optional leading or trailing columns and sorts descending", async () => {
  const wrapper = render(() =>
    h(DataTable<Row>, { ...base, summaryRow: () => ({ name: "Total" }) })
  );
  expect(wrapper.get(part("summary")).text()).toBe("Total");
  const sort = wrapper.get(part("sort-button"));
  await sort.trigger("click");
  await sort.trigger("click");
  expect(wrapper.get(part("header-cell")).attributes("aria-sort")).toBe(
    "descending"
  );
  expect(
    wrapper
      .findAll("tbody [data-row-id]")
      .map((row) => row.attributes("data-row-id"))
  ).toEqual(["b", "a"]);
});

it.each([false, true])(
  "renders read-only computed grouping aggregates, mobile=%s",
  async (mobile) => {
    const wrapper = render(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: mobile,
        columns: [{ key: "name" }, { key: "amount" }],
        features: [
          groupingPanel<Row>("name", {
            groupAggregates: () => ({ amount: "App total" }),
          }),
        ],
      })
    );
    await nextTick();
    await nextTick();
    expect(wrapper.get(part("grouping-aggregation-item")).text()).toContain(
      "Set by the app"
    );
    expect(wrapper.find(part("grouping-aggregation-operation")).exists()).toBe(
      false
    );
    expect(
      wrapper.findAll(part(mobile ? "group-card" : "group-row"))
    ).toHaveLength(2);
  }
);

it("uses a real multiline control, accepts strings and resets rejected native text", async () => {
  const changed = vi.fn();
  const wrapper = render(() =>
    h(VuetifyInput, {
      attrs: { "aria-label": "Notes", "aria-invalid": "true" },
      value: "Saved",
      multiline: true,
      onChange: changed,
    })
  );
  const input = wrapper.get("textarea");
  await input.setValue("Rejected");
  await nextTick();
  expect(changed).toHaveBeenLastCalledWith("Rejected");
  expect((input.element as HTMLTextAreaElement).value).toBe("Saved");
  wrapper.getComponent(VTextarea).vm.$emit("update:modelValue", null);
  await nextTick();
  expect(changed).toHaveBeenLastCalledWith("");
  expect(wrapper.find(".v-field--error").exists()).toBe(true);
});

it("retires queued input paint when its native control is replaced or detached", async () => {
  const multiline = shallowRef(false);
  const changed = vi.fn(() => {
    multiline.value = true;
  });
  const wrapper = render(() =>
    h(VuetifyInput, {
      attrs: {},
      value: "Saved",
      multiline: multiline.value,
      onChange: changed,
    })
  );
  wrapper.getComponent(VTextField).vm.$emit("update:modelValue", "Old");
  await nextTick();
  expect(wrapper.find("textarea").exists()).toBe(true);
  expect(wrapper.find("input").exists()).toBe(false);
  const textarea = wrapper.get("textarea").element as HTMLTextAreaElement;
  textarea.remove();
  wrapper.getComponent(VTextarea).vm.$emit("update:modelValue", "Detached");
  await nextTick();
  expect(changed.mock.calls).toEqual([["Old"], ["Detached"]]);
});

it("ignores null selection emissions and forwards valid strings once", async () => {
  const changed = vi.fn();
  const wrapper = render(() =>
    h(VuetifySelect, {
      attrs: { "aria-label": "Choice" },
      value: "a",
      options: [{ value: "a", label: "Alpha" }],
      onChange: changed,
    })
  );
  wrapper.getComponent(VSelect).vm.$emit("update:modelValue", null);
  wrapper.getComponent(VSelect).vm.$emit("update:modelValue", "a");
  await nextTick();
  expect(changed).toHaveBeenCalledExactlyOnceWith("a");
});

it.each([false, true])(
  "normalizes cleared editor values, multiple=%s",
  async (multiple) => {
    const changed = vi.fn();
    const wrapper = render(() =>
      h(VuetifyEditorSelect, {
        attrs: { "aria-label": "Editor" },
        value: "",
        multiple,
        options: [{ value: "a", label: "Alpha" }],
        onChange: changed,
        onBlur: vi.fn(),
        onKeyDown: vi.fn(),
      })
    );
    wrapper.getComponent(VSelect).vm.$emit("update:modelValue", null);
    await nextTick();
    expect(changed).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenLastCalledWith("");
  }
);

it("deduplicates multiple-header updates and emits the one removed option", () => {
  const toggle = vi.fn();
  const wrapper = render(() =>
    h(VuetifyHeaderMulti, {
      control: {
        label: "Teams",
        summary: "2 teams",
        selected: ["a", "b"],
        options: [
          { value: "a", label: "Alpha" },
          { value: "b", label: "Beta" },
        ],
        onToggle: toggle,
      },
    })
  );
  const select = wrapper.getComponent(VSelect);
  select.vm.$emit("update:modelValue", null);
  select.vm.$emit("update:modelValue", ["a", "b"]);
  expect(toggle).not.toHaveBeenCalled();
  select.vm.$emit("update:modelValue", ["b"]);
  expect(toggle).toHaveBeenCalledExactlyOnceWith("a", false);
  expect(wrapper.text().split("2 teams")).toHaveLength(2);
});

it("renders iconless editing actions with their label and callback", async () => {
  const onClick = vi.fn();
  const wrapper = render(() =>
    vuetifyEditingButton({
      attrs: {},
      part: "edit-cell-save",
      label: "Save",
      icon: false,
      onClick,
    })
  );
  await wrapper.get("button").trigger("click");
  expect(wrapper.text()).toBe("Save");
  expect(onClick).toHaveBeenCalledOnce();
});

it("rejects an enabled feature whose required native control is absent", () => {
  expect(() => requiredControl(undefined, "ResizeHandle")).toThrow(
    "Vuetify requires the ResizeHandle control"
  );
  const control = () => h("span");
  expect(requiredControl(control, "ResizeHandle")).toBe(control);
});

it.each([false, true])(
  "opens real row-action menus without activating the row, mobile=%s",
  async (mobile) => {
    const action = vi.fn();
    const clicked = vi.fn();
    const wrapper = render(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: mobile,
        rowActionsLayout: "menu",
        onRowClick: clicked,
        features: [
          rowActions<Row>([
            { key: "open", label: "Open record", onClick: action },
          ]),
        ],
      })
    );
    await nextTick();
    const trigger = wrapper.get(part("row-actions-trigger"));
    await trigger.trigger("pointerdown");
    await trigger.trigger("click");
    const menu = wrapper.findComponent(VMenu);
    expect(menu.exists()).toBe(true);
    await vi.waitFor(() =>
      expect(document.querySelector('[role="menuitem"]')).not.toBeNull()
    );
    const item = document.querySelector<HTMLButtonElement>('[role="menuitem"]');
    expect(item?.textContent).toBe("Open record");
    item?.click();
    await nextTick();
    expect(action).toHaveBeenCalledExactlyOnceWith(data[0]);
    expect(clicked).not.toHaveBeenCalled();
  }
);

it("omits a menu trigger when there are no row actions", () => {
  const wrapper = render(() =>
    h(RowActions<Row>, {
      controls: [],
      layout: "menu",
      label: "Actions",
      classNames: {},
    })
  );
  expect(wrapper.find("button").exists()).toBe(false);
  expect(wrapper.findComponent(VMenu).exists()).toBe(false);
});
