import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Flex, Popover } from "antd";
import { type ReactNode, useEffect, useRef } from "react";

/** Props for {@link FilterPopover}. */
export interface FilterPopoverProps {
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters: () => void;
  labels: Required<TableLabels>;
  /**
   * Accepted for a consistent adapter surface; the card centres under its
   * trigger, so it needs no direction-specific placement.
   */
  dir?: Direction;
  /** The Filters trigger button — becomes the popover anchor. */
  children: ReactNode;
}

/**
 * Anchored filter card (the default filter container). A controlled antd
 * `Popover` anchored to the Filters button — no scrim, so the background stays
 * visible and interactive. Clicking outside the popover (and its trigger) or
 * pressing Escape closes it. Pair with `filtersMode="drawer"` for the slide-in
 * panel instead.
 */
export function FilterPopover({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  children,
}: Readonly<FilterPopoverProps>) {
  const anchorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node | null;
      // Ignore clicks on the trigger (the toggle handles those) and inside the
      // floating popover content, which antd portals under `.ant-popover`.
      if (target && anchorRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest(".ant-popover")) {
        return;
      }
      onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      // Escape strands keyboard focus inside the removed card — hand it back
      // to the trigger inside the anchor.
      anchorRef.current?.querySelector("button")?.focus();
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  const content = (
    // The card must never claim the whole screen: antd adds its own padding
    // around this content, so leave room for it plus a gutter on both sides.
    <div style={{ minWidth: 280, maxWidth: "min(360px, calc(100vw - 48px))" }}>
      <Flex align="center" justify="space-between" gap="small">
        <span style={{ fontWeight: 600, fontSize: 14 }}>{labels.filters}</span>
        <Button
          size="small"
          type="link"
          disabled={activeFilterCount === 0}
          onClick={onClearFilters}
        >
          {labels.clearAll}
        </Button>
      </Flex>
      <div style={{ marginTop: 8 }}>{filters}</div>
    </div>
  );

  return (
    <Popover
      open={open}
      trigger={[]}
      // `bottom` (not the bottomLeft/bottomRight corners): antd only grants a
      // horizontal shift to the edge-centred placements, so a corner placement
      // can only flip — which cannot rescue a card wider than the space beside
      // the trigger, and left it ~80px off-screen on a phone. Centring under
      // the trigger keeps antd's own shift-into-view behaviour, and needs no
      // RTL variant because it is direction-agnostic.
      placement="bottom"
      content={content}
      styles={{ content: { padding: 12 } }}
    >
      <span ref={anchorRef}>{children}</span>
    </Popover>
  );
}
