import type { Direction, TableLabels } from "@adapttable/core";
import { Box, Button, Paper, Popper, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

/** Props for {@link FilterPopover}. */
export interface FilterPopoverProps {
  /** Whether the overlay is showing. */
  open: boolean;
  /** Closes the overlay. Filters apply live, so this only dismisses it. */
  onClose: () => void;
  /** The element the popover is anchored to (the Filters button). */
  anchorEl: HTMLElement | null;
  /** The filter fields to render inside. */
  filters: ReactNode;
  /** How many filters are currently set, for the header count. */
  activeFilterCount: number;
  /** Clears every active filter. */
  onClearFilters: () => void;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** Writing direction, so the overlay opens on the correct side. */
  dir?: Direction;
}

/**
 * Anchored filter card (the default filter container). Opens under the Filters
 * button. Built on a non-modal `Popper` (+ `ClickAwayListener`) rather than the
 * Modal-based `Popover`, so it renders NO backdrop/scrim — the background stays
 * visible and interactive. Closes on outside click or Escape. Placement is
 * `bottom-end` (flips to `bottom-start` for RTL). Pair with
 * `filtersMode="drawer"` for the slide-in panel instead.
 */
export function FilterPopover({
  open,
  onClose,
  anchorEl,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  dir = "ltr",
}: Readonly<FilterPopoverProps>) {
  const paperRef = useRef<HTMLDivElement>(null);
  // Escape must close the popover wherever focus sits (e.g. still on the
  // Filters trigger) — a keydown on the card alone misses that case.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (
        event.target instanceof Element &&
        event.target.closest('[role="listbox"], .MuiPopover-root')
      ) {
        return;
      }
      onClose();
      // Escape strands keyboard focus inside the removed card — hand it back
      // to the trigger (the anchor IS the Filters button).
      anchorEl?.focus();
    };
    const onOutsidePress = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (
        paperRef.current?.contains(target) ||
        anchorEl?.contains(target) ||
        (target instanceof Element &&
          target.closest('[role="listbox"], .MuiPopover-root'))
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onOutsidePress);
    document.addEventListener("touchstart", onOutsidePress);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onOutsidePress);
      document.removeEventListener("touchstart", onOutsidePress);
    };
  }, [open, onClose, anchorEl]);
  return (
    <Popper
      open={open && anchorEl !== null}
      anchorEl={anchorEl}
      placement={dir === "rtl" ? "bottom-start" : "bottom-end"}
      modifiers={[
        { name: "offset", options: { offset: [0, 4] } },
        { name: "flip", enabled: false },
        { name: "preventOverflow", options: { padding: 8, mainAxis: false } },
      ]}
      style={{ zIndex: 10050 }}
    >
      <Paper
        ref={paperRef}
        elevation={8}
        dir={dir}
        sx={{
          width: 380,
          maxWidth: "calc(100vw - 32px)",
          // The form grows while open, and with enough filters it outgrows
          // the window. Pinned below the trigger it has to stop at the
          // viewport edge, or its lower fields are painted off-screen and
          // cannot be reached.
          maxHeight: anchorEl
            ? Math.max(
                120,
                Math.min(
                  560,
                  window.innerHeight -
                    anchorEl.getBoundingClientRect().bottom -
                    8
                )
              )
            : "min(calc(50dvh - 16px), 560px)",
          overflowY: "auto",
          borderRadius: 2,
        }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {labels.filters}
            </Typography>
            <Button
              size="small"
              onClick={onClearFilters}
              disabled={activeFilterCount === 0}
            >
              {labels.clearAll}
            </Button>
          </Stack>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {filters}
          </Box>
        </Box>
      </Paper>
    </Popper>
  );
}
