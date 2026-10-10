import type { TableFeature } from "@adapttable/vue";
import { featureSlotFillsOf, renderFeatureSlot } from "@adapttable/vue/adapter";
import {
  rowActions as bindingRowActions,
  rowPinning as bindingRowPinning,
} from "@adapttable/vue/features";
import { Quasar } from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, isVNode, nextTick } from "vue";

import DataTable from "../src/DataTable.vue";
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
import {
  ROW_ACTIONS_CONTROL,
  rowActionsControlKey,
} from "../src/rowActionsSlot";
import QuasarRowActions from "../src/table/QuasarRowActions.vue";

interface Row {
  id: string;
}
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));

async function missingPresentation(
  features: readonly TableFeature<Row>[],
  forceMobile: boolean
) {
  const errors: unknown[] = [];
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: [{ id: "one" }],
        columns: [{ key: "id" }],
        rowKey: (row) => row.id,
        features,
        forceMobile,
        searchable: false,
        urlSync: false,
      }),
  });
  app.use(Quasar, { config: {} });
  app.config.errorHandler = (error) => {
    errors.push(error);
  };
  cleanup.push(() => {
    app.unmount();
    host.remove();
  });
  app.mount(host);
  await nextTick();
  await nextTick();
  return errors;
}

describe("optional native row-action presentation", () => {
  it("shares one native slot across actions, pinning and either composition order", () => {
    const action = rowActions<Row>([
      { key: "open", label: "Open", onClick: vi.fn() },
    ]);
    const pin = rowPinning();
    expect(ROW_ACTIONS_CONTROL.single).toBe(true);
    const props = {
      controls: [],
      label: "Row actions",
      classNames: {},
      dir: "rtl" as const,
    };
    for (const features of [[action], [pin], [action, pin], [pin, action]]) {
      const fills = featureSlotFillsOf<Row>(features);
      const rendered = renderFeatureSlot(
        rowActionsControlKey<Row>(),
        fills,
        props
      );
      expect(rendered).toHaveLength(1);
      const node = rendered[0];
      expect(isVNode(node)).toBe(true);
      if (!isVNode(node))
        throw new Error("Expected the native row-action component.");
      expect(node.type).toBe(QuasarRowActions);
      expect(node.props?.controls).toBe(props.controls);
      expect(node.props?.label).toBe(props.label);
      expect(node.props?.classNames).toBe(props.classNames);
    }
  });

  for (const forceMobile of [false, true]) {
    it.each(["actions", "pinning"])(
      `rejects binding-only %s without native controls, mobile=${forceMobile}`,
      async (feature) => {
        const contribution =
          feature === "actions"
            ? bindingRowActions<Row>([
                { key: "open", label: "Open", onClick: vi.fn() },
              ])
            : bindingRowPinning();
        const errors = await missingPresentation([contribution], forceMobile);
        expect(errors.length).toBeGreaterThan(0);
        for (const error of errors) {
          expect(error).toBeInstanceOf(Error);
          expect(error instanceof Error ? error.message : error).toBe(
            "AdaptTable: Quasar row actions require rowActions() or rowPinning() from @adapttable/quasar."
          );
        }
      }
    );
  }
});
