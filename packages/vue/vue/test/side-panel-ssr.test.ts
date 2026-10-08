import { afterEach, expect, it, vi } from "vitest";
import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";

import { SIDE_PANEL_CONTROL, SIDE_PANEL_MODEL } from "../src/actions/contracts";
import { SidePanelChrome } from "../src/actions/sidePanelChrome";
import { extendFeature, resolveLabels, slotRender } from "../src/adapter";
import { sidePanel } from "../src/side-panel";
import { useDataTableShell } from "../src/useDataTableShell";

const stops: (() => void)[] = [];
afterEach(() => stops.splice(0).forEach((stop) => stop()));

it("hydrates the controlled server panel in place without admitting server requests", async () => {
  const requested = vi.fn();
  const serverCallbacks: (() => void)[] = [];
  const View = defineComponent(() => {
    const shell = useDataTableShell({
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      features: [
        extendFeature(
          sidePanel({
            panels: [
              { key: "details", label: "Details", content: "Controlled body" },
            ],
            open: "details",
            onOpenChange: requested,
          }),
          [slotRender(SIDE_PANEL_CONTROL, () => null)]
        ),
      ],
    });
    const model = shell.state.get(SIDE_PANEL_MODEL);
    return () => {
      const value = model.value;
      if (!value) throw new Error("Expected the side-panel model");
      serverCallbacks.push(() => value.onOpenChange(null));
      return h(SidePanelChrome, {
        model: value,
        labels: resolveLabels({}),
        dir: "ltr",
        presentation: (props) =>
          h("section", { "data-panel": "" }, [
            h("button", { onClick: props.onClose }, "Close"),
            typeof props.view.selected.content === "function"
              ? props.view.selected.content()
              : props.view.selected.content,
          ]),
      });
    };
  });
  const markup = await renderToString(createSSRApp(View));
  expect(markup).toContain("Controlled body");
  serverCallbacks.at(-1)!();
  expect(requested).not.toHaveBeenCalled();
  const host = document.createElement("div");
  host.innerHTML = markup;
  document.body.append(host);
  const panel = host.querySelector("[data-panel]");
  const button = host.querySelector("button");
  expect(panel).not.toBeNull();
  expect(button).not.toBeNull();
  const app = createSSRApp(View);
  app.mount(host);
  stops.push(() => {
    app.unmount();
    host.remove();
  });
  await nextTick();
  await nextTick();
  expect(host.querySelector("[data-panel]")).toBe(panel);
  expect(host.querySelector("button")).toBe(button);
  expect(requested).not.toHaveBeenCalled();
  button!.click();
  await nextTick();
  expect(requested).toHaveBeenCalledExactlyOnceWith(null);
});
