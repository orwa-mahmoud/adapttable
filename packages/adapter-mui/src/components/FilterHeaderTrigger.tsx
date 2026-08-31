/** Funnel on the column header — the same field the Filters panel draws. */
import { filterLabel, useHeaderFilterOverlay } from "@adapttable/core";
import {
  type FilterHeaderControlProps,
  hasActiveHeaderFilter,
} from "@adapttable/core/adapter";
import { IconButton, Paper, Popper } from "@mui/material";
import { useRef } from "react";

import { FiltersIcon } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";

export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const active = hasActiveHeaderFilter(props);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { open, setOpen, source, sessionProps } = useHeaderFilterOverlay(
    props,
    {
      nestedSelector: "[role='listbox'],.MuiMenu-root,.MuiPopover-root",
    }
  );
  return (
    <>
      <IconButton
        {...sessionProps}
        ref={triggerRef}
        size="small"
        aria-label={filterLabel(props.def)}
        data-adapttable-part="filter-header-trigger"
        data-active={active ? "" : undefined}
        onClick={() => setOpen(!open)}
      >
        <FiltersIcon size={14} />
      </IconButton>
      <Popper
        open={open}
        anchorEl={triggerRef.current}
        placement="bottom-start"
        style={{ zIndex: 1300 }}
      >
        <Paper
          {...sessionProps}
          elevation={8}
          data-adapttable-part="filter-header-cell"
          sx={{ minWidth: "20rem", p: 1 }}
        >
          <AutoFilterForm
            defs={[props.def]}
            source={source}
            labels={props.labels}
            registry={props.registry}
          />
        </Paper>
      </Popper>
    </>
  );
}
