import { getLabels } from "@adapttable/i18n";
import { type PivotConfig } from "@adapttable/vue/pivot";
import { expect, it } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { PivotPanel } from "../src/pivot";

it("removes and re-adds an Arabic measure through the real native controls", async () => {
  const config = shallowRef<PivotConfig>({
    rows: ["region"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    render: () =>
      h(PivotPanel, {
        fields: [
          { key: "region", label: "المنطقة" },
          { key: "amount", label: "القيمة" },
        ],
        config: config.value,
        labels: getLabels("ar"),
        onChange: (next: PivotConfig) => {
          config.value = next;
        },
      }),
  });
  app.mount(root);
  try {
    const measureZone = root.querySelector<HTMLElement>(
      '[data-zone="measures"]'
    );
    if (!measureZone) throw new Error("The native measure zone is missing.");
    expect(
      measureZone.querySelector('[data-adapttable-part="pivot-field"] > span')
        ?.textContent
    ).toBe("المجموع القيمة");
    const remove = measureZone.querySelector<HTMLButtonElement>(
      'button[aria-label="إزالة الحقل: المجموع القيمة"]'
    );
    if (!remove)
      throw new Error("The localized native remove action is missing.");
    remove.click();
    await nextTick();
    expect(config.value).toEqual({
      rows: ["region"],
      columns: [],
      measures: [],
    });
    expect(
      measureZone.querySelectorAll('[data-adapttable-part="pivot-field"]')
    ).toHaveLength(0);
    const add = measureZone.querySelector<HTMLSelectElement>(":scope > select");
    if (!add) throw new Error("The native add measure control is missing.");
    add.value = "amount";
    add.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(config.value).toEqual({
      rows: ["region"],
      columns: [],
      measures: [{ key: "amount", agg: "sum" }],
    });
    expect(
      measureZone.querySelector(
        'button[aria-label="إزالة الحقل: المجموع القيمة"]'
      )
    ).not.toBeNull();
    const aggregation = measureZone.querySelector<HTMLSelectElement>(
      '[data-adapttable-part="pivot-field"] select'
    );
    if (!aggregation)
      throw new Error("The native aggregation control is missing.");
    aggregation.value = "avg";
    aggregation.dispatchEvent(new Event("change", { bubbles: true }));
    await nextTick();
    expect(config.value.measures).toEqual([{ key: "amount", agg: "avg" }]);
    expect(
      measureZone.querySelector(
        'button[aria-label="إزالة الحقل: المتوسط القيمة"]'
      )
    ).not.toBeNull();
  } finally {
    app.unmount();
    root.remove();
  }
});
