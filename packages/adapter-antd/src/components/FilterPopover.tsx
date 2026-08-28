import type { Direction, TableLabels } from "@adapttable/core";
import { Button, Flex, Popover } from "antd";
import { type ReactNode, useEffect, useRef } from "react";

/** Props for {@link FilterPopover}. */
export interface FilterPopoverProps {
  /** Whether the overlay is showing. */
  open: boolean;
  /** Closes the overlay. Filters apply live, so this only dismisses it. */
  onClose: () => void;
  /** The filter fields to render inside. */
  filters: ReactNode;
  /** How many filters are currently set, for the header count. */
  activeFilterCount: number;
  /** Clears every active filter. */
  onClearFilters: () => void;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /**
   * Text direction. The card portals to the body, so it would otherwise keep
   * a left-to-right header and form. Also picks bottomLeft vs bottomRight.
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
  dir = "ltr",
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
      if (
        target instanceof Element &&
        target.closest(
          ".ant-popover, .ant-select-dropdown, .ant-picker-dropdown"
        )
      ) {
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
    <div
      dir={dir}
      style={{
        minWidth: 280,
        maxWidth: "min(380px, calc(100vw - 48px))",
        // The form grows while open; a card taller than the window paints its
        // lower fields off-screen, so it stops at the viewport edge instead.
        maxHeight: "min(70vh, 560px)",
        overflowY: "auto",
      }}
    >
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
      // Same corner as Columns / Saved views: the centred `bottom` placement
      // still flipped above the trigger even with adjustY off. Width is capped
      // to the viewport so a start-edge card does not need that slide. Arrow
      // off and a 4px offset match the other kits' gap under the button.
      placement={dir === "rtl" ? "bottomRight" : "bottomLeft"}
      arrow={false}
      autoAdjustOverflow={{ adjustX: 1, adjustY: 0 }}
      align={{ offset: [0, 4] }}
      content={content}
      styles={{ content: { padding: 12 } }}
    >
      <span ref={anchorRef}>{children}</span>
    </Popover>
  );
}
