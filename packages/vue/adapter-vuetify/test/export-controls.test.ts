import { type ExportAllControls, useServerData } from "@adapttable/vue";
import { mount } from "@vue/test-utils";
import { afterEach, expect, it, vi } from "vitest";
import {
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { VCard } from "vuetify/components/VCard";
import { VProgressCircular } from "vuetify/components/VProgressCircular";
import { VProgressLinear } from "vuetify/components/VProgressLinear";
import { createVuetify } from "vuetify/framework";

import { DataTable } from "../src";
import { exportCsv } from "../src/export";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const base = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  dir: "rtl" as const,
  urlSync: false,
  searchable: false,
  forceMobile: false,
};
const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 25));
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});
function table(render: () => ReturnType<typeof h>) {
  const wrapper = mount(
    defineComponent(() => render),
    {
      attachTo: document.body,
      global: { plugins: [createVuetify({ ssr: true })] },
    }
  );
  wrappers.push(wrapper);
  return wrapper;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function element<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  name: string
): T {
  const found = root.querySelector<T>(part(name));
  if (!found) throw new Error(`Missing ${name}`);
  return found;
}
async function click(root: ParentNode, name: string) {
  const target = element(root, name);
  target.focus();
  target.click();
  await settle();
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it.each([{ format: "CSV", factory: exportCsv }])(
  "keeps $format selection exports host-owned and blocks duplicate admission",
  async ({ format, factory }) => {
    const pending = deferred<void>();
    const request = vi.fn(() => pending.promise);
    const selected = shallowRef<readonly string[]>(["b"]);
    const feature = factory<Row>({ scope: "selected", request });
    const wrapper = table(() =>
      h(DataTable<Row>, {
        ...base,
        selectedIds: selected.value,
        features: [feature],
      })
    );
    await settle();
    const button = element<HTMLButtonElement>(
      wrapper.element,
      "export-csv-button"
    );
    expect(button.tagName).toBe("BUTTON");
    expect(button.textContent).toContain(format);
    await click(wrapper.element, "export-csv-button");
    button.click();
    expect(request).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ scope: "selected", rows: [rows[1]] })
    );
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(wrapper.findComponent(VProgressCircular).exists()).toBe(true);
    pending.resolve();
    await settle();
    expect(element(wrapper.element, "export-announcer").textContent).toContain(
      "Export complete"
    );
    selected.value = ["a"];
    await settle();
    await click(wrapper.element, "export-csv-button");
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: [rows[0]] })
    );
    expect(rows).toEqual([
      { id: "a", name: "Ada" },
      { id: "b", name: "Bea" },
    ]);
  }
);

it.each([false, true])(
  "uses native server progress, cancellation, retry and local focus mobile=%s",
  async (mobile) => {
    const jobs = [
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
    ];
    const controls: ExportAllControls[] = [];
    const feature = exportCsv<Row>({
      scope: "all",
      onExportAll: (_query, control) => {
        controls.push(control);
        return jobs[controls.length - 1]!.promise;
      },
    });
    const wrapper = table(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: mobile,
        features: [feature],
        classNames: {
          exportCsvButton: "custom-trigger",
          exportSpinner: "custom-spinner",
          exportProgress: "custom-progress",
          exportProgressBar: "custom-progress-bar",
          exportProgressMessage: "custom-message",
          exportProgressButton: "custom-action",
          exportProgressDownload: "custom-download",
        },
      })
    );
    await settle();
    const trigger = element(wrapper.element, "export-csv-button");
    expect(trigger.classList.contains("custom-trigger")).toBe(true);
    await click(wrapper.element, "export-csv-button");
    const surface = element(wrapper.element, "export-progress-surface");
    expect(surface.tagName).toBe("SECTION");
    expect(surface.dir).toBe("rtl");
    expect(surface.classList.contains("custom-progress")).toBe(true);
    expect(wrapper.findComponent(VCard).exists()).toBe(true);
    expect(
      wrapper
        .findAllComponents(VProgressLinear)
        .find(
          (item) =>
            item.attributes("data-adapttable-part") === "export-progress-bar"
        )!
        .props("indeterminate")
    ).toBe(true);
    expect(
      element(wrapper.element, "export-progress-bar").hasAttribute(
        "aria-valuenow"
      )
    ).toBe(false);
    expect(
      element(wrapper.element, "export-spinner").classList.contains(
        "custom-spinner"
      )
    ).toBe(true);
    controls[0]!.setProgress?.(36);
    controls[0]!.setMessage?.("36 rows");
    await settle();
    expect(element(wrapper.element, "export-progress-surface")).toBe(surface);
    expect(
      wrapper
        .findAllComponents(VProgressLinear)
        .find(
          (item) =>
            item.attributes("data-adapttable-part") === "export-progress-bar"
        )!
        .props("modelValue")
    ).toBeCloseTo(36);
    expect(
      element(wrapper.element, "export-progress-bar").getAttribute(
        "aria-valuenow"
      )
    ).toBe("36");
    expect(
      element(wrapper.element, "export-progress-message").textContent
    ).toBe("36 rows");
    await click(wrapper.element, "export-progress-cancel");
    expect(controls[0]!.signal.aborted).toBe(true);
    jobs[0]!.resolve({ url: "/stale.csv" });
    await settle();
    expect(wrapper.find("a[download]").exists()).toBe(false);
    await click(wrapper.element, "export-progress-dismiss");
    expect(document.activeElement).toBe(trigger);
    await click(wrapper.element, "export-csv-button");
    jobs[1]!.reject(new Error("Backend unavailable"));
    await settle();
    expect(wrapper.get('[role="alert"]').text()).toBe("Backend unavailable");
    await click(wrapper.element, "export-progress-retry");
    jobs[2]!.resolve({ url: "/report.csv" });
    await settle();
    const download = element<HTMLAnchorElement>(
      wrapper.element,
      "export-progress-download"
    );
    expect(download.tagName).toBe("A");
    expect(download.getAttribute("href")).toBe("/report.csv");
    expect(download.hasAttribute("download")).toBe(true);
    expect(download.classList.contains("custom-download")).toBe(true);
    await click(wrapper.element, "export-progress-dismiss");
    expect(wrapper.find(part("export-progress-surface")).exists()).toBe(false);
    expect(document.activeElement).toBe(trigger);
  }
);

it("keeps false exports inert, disables unsupported server scope and retires suspended jobs", async () => {
  const scope = effectScope();
  const server = scope.run(() =>
    useServerData<Row>({ rows, total: 9, urlSync: false })
  );
  if (!server) throw new Error("Missing server source");
  const jobs = deferred<{ url: string }>();
  const controls: ExportAllControls[] = [];
  const live = shallowRef(true);
  const features = shallowRef([exportCsv<Row>(false)]);
  const Owner = defineComponent(
    () => () =>
      h(DataTable<Row>, {
        ...base,
        data: undefined,
        source: server.value,
        features: features.value,
      })
  );
  const wrapper = table(() =>
    h(KeepAlive, {}, () => (live.value ? h(Owner) : null))
  );
  try {
    await settle();
    expect(wrapper.find(part("export-csv-button")).exists()).toBe(false);
    features.value = [exportCsv<Row>({ scope: "all" })];
    await settle();
    expect(
      element<HTMLButtonElement>(wrapper.element, "export-csv-button").disabled
    ).toBe(true);
    expect(element(wrapper.element, "export-csv-button").title).toBeTruthy();
    features.value = [
      exportCsv<Row>({
        scope: "all",
        onExportAll: (_query, control) => {
          controls.push(control);
          return jobs.promise;
        },
      }),
    ];
    await settle();
    await click(wrapper.element, "export-csv-button");
    live.value = false;
    await settle();
    expect(controls[0]!.signal.aborted).toBe(true);
    jobs.resolve({ url: "/late.csv" });
    live.value = true;
    await settle();
    expect(wrapper.find("a[download]").exists()).toBe(false);
    expect(
      element<HTMLButtonElement>(wrapper.element, "export-csv-button").disabled
    ).toBe(false);
  } finally {
    scope.stop();
  }
});
