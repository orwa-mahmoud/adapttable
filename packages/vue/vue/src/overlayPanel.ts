import type { VNodeChild } from "vue";

import type { Attrs } from "./attrs";

export type OverlayCloseReason = "escape" | "outside" | "done";

/** Existing inline panel slots remain valid; managed fields are additive. */
export interface OverlayPanelProps {
  readonly attrs: Attrs;
  readonly content: VNodeChild;
  readonly container?: HTMLElement;
  readonly onClose: (reason?: OverlayCloseReason) => void;
  readonly anchor?: HTMLElement | null;
  readonly open?: boolean;
  readonly isCurrent?: () => boolean;
}

export interface ManagedOverlayPanelProps extends OverlayPanelProps {
  readonly anchor: HTMLElement | null;
  readonly open: boolean;
  /** False after a source/driver replacement, reopen, deactivation or disposal. */
  readonly isCurrent: () => boolean;
}

export interface OverlayPanelSlot {
  (props: OverlayPanelProps): VNodeChild;
  readonly interactionOwner?: "kit";
}

/**
 * Opt in with a required renderer that owns positioning, portal, dismissal and
 * focus. Chrome retains the open state and rejects stale close requests.
 */
export function managedOverlayPanel(
  render: (props: ManagedOverlayPanelProps) => VNodeChild
): OverlayPanelSlot {
  return Object.assign(
    (props: OverlayPanelProps) => {
      if (props.open === undefined || !props.isCurrent)
        throw new Error(
          "AdaptTable: a managed overlay requires its Chrome lifetime contract."
        );
      return render({
        ...props,
        anchor: props.anchor ?? null,
        open: props.open,
        isCurrent: props.isCurrent,
      });
    },
    { interactionOwner: "kit" as const }
  );
}

export function isManagedOverlayPanel(slot: OverlayPanelSlot): boolean {
  return typeof slot === "function" && slot.interactionOwner === "kit";
}
