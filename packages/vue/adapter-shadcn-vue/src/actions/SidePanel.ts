import type { SidePanelPresentationProps } from "@adapttable/vue/adapter";
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { h } from "vue";

import { shadcnActionButton } from "./controls";

/** Compound Tabs owns tab focus/IDs; the binding approves every selection request. */
export function shadcnSidePanel(props: SidePanelPresentationProps) {
  const { view, classNames: names = {} } = props;
  const close = () =>
    shadcnActionButton(
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
        class: [
          "flex w-full min-w-0 flex-col gap-4 border-t bg-card md:border-t-0 data-[side=end]:md:border-s data-[side=start]:md:border-e p-4 text-card-foreground md:w-80 md:shrink-0",
          names.sidePanel,
        ],
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
          class: [
            "flex items-center justify-between gap-2",
            names.sidePanelHeader,
          ],
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
          "data-slot": "tabs-trigger",
          class: [
            "inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:min-h-8",
            names.sidePanelTab,
          ],
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
        class: [
          "flex items-center justify-between gap-2",
          names.sidePanelHeader,
        ],
        "data-adapttable-part": "side-panel-header",
      },
      [
        h(
          TabsList,
          {
            "aria-label": view.tablistLabel,
            class: [
              "inline-flex flex-wrap items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
              names.sidePanelTabs,
            ],
            "data-slot": "tabs-list",
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
