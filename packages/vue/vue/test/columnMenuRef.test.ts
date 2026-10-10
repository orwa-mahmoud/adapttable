import { afterEach, expect, it } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { resolveLabels } from "../src/adapter";
import type { Attrs, ElementRef } from "../src/attrs";
import { useColumnLayout } from "../src/columns/columnLayout";
import {
  ColumnMenuChrome,
  type ColumnMenuSlots,
} from "../src/columns/columnMenuChrome";
import { useColumnMenu } from "../src/columns/useColumnMenu";
import { managedOverlayPanel } from "../src/overlayPanel";
import { useElementRef } from "../src/useElementRef";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
function isOwner(value: unknown): value is ElementRef<HTMLElement> {
  return typeof value === "function";
}
function owner(attrs: Attrs): ElementRef<HTMLElement> | undefined {
  return isOwner(attrs.ref) ? attrs.ref : undefined;
}
// A setup-owned control reproduces kit callback reconciliation without any kit dependency.
const RefTarget = defineComponent(
  (props: { attrs: Attrs; as: string; label: string }) => {
    const target = shallowRef<HTMLElement | null>(null);
    useElementRef(
      () => target.value,
      () => owner(props.attrs)
    );
    return () => {
      const attrs = { ...props.attrs };
      delete attrs.ref;
      return h(props.as, { ...attrs, ref: target }, props.label);
    };
  },
  { props: ["attrs", "as", "label"] }
);

it("keeps managed column-menu target callbacks stable while its anchor is rendered", async () => {
  const triggerOwners: unknown[] = [];
  const panelOwners: unknown[] = [];
  const anchors: (HTMLElement | null)[] = [];
  const controls: ColumnMenuSlots = {
    Trigger: ({ attrs, label }) => {
      triggerOwners.push(attrs.ref);
      return h(RefTarget, { attrs, as: "button", label });
    },
    Button: ({ attrs, label }) => h("button", attrs, label),
    Input: ({ attrs, value }) => h("input", { ...attrs, value }),
    Choice: ({ attrs }) => h("select", attrs),
    Panel: managedOverlayPanel(({ attrs, anchor, content }) => {
      panelOwners.push(attrs.ref);
      anchors.push(anchor);
      return h("section", [
        h(RefTarget, { attrs, as: "div", label: "Panel" }),
        content,
      ]);
    }),
  };
  const Host = defineComponent({
    setup() {
      const columns = [{ key: "name" }];
      const layout = useColumnLayout(columns, {});
      const model = useColumnMenu(() => ({
        allColumns: columns,
        layout: layout.value,
        labels: resolveLabels({}),
        onAutoSize: () => undefined,
      }));
      return () => h(ColumnMenuChrome, { model, slots: controls });
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp(Host);
  app.mount(host);
  stops.push(() => {
    app.unmount();
    host.remove();
  });
  await nextTick();
  const trigger = host.querySelector("button");
  expect(trigger).toBeInstanceOf(HTMLButtonElement);
  trigger?.click();
  await nextTick();
  expect(new Set(triggerOwners).size).toBe(1);
  expect(new Set(panelOwners).size).toBe(1);
  expect(anchors.length).toBeGreaterThan(0);
  expect(anchors.every((anchor) => anchor === trigger)).toBe(true);
  expect(
    host.querySelector('[data-adapttable-part="column-menu-panel"]')
  ).not.toBeNull();
  trigger?.click();
  await nextTick();
  expect(
    host.querySelector('[data-adapttable-part="column-menu-panel"]')
  ).toBeNull();
  trigger?.click();
  await nextTick();
  expect(new Set(triggerOwners).size).toBe(1);
  expect(new Set(panelOwners).size).toBe(1);
  expect(anchors.every((anchor) => anchor === trigger)).toBe(true);
  expect(
    host.querySelector('[data-adapttable-part="column-menu-panel"]')
  ).not.toBeNull();
});
