import type { SidePanelPresentationProps } from "@adapttable/vue/adapter";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/vue";
import { h } from "vue";

import { headlessButton } from "../controls/basic";

/** Headless UI Tabs own tab focus and IDs; the binding approves every selection request. */
export function headlessSidePanel(props: SidePanelPresentationProps) {
  const { view, classNames: names = {} } = props;
  const close = () =>
    headlessButton(
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
        class: ["at-headless-side-panel", names.sidePanel],
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
          class: ["at-headless-side-panel-header", names.sidePanelHeader],
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
        Tab,
        {
          key: tab.key,
          class: ["at-headless-tab", names.sidePanelTab],
          "data-adapttable-part": "side-panel-tab",
        },
        { default: () => tab.panel.label }
      )
    );
  const tabBody = (tab: (typeof view.tabs)[number]) =>
    h(
      TabPanel,
      {
        key: tab.key,
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
        class: ["at-headless-side-panel-header", names.sidePanelHeader],
        "data-adapttable-part": "side-panel-header",
      },
      [
        h(
          TabList,
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
    h(TabPanels, { as: "template" }, { default: () => view.tabs.map(tabBody) }),
  ];
  return h(
    TabGroup,
    {
      as: "template",
      selectedIndex: view.tabs.findIndex(
        (tab) => tab.key === view.selected.key
      ),
      onChange: (index: number) => {
        const tab = view.tabs[index];
        if (tab) props.onSelect(tab.key);
      },
    },
    { default: () => frame(content) }
  );
}
