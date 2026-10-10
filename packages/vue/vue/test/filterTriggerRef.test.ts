import {
  ACTIVE_FILTER_CHIPS,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
import { afterEach, expect, it } from "vitest";
import { effectScope, shallowRef } from "vue";

import { resolveLabels } from "../src/adapter";
import {
  type ComposedFeature,
  extendFeature,
} from "../src/features/tableFeature";
import { filters, filterViewKey } from "../src/filters";
import { useHeaderFilter } from "../src/filters/headerFilterChrome";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  name: string;
}
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture");
  return value;
}
function fixture() {
  const scope = effectScope();
  stops.push(() => scope.stop());
  const feature = () =>
    extendFeature(filters<Row>([{ key: "name", type: "text" }]), [
      slotRender(TOOLBAR_EXTRAS, () => null),
      slotRender(ACTIVE_FILTER_CHIPS, () => null),
    ]);
  const features = shallowRef<readonly ComposedFeature<Row>[]>([feature()]);
  const shell = required(
    scope.run(() =>
      useDataTableShell({
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row: Row) => row.id,
        urlSync: false,
        features,
      })
    )
  );
  return { scope, shell, features, feature };
}
it("keeps the filter trigger owner stable across anchor/model changes and retires old feature owners", () => {
  const { scope, shell, features, feature } = fixture();
  const model = () => required(shell.state.get(filterViewKey<Row>()).value);
  const triggerRef = model().trigger.triggerRef;
  const anchor = document.createElement("button");
  triggerRef(anchor);
  expect(model().anchor).toBe(anchor);
  expect(model().trigger.triggerRef).toBe(triggerRef);
  model().trigger.onClick();
  expect(model().open).toBe(true);
  expect(model().trigger.triggerRef).toBe(triggerRef);
  triggerRef(null);
  expect(model().anchor).toBeNull();
  expect(model().trigger.triggerRef).toBe(triggerRef);
  features.value = [];
  features.value = [feature()];
  const replacementRef = model().trigger.triggerRef;
  expect(replacementRef).not.toBe(triggerRef);
  const replacement = document.createElement("button");
  replacementRef(replacement);
  triggerRef(anchor);
  expect(model().anchor).toBe(replacement);
  scope.stop();
  replacementRef(anchor);
  expect(shell.state.get(filterViewKey<Row>()).value).toBeUndefined();
});
it("keeps the header trigger owner stable across anchor/open changes and ignores disposal", () => {
  const { scope, shell } = fixture();
  const model = required(
    scope.run(() =>
      useHeaderFilter({
        id: "header-name",
        def: { key: "name", type: "text" },
        source: shell.source.value,
        labels: resolveLabels({}),
      })
    )
  );
  const triggerRef = model.value.trigger.triggerRef;
  const anchor = document.createElement("button");
  triggerRef(anchor);
  expect(model.value.anchor).toBe(anchor);
  expect(model.value.trigger.triggerRef).toBe(triggerRef);
  model.value.trigger.onClick();
  expect(model.value.open).toBe(true);
  expect(model.value.trigger.triggerRef).toBe(triggerRef);
  scope.stop();
  triggerRef(anchor);
  expect(model.value.anchor).toBeNull();
});

it("keeps separate filter instances independent through release, reacquisition and disposal", () => {
  const first = fixture();
  const second = fixture();
  const firstModel = () =>
    required(first.shell.state.get(filterViewKey<Row>()).value);
  const secondModel = () =>
    required(second.shell.state.get(filterViewKey<Row>()).value);
  const firstRef = firstModel().trigger.triggerRef;
  const secondRef = secondModel().trigger.triggerRef;
  expect(firstRef).not.toBe(secondRef);
  const firstTarget = document.createElement("button");
  const secondTarget = document.createElement("button");
  firstRef(firstTarget);
  secondRef(secondTarget);
  firstRef(null);
  expect(firstModel().anchor).toBeNull();
  expect(secondModel().anchor).toBe(secondTarget);
  firstRef(firstTarget);
  expect(firstModel().trigger.triggerRef).toBe(firstRef);
  first.scope.stop();
  firstRef(secondTarget);
  expect(secondModel().anchor).toBe(secondTarget);
  secondRef(null);
  secondRef(secondTarget);
  expect(secondModel().trigger.triggerRef).toBe(secondRef);
  expect(secondModel().anchor).toBe(secondTarget);
});
