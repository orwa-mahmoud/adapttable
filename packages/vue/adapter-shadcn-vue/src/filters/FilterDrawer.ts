import type {
  DataTableClassNames,
  FilterPanelSurfaceProps,
} from "@adapttable/vue/adapter";
import { defineComponent, h } from "vue";

import { Sheet, SheetContent, SheetTitle } from "../components/sheet";
import { cn } from "../lib/utils";

interface DrawerProps extends FilterPanelSurfaceProps {
  readonly classNames: DataTableClassNames;
  readonly closeLabel: string;
  readonly onCloseAutoFocus?: (event: Event) => void;
}

/** The copied Sheet owns modality, focus trapping, portaling, and its backdrop. */
export const FilterDrawer = defineComponent(
  (props: DrawerProps) => {
    const escape = (event: KeyboardEvent) => {
      event.preventDefault();
      props.onClose("escape");
    };
    const outside = (event: CustomEvent<{ originalEvent: PointerEvent }>) => {
      const original = event.detail.originalEvent;
      // Match the Sheet primitive's native context-menu dismissal policy.
      if (original.button === 2 || (original.button === 0 && original.ctrlKey))
        return;
      event.preventDefault();
      props.onClose("outside");
    };
    const content = () => [
      h(SheetTitle, { class: "sr-only" }, () => props.label),
      props.children,
    ];
    return () =>
      h(Sheet, { open: props.open }, () =>
        h(
          SheetContent,
          {
            showClose: false,
            closeLabel: props.closeLabel,
            side: props.dir === "rtl" ? "left" : "right",
            dir: props.dir,
            portalTo: props.container ?? undefined,
            class: cn(
              "w-full max-w-full overflow-y-auto p-4 sm:max-w-md",
              props.classNames.filtersDrawer,
              props.className
            ),
            overlayClass: props.classNames.filtersBackdrop,
            overlayPart: "filters-backdrop",
            "data-adapttable-part": "filters-panel",
            "aria-describedby": undefined,
            onEscapeKeyDown: escape,
            onPointerDownOutside: outside,
            onCloseAutoFocus: (event: Event) => {
              event.preventDefault();
              props.onCloseAutoFocus?.(event);
            },
          },
          content
        )
      );
  },
  {
    name: "ShadcnFilterDrawer",
    props: [
      "className",
      "classNames",
      "closeLabel",
      "open",
      "label",
      "dir",
      "anchor",
      "container",
      "children",
      "onClose",
      "onCloseAutoFocus",
    ],
  }
);
