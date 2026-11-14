import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import type {
  FeatureSlotKey,
  RowActionControl,
  TableFeature,
} from "@adapttable/vue";
import {
  type DataTableClassNames,
  featureSlotFillsOf,
  renderFeatureSlot,
} from "@adapttable/vue/adapter";
import {
  rowActions as bindingRowActions,
  rowPinning as bindingRowPinning,
} from "@adapttable/vue/features";
import { expect, vi } from "vitest";
import { type App, type Component, createApp, h, isVNode, nextTick } from "vue";

/** The props a kit's native row-action control receives. */
interface RowActionsControlProps {
  readonly controls: readonly RowActionControl<unknown>[];
  readonly label: string;
  readonly dir?: "ltr" | "rtl";
  readonly classNames: DataTableClassNames;
}

/** A Vue kit as the shared row-action presentation suite drives it. */
export interface VueRowActionsKit {
  /** The kit's display name, as its errors name it. */
  readonly name: string;
  /** The kit's npm package. */
  readonly packageName: string;
  /** The kit's `DataTable`. */
  readonly DataTable: Component;
  /** The kit's `rowActions` factory. */
  readonly rowActions: typeof bindingRowActions;
  /** The kit's `rowPinning` factory. */
  readonly rowPinning: typeof bindingRowPinning;
  /** The slot the kit's native row-action control fills. */
  readonly controlKey: FeatureSlotKey<RowActionsControlProps>;
  /** The kit's native row-action component. */
  readonly RowActions: Component;
  /** Installs what the kit's components need on an app (a plugin). */
  readonly install?: (app: App) => void;
}

interface Row {
  id: string;
}

/**
 * The shared row-action presentation suite: a kit's native actions and
 * pinning share one control, and the binding-only factories fail loudly.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function lazyRowActionsTests(
  kit: VueRowActionsKit
): readonly ConformanceTest[] {
  return collectConformanceTests(({ describe, it, afterEach }) => {
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
          h(kit.DataTable, {
            data: [{ id: "one" }],
            columns: [{ key: "id" }],
            rowKey: (row: Row) => row.id,
            features,
            forceMobile,
            searchable: false,
            urlSync: false,
          }),
      });
      kit.install?.(app);
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
        const action = kit.rowActions<Row>([
          { key: "open", label: "Open", onClick: vi.fn() },
        ]);
        const pin = kit.rowPinning();
        expect(kit.controlKey.single).toBe(true);
        const props = {
          controls: [],
          label: "Row actions",
          classNames: {},
          dir: "rtl" as const,
        };
        for (const features of [
          [action],
          [pin],
          [action, pin],
          [pin, action],
        ]) {
          const fills = featureSlotFillsOf<Row>(features);
          const rendered = renderFeatureSlot(kit.controlKey, fills, props);
          expect(rendered).toHaveLength(1);
          const node = rendered[0];
          expect(isVNode(node)).toBe(true);
          if (!isVNode(node))
            throw new Error("Expected the native row-action component.");
          expect(node.type).toBe(kit.RowActions);
          expect(node.props?.controls).toBe(props.controls);
          expect(node.props?.label).toBe(props.label);
          expect(node.props?.classNames).toBe(props.classNames);
        }
      });

      for (const forceMobile of [false, true]) {
        it.each(["actions", "pinning"])(
          `rejects binding-only %s without native controls, mobile=${String(forceMobile)}`,
          async (feature) => {
            const contribution =
              feature === "actions"
                ? bindingRowActions<Row>([
                    { key: "open", label: "Open", onClick: vi.fn() },
                  ])
                : bindingRowPinning();
            const errors = await missingPresentation(
              [contribution],
              forceMobile
            );
            expect(errors.length).toBeGreaterThan(0);
            for (const error of errors) {
              expect(error).toBeInstanceOf(Error);
              expect(error instanceof Error ? error.message : error).toBe(
                `AdaptTable: ${kit.name} row actions require rowActions() or rowPinning() from ${kit.packageName}.`
              );
            }
          }
        );
      }
    });
  });
}
