import { afterEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";

import FeatureUnionDemo from "../../../../apps/showcase/src/vue/feature-union/FeatureUnionDemo.vue";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

afterEach(() => vi.restoreAllMocks());

function hostButton(host: ParentNode, label: string): HTMLButtonElement {
  const button = [
    ...host.querySelectorAll<HTMLButtonElement>("fieldset button"),
  ].find((element) => element.textContent?.trim() === label);
  if (!button) throw new Error(`Missing host control: ${label}`);
  return button;
}

async function setup() {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(320);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
  const view = mountNative(() => h(FeatureUnionDemo));
  await tick();
  const label = [...view.host.querySelectorAll("fieldset label")].find(
    (element) => element.textContent?.includes("Accept move requests")
  );
  if (!label) throw new Error("Missing move acceptance control");
  find<HTMLInputElement>(label, "input").click();
  await tick();
  const requestMove = async () => {
    const select = find<HTMLSelectElement>(
      view.host,
      `[data-row-id="leaf-0"] ${part("row-move-menu-trigger")}`
    );
    expect(
      [...select.options].find((option) => option.value === "destination")
        ?.disabled
    ).toBe(false);
    await write(select, "destination", "change");
    expect(find(view.host, "#union-pending").textContent).toBe("leaf-0");
  };
  return { ...view, requestMove };
}

describe("combined showcase host move confirmation", () => {
  it("keeps approval live when a pending label rerenders an equivalent inline row key", async () => {
    const view = await setup();
    await view.requestMove();
    hostButton(view.host, "Approve pending move").click();
    await tick();

    expect(find(view.host, "#union-move-count").textContent).toBe("1");
    expect(find(view.host, "#union-accepted-moves").textContent).toBe("1");
    expect(
      JSON.parse(find(view.host, "#union-destination").textContent ?? "null")
    ).toEqual(["leaf-0"]);
    expect(find(view.host, "#union-source-version").textContent).toBe("1");
    expect(find(view.host, "#union-pending").textContent).toBe("");
  });

  it("retires host approval after same-ID source replacement and admits a new decision", async () => {
    const view = await setup();
    await view.requestMove();
    hostButton(view.host, "Replace source rows").click();
    await tick();
    hostButton(view.host, "Approve pending move").click();
    await tick();

    expect(find(view.host, "#union-source-version").textContent).toBe("2");
    expect(find(view.host, "#union-move-count").textContent).toBe("0");
    expect(find(view.host, "#union-destination").textContent).toBe("[]");

    await view.requestMove();
    hostButton(view.host, "Approve pending move").click();
    await tick();
    expect(find(view.host, "#union-move-count").textContent).toBe("1");
    expect(find(view.host, "#union-accepted-moves").textContent).toBe("1");
  }, 10_000);
});
