import { describe, expect, it } from "vitest";
import { createApp, h } from "vue";
import { createVuetify } from "vuetify";

import { columnLayoutFamily } from "../src/column-layout";
import { editingFamily } from "../src/editing";
import { filteringFamily } from "../src/filtering";
import { checklistFilterWidget } from "../src/filters/widgets";

describe("feature families", () => {
  it("publishes filtering, column layout and editing from their entries", () => {
    expect(filteringFamily([]).map((feature) => feature.id)).toEqual([
      "filters",
      "header-filters",
    ]);
    expect(columnLayoutFamily().map((feature) => feature.id)).toEqual([
      "column-menu",
      "resizable-columns",
      "fit-columns",
    ]);
    expect(editingFamily(() => undefined).map((feature) => feature.id)).toEqual(
      ["editing", "dirty-indicators", "edit-history", "undo-redo-buttons"]
    );
  });

  it("draws a checklist field", () => {
    const host = document.createElement("div");
    document.body.append(host);
    const app = createApp({
      setup: () => () =>
        h(checklistFilterWidget.render as never, {
          def: {
            key: "team",
            type: "checklist",
            label: "Team",
            options: [{ value: "a", label: "A" }],
          },
          source: {
            getValue: () => undefined,
            setValue: () => undefined,
            filters: {},
            extra: {},
          },
          labels: {},
        }),
    }).use(createVuetify({ ssr: true }));
    app.mount(host);
    expect(
      host.querySelector('[data-adapttable-part="filter-field"]')
    ).not.toBeNull();
    app.unmount();
    host.remove();
  });
});
