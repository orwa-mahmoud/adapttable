/** Funnel on the column header — the same field the Filters panel draws. */
import { useHeaderFilterOverlay } from "@adapttable/react";
import {
  type FilterHeaderControlProps,
  filterLabel,
  hasActiveHeaderFilter,
} from "@adapttable/react/adapter";
import { IconButton, Paper, Popper } from "@mui/material";
import { useId, useRef } from "react";

import { FiltersIcon } from "../icons";
import { AutoFilterForm } from "./AutoFilterForm";

export function FilterHeaderTrigger<TRow>(
  props: Readonly<FilterHeaderControlProps<TRow>>
) {
  const active = hasActiveHeaderFilter(props);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const label = filterLabel(props.def);
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
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
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
        role="presentation"
        style={{ zIndex: 1300 }}
      >
        {/* A popup holding a form is a dialog; MUI's Popper would otherwise
            announce it as a tooltip, which may hold no controls. */}
        <Paper
          {...sessionProps}
          id={panelId}
          role="dialog"
          aria-label={label}
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
