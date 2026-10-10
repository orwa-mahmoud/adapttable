import type { TableDensity } from "@adapttable/vue";
import { afterEach, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable } from "../src";
import { densityChooser } from "../src/density";

interface Row {
  id: string;
  name: string;
}
const base = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" as const }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  forceMobile: false,
  paginationMode: "paged" as const,
};
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
  await nextTick();
}
function target<T extends HTMLElement>(host: ParentNode, selector: string): T {
  const node = host.querySelector<T>(selector);
  if (!node) throw new Error(`Missing ${selector}`);
  return node;
}
function group(host: ParentNode) {
  return target(host, '[data-adapttable-part="density-toggle"]');
}
function choice(host: ParentNode, label: string) {
  const node = [
    ...group(host).querySelectorAll<HTMLButtonElement>("button"),
  ].find((item) => item.textContent === label);
  if (!node) throw new Error(`Missing density ${label}`);
  return node;
}
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
async function key(node: HTMLElement, value: string) {
  node.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await flush();
}
it("preserves the host value on rejection, admits repeated requests and uses the latest callback", async () => {
  const density = shallowRef<TableDensity>("comfortable");
  const first = vi.fn();
  const accepted = vi.fn((value: TableDensity) => {
    density.value = value;
  });
  const callback = shallowRef<(value: TableDensity) => void>(first);
  const feature = densityChooser();
  const host = mount(() =>
    h(DataTable<Row>, {
      ...base,
      density: density.value,
      onDensityChange: callback.value,
      features: [feature],
      classNames: {
        densitySelect: "legacy-density",
        densityToggle: "custom-density",
      },
    })
  );
  await flush();
  const comfortable = choice(host, "Comfortable");
  const compact = choice(host, "Compact");
  expect(group(host).classList.contains("legacy-density")).toBe(true);
  expect(group(host).classList.contains("custom-density")).toBe(true);
  expect(group(host).getAttribute("aria-label")).toBeTruthy();
  comfortable.click();
  await flush();
  expect(first).not.toHaveBeenCalled();
  compact.click();
  await flush();
  compact.click();
  await flush();
  expect(first.mock.calls).toEqual([["compact"], ["compact"]]);
  expect(comfortable.getAttribute("aria-pressed")).toBe("true");
  expect(compact.getAttribute("aria-pressed")).toBe("false");
  expect(target(host, "[data-density]").getAttribute("data-density")).toBe(
    "comfortable"
  );
  callback.value = accepted;
  await flush();
  compact.click();
  await flush();
  expect(first).toHaveBeenCalledTimes(2);
  expect(accepted).toHaveBeenCalledExactlyOnceWith("compact");
  expect(compact.getAttribute("aria-pressed")).toBe("true");
  compact.click();
  await flush();
  expect(accepted).toHaveBeenCalledTimes(1);
  expect(compact.getAttribute("aria-pressed")).toBe("true");
  comfortable.click();
  await flush();
  expect(accepted.mock.calls).toEqual([["compact"], ["comfortable"]]);
  density.value = "compact";
  await flush();
  expect(compact.getAttribute("aria-pressed")).toBe("true");
  expect(target(host, "[data-density]").getAttribute("data-density")).toBe(
    "compact"
  );
});
it.each(["ltr", "rtl"] as const)(
  "keeps visible mobile choices and moves focus in %s order",
  async (dir) => {
    const changed = vi.fn();
    const host = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: true,
        dir,
        density: "comfortable",
        onDensityChange: changed,
        features: [densityChooser()],
      })
    );
    await flush();
    const comfortable = choice(host, "Comfortable");
    const compact = choice(host, "Compact");
    expect(group(host).getAttribute("dir")).toBe(dir);
    expect(group(host).getAttribute("role")).toBe("group");
    expect(host.querySelectorAll("article")).toHaveLength(1);
    expect(group(host).querySelectorAll("button")).toHaveLength(2);
    expect(
      host
        .querySelector('[data-adapttable-part="rows-per-page"]')
        ?.getAttribute("role")
    ).toBe("combobox");
    expect(group(host).querySelector('[role="combobox"]')).toBeNull();
    comfortable.focus();
    await key(comfortable, dir === "rtl" ? "ArrowLeft" : "ArrowRight");
    expect(document.activeElement).toBe(compact);
    expect(changed).not.toHaveBeenCalled();
    await key(compact, "Home");
    expect(document.activeElement).toBe(comfortable);
    await key(comfortable, "End");
    expect(document.activeElement).toBe(compact);
    await key(compact, dir === "rtl" ? "ArrowRight" : "ArrowLeft");
    expect(document.activeElement).toBe(comfortable);
    expect(comfortable.getAttribute("aria-pressed")).toBe("true");
  }
);
it("hydrates visible, localized toggle choices and preserves their initial selected state", async () => {
  const density = shallowRef<TableDensity>("compact");
  const component = defineComponent({
    render: () =>
      h(DataTable<Row>, {
        ...base,
        dir: "rtl",
        density: density.value,
        labels: {
          density: "Density choice",
          densityComfortable: "Roomy",
          densityCompact: "Dense",
        },
        onDensityChange: (value) => {
          density.value = value;
        },
        features: [densityChooser()],
      }),
  });
  const html = await renderToString(createSSRApp(component));
  expect(html).toContain("Roomy");
  expect(html).toContain("Dense");
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.append(host);
  const serverGroup = group(host);
  const serverChoice = choice(host, "Dense");
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const app = createSSRApp(component);
  app.mount(host);
  stops.push(() => app.unmount());
  await flush();
  expect(group(host)).toBe(serverGroup);
  expect(choice(host, "Dense")).toBe(serverChoice);
  expect(serverChoice.getAttribute("aria-pressed")).toBe("true");
  expect(group(host).getAttribute("aria-label")).toBe("Density choice");
  choice(host, "Roomy").click();
  await flush();
  expect(density.value).toBe("comfortable");
  expect(choice(host, "Roomy").getAttribute("aria-pressed")).toBe("true");
  expect(
    [...warn.mock.calls, ...error.mock.calls].filter((args) =>
      args.some((arg) => /hydration/i.test(String(arg)))
    )
  ).toEqual([]);
});
