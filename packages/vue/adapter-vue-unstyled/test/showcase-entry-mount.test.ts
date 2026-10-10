import { afterEach, describe, expect, it, vi } from "vitest";
import * as Vue from "vue";

vi.mock("vue", async (importOriginal) => {
  const actual = await importOriginal<typeof Vue>();
  return { ...actual, createApp: vi.fn(actual.createApp) };
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  document.getElementById("root")?.remove();
});

function entryHost() {
  const host = document.createElement("div");
  host.id = "root";
  document.body.append(host);
  const create = vi.mocked(Vue.createApp);
  create.mockClear();
  cleanups.push(() => {
    for (const result of create.mock.results)
      if (result.type === "return") result.value.unmount();
  });
  const warn = vi.spyOn(console, "warn");
  const error = vi.spyOn(console, "error");
  const mounted = async () => {
    await Vue.nextTick();
    expect(create).toHaveBeenCalledOnce();
    expect(host.hasAttribute("data-v-app")).toBe(true);
    expect(host.querySelectorAll("main")).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  };
  return { host, create, mounted };
}

describe("actual showcase entries own the only application mount", () => {
  it("imports the composition component without mounting, then mounts its actual entry", async () => {
    const { host, create, mounted } = entryHost();
    const demo = await import("../browser/composition/main");
    expect(demo.CompositionDemo).toBeDefined();
    expect(create).not.toHaveBeenCalled();
    expect(host.childNodes).toHaveLength(0);
    await import("../../../../apps/showcase/src/vue/entry-composition");
    await mounted();
    expect(host.querySelector("#mounts")?.textContent).toBe("1");
    expect(host.textContent).toContain("Parent");
    expect(host.textContent).toContain("Child");
    const toggle = host.querySelector<HTMLButtonElement>("#toggle");
    expect(toggle).not.toBeNull();
    toggle?.click();
    await Vue.nextTick();
    expect(host.querySelector("#other")?.textContent).toBe("Other view");
    toggle?.click();
    await Vue.nextTick();
    expect(host.querySelector("#mounts")?.textContent).toBe("1");
  });

  it("imports the filter/editing component without mounting, then mounts its actual entry", async () => {
    const { host, create, mounted } = entryHost();
    const demo = await import("../browser/filter-editing/main");
    expect(demo.FilterEditingDemo).toBeDefined();
    expect(create).not.toHaveBeenCalled();
    expect(host.childNodes).toHaveLength(0);
    await import("../../../../apps/showcase/src/vue/entry-filter-editing");
    await mounted();
    expect(host.querySelector("h1")?.textContent).toBe(
      "Native filters and editing"
    );
    expect(host.querySelector("[aria-label='People']")).not.toBeNull();
    expect(host.textContent).toContain("Ada");
    expect(host.textContent).toContain("Grace");
    expect(
      host.querySelector("[data-adapttable-part='filters-button']")
    ).not.toBeNull();
    expect(host.querySelector("#writes")?.textContent).toBe("0");
  });
});
