import type { SidePanelPresentationProps } from "@adapttable/vue/adapter";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { h } from "vue";

import { rekaButton } from "../controls/basic";

/** Compound Tabs owns tab focus/IDs; the binding approves every selection request. */
export function rekaSidePanel(props: SidePanelPresentationProps) {
  const { view, classNames: names = {} } = props;
  const close = () =>
    rekaButton(
      {
        "aria-label": view.closeLabel,
        "data-adapttable-part": "side-panel-close",
        class: names.sidePanelClose,
        onClick: props.onClose,
      },
      "×"
    );
  const body = () =>
    typeof view.selected.content === "function"
      ? view.selected.content()
      : view.selected.content;
  const frame = (children: () => ReturnType<typeof h>[]) =>
    h(
      "aside",
      {
        dir: props.dir,
        class: ["at-reka-side-panel", names.sidePanel],
        "data-adapttable-part": "side-panel",
        "data-side": props.side,
        onKeydown: props.onBodyKeyDown,
      },
      children()
    );
  if (!view.tabbed)
    return frame(() => [
      h(
        "header",
        {
          class: ["at-reka-side-panel-header", names.sidePanelHeader],
          "data-adapttable-part": "side-panel-header",
        },
        [h("strong", view.selected.label), close()]
      ),
      h(
        "section",
        {
          "aria-label": view.bodyLabel,
          class: names.sidePanelBody,
          "data-adapttable-part": "side-panel-body",
        },
        [body()]
      ),
    ]);
  const tabs = () =>
    view.tabs.map((tab) =>
      h(
        TabsTrigger,
        {
          key: tab.key,
          value: tab.key,
          class: ["at-reka-tab", names.sidePanelTab],
          "data-adapttable-part": "side-panel-tab",
        },
        { default: () => tab.panel.label }
      )
    );
  const tabBody = (tab: (typeof view.tabs)[number]) =>
    h(
      TabsContent,
      {
        key: tab.key,
        value: tab.key,
        class: names.sidePanelBody,
        "data-adapttable-part": "side-panel-body",
      },
      {
        default: () =>
          typeof tab.panel.content === "function"
            ? tab.panel.content()
            : tab.panel.content,
      }
    );
  const content = () => [
    h(
      "header",
      {
        class: ["at-reka-side-panel-header", names.sidePanelHeader],
        "data-adapttable-part": "side-panel-header",
      },
      [
        h(
          TabsList,
          {
            "aria-label": view.tablistLabel,
            class: names.sidePanelTabs,
            "data-adapttable-part": "side-panel-tabs",
          },
          { default: tabs }
        ),
        close(),
      ]
    ),
    ...view.tabs.map(tabBody),
  ];
  return h(
    TabsRoot,
    {
      asChild: true,
      modelValue: view.selected.key,
      dir: props.dir,
      "onUpdate:modelValue": (value: string | number) =>
        props.onSelect(String(value)),
    },
    { default: () => frame(content) }
  );
}
