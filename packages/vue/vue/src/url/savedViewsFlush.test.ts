import { slotRender } from "@adapttable/core/binding";
import { expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { savedViews } from "../features/savedViews";
import { type ComposedFeature, extendFeature } from "../features/tableFeature";
import { useDataTableShell } from "../useDataTableShell";
import { SAVED_VIEWS_CONTROL } from "../viewControls/contracts";
import type {
  UseSavedViewsOptions,
  UseSavedViewsResult,
} from "./useSavedViews";

function viewsFeature(options: UseSavedViewsOptions) {
  return extendFeature(savedViews(options), [
    slotRender(SAVED_VIEWS_CONTROL, () => null),
  ]);
}

it("uses one guarded shell-and-host flush chain for feature captures and apply", () => {
  const order: string[] = [];
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      data: [{ id: "one" }],
      columns: [{ key: "id" }],
      rowKey: (row) => row.id,
      urlSync: false,
      features: [
        {
          id: "test-flusher",
          mount(context) {
            context.registerViewStateFlush(() => {
              order.push("shell");
              retained?.save("Reentrant");
            });
          },
        },
        viewsFeature({
          storageKey: "views",
          storage: null,
          flushViewState: () => {
            order.push("host");
          },
        }),
      ],
    })
  );
  const retained: UseSavedViewsResult | undefined = shell?.savedViews.value;
  expect(retained).toBeDefined();
  retained?.save("One");
  expect(order).toEqual(["shell", "host"]);
  expect(retained?.views.value.map((view) => view.name)).toEqual(["One"]);
  retained?.apply("One");
  expect(order).toEqual(["shell", "host", "shell", "host"]);
  scope.stop();
  retained?.save("Retained");
  retained?.apply("One");
  expect(order).toHaveLength(4);
});

it("does not invoke a host flusher or capture after shell flushing removes the feature", () => {
  const hostFlush = vi.fn();
  const features = shallowRef<readonly ComposedFeature<{ id: string }>[]>([
    {
      id: "test-flusher",
      mount(context) {
        context.registerViewStateFlush(() => {
          features.value = [];
        });
      },
    },
    viewsFeature({
      storageKey: "views",
      storage: null,
      flushViewState: hostFlush,
    }),
  ]);
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      data: [{ id: "one" }],
      columns: [{ key: "id" }],
      rowKey: (row) => row.id,
      urlSync: false,
      features,
    })
  );
  const retained = shell?.savedViews.value;
  retained?.save("Removed");
  expect(hostFlush).not.toHaveBeenCalled();
  expect(retained?.views.value).toEqual([]);
  expect(shell?.savedViews.value).toBeUndefined();
  scope.stop();
});
