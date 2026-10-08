import {
  managedOverlayPanel,
  type ManagedOverlayPanelProps,
  type OverlayCloseReason,
  useScopeActivity,
} from "@adapttable/vue/adapter";
import { defineComponent, h, nextTick } from "vue";

import { Popover, PopoverAnchor, PopoverContent } from "../components/popover";
import { shadcnControlAttrs } from "../controls";
import { cn } from "../lib/utils";

const ManagedPanel = defineComponent(
  (props: {
    readonly control: ManagedOverlayPanelProps;
    readonly requestClose: (reason: OverlayCloseReason) => void;
  }) =>
    () =>
      h(Popover, { open: props.control.open }, () => [
        h(
          PopoverAnchor,
          { reference: props.control.anchor ?? undefined, asChild: true },
          () => h("span", { hidden: true, "aria-hidden": true })
        ),
        h(
          PopoverContent,
          {
            ...shadcnControlAttrs(props.control.attrs),
            class: cn(
              "adapttable-shadcn-vue w-96 max-w-[calc(100vw-2rem)] max-h-[min(80vh,40rem)] overflow-y-auto",
              props.control.attrs.class as string | undefined
            ),
            align: "end",
            portalTo: props.control.container,
            onEscapeKeyDown: (event: KeyboardEvent) => {
              event.preventDefault();
              props.requestClose("escape");
            },
            onInteractOutside: (
              event: CustomEvent<{ originalEvent: Event }>
            ) => {
              event.preventDefault();
              const target = event.detail.originalEvent.target;
              if (!(
                target instanceof Node && props.control.anchor?.contains(target)
              ))
                props.requestClose("outside");
            },
            onCloseAutoFocus: (event: Event) => event.preventDefault(),
          },
          () => props.control.content
        ),
      ]),
  { name: "ShadcnManagedPanel", props: ["control", "requestClose"] }
);

/** The persistent menu owner outlives the portaled panel during its close phase. */
export function useManagedPanel() {
  const active = useScopeActivity();
  return managedOverlayPanel((control) =>
    h(ManagedPanel, {
      control,
      requestClose: (reason) => {
        if (!active.value || !control.isCurrent()) return;
        const anchor = control.anchor;
        control.onClose(reason);
        if (reason === "outside") return;
        void nextTick(() => {
          if (
            active.value &&
            control.isCurrent() &&
            anchor?.isConnected &&
            !anchor.closest('[hidden], [inert], [aria-hidden="true"]') &&
            anchor.getClientRects().length > 0
          )
            anchor.focus();
        });
      },
    })
  );
}
