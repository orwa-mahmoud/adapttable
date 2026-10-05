import {
  type ColumnLayoutState,
  useColumnLayoutUrlState,
} from "@adapttable/vue";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { type ColumnInput, DataTable } from "../src";
import { savedViews } from "../src/saved-views";
import {
  clickControl,
  findControl,
  part,
  setText,
  testUrlAdapter,
  viewStorage,
} from "./view-controls.helpers";

interface Person {
  id: string;
  name: string;
  email: string;
  team: string;
}
const columns: readonly ColumnInput<Person>[] = [
  {
    header: "Contact",
    collapsedKey: "name",
    children: [
      { key: "name", header: "Name", renameable: true },
      { key: "email", header: "Email" },
    ],
  },
  { key: "team", header: "Team" },
];
const data: readonly Person[] = [
  { id: "ada", name: "Ada", email: "ada@example.test", team: "Math" },
];
const empty: ColumnLayoutState = {
  hidden: [],
  order: [],
  widths: {},
  pinned: {},
};
const layout: ColumnLayoutState = {
  ...empty,
  hidden: ["team"],
  order: ["email", "name", "team"],
  pinned: { name: "start" },
  widths: { name: 240 },
  names: { name: "Owner" },
};
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const stop of cleanup.splice(0)) stop();
  vi.useRealTimers();
});

it("captures the host's pending layout with native Saved Views and keeps controlled rejection authoritative", async () => {
  vi.useFakeTimers();
  const adapter = testUrlAdapter("other.colHide=email&outside=kept");
  const storage = viewStorage();
  const accept = shallowRef(true);
  const requests = vi.fn();
  let state: ReturnType<typeof useColumnLayoutUrlState> | undefined;
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup() {
        state = useColumnLayoutUrlState({
          urlAdapter: adapter,
          urlKey: "people",
        });
        const owned = state;
        return () =>
          h(DataTable<Person>, {
            data,
            columns,
            rowKey: (row: Person) => row.id,
            searchable: false,
            urlAdapter: adapter,
            urlKey: "people",
            columnLayout: owned.layout.value,
            collapsibleColumnGroups: true,
            features: [
              savedViews({
                storageKey: "views",
                storage,
                flushViewState: owned.flush,
              }),
            ],
            "onUpdate:columnLayout": (next: ColumnLayoutState) => {
              requests(next);
              if (accept.value) owned.onLayoutChange(next);
            },
          });
      },
    })
  );
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  state?.onLayoutChange(layout);
  await nextTick();
  await clickControl(root, part("column-group-toggle"));
  expect(adapter.getSearch()).not.toContain("people.colHide");
  await clickControl(root, part("views-button"));
  await setText(root, part("views-input"), "My layout");
  await clickControl(root, part("views-save"));
  expect(storage.getItem("views")).toContain("people.colHide=team");
  expect(storage.getItem("views")).toContain("people.colGroupCollapse=Contact");
  state?.onLayoutChange(empty);
  await nextTick();
  expect(
    findControl(root, part("column-group-toggle")).getAttribute("aria-expanded")
  ).toBe("true");
  await clickControl(root, part("views-item"));
  expect(state?.layout.value).toEqual({
    ...layout,
    collapsedGroups: ["Contact"],
  });
  expect(root.querySelector("thead")?.textContent).toContain("Owner");
  const header = findControl<HTMLElement>(root, 'th[data-column-key="name"]');
  expect(header.style.width).toBe("240px");
  expect(header.style.position).toBe("sticky");
  expect(header.style.insetInlineStart).toBe("0px");
  expect(root.querySelectorAll("tbody td")).toHaveLength(1);
  expect(adapter.getSearch()).toContain("other.colHide=email");
  vi.runAllTimers();
  expect(state?.layout.value.collapsedGroups).toEqual(["Contact"]);
  accept.value = false;
  const calls = requests.mock.calls.length;
  await clickControl(root, part("column-group-toggle"));
  expect(requests).toHaveBeenCalledTimes(calls + 1);
  expect(
    findControl(root, part("column-group-toggle")).getAttribute("aria-expanded")
  ).toBe("false");
  expect(state?.layout.value.collapsedGroups).toEqual(["Contact"]);
});
