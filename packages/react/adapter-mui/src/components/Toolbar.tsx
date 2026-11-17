/** The toolbar, drawn by the binding with MUI's controls. */
import {
  createToolbar,
  type KitFiltersButtonProps,
  type KitRowsPerPageProps,
  type KitToolbarFrameProps,
  type KitToolbarSearchProps,
  type KitToolbarSortProps,
} from "@adapttable/react/adapter";
import {
  Badge,
  Button as MuiButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";

import { FiltersIcon } from "../icons";
import { Button } from "./primitives";

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

const ROW = {
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
} as const;
const CONTROLS = { alignItems: "center", flexWrap: "wrap" } as const;

/** Search on one side, the controls on the other, wrapping when narrow. */
function Frame({ start, search, controls }: Readonly<KitToolbarFrameProps>) {
  "use no memo";
  return (
    <Stack direction="row" spacing={1} useFlexGap sx={ROW}>
      {start}
      {search}
      <Stack direction="row" spacing={1} useFlexGap sx={CONTROLS}>
        {controls}
      </Stack>
    </Stack>
  );
}

const SEARCH_WIDTH = { flex: 1, minWidth: 160, maxWidth: 360 } as const;

function Search({ input }: Readonly<KitToolbarSearchProps>) {
  "use no memo";
  return (
    <TextField
      data-adapttable-part="search-field"
      size="small"
      value={input.value}
      placeholder={input.placeholder}
      slotProps={{
        htmlInput: {
          "aria-label": input["aria-label"],
          type: "search",
          "data-adapttable-part": "search",
        },
        input: {
          startAdornment: (
            <InputAdornment position="start" data-adapttable-part="search-icon">
              <SearchIcon />
            </InputAdornment>
          ),
        },
      }}
      onChange={input.onChange}
      sx={SEARCH_WIDTH}
    />
  );
}

function SortSelect({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitToolbarSortProps>) {
  "use no memo";
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onValueChange(event.target.value || undefined)}
      sx={{ minWidth: 160 }}
    >
      <MenuItem value="">—</MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** The filters button, with the active count as MUI's badge. */
function FiltersButton({
  elementRef,
  label,
  count,
  expanded,
  open,
  onPointerDown,
  onClick,
}: Readonly<KitFiltersButtonProps>) {
  "use no memo";
  return (
    <Badge color="primary" badgeContent={count}>
      <MuiButton
        ref={elementRef}
        variant="outlined"
        size="small"
        startIcon={<FiltersIcon />}
        aria-expanded={expanded}
        data-adapttable-part="filters-button"
        data-active={open || undefined}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {label}
      </MuiButton>
    </Badge>
  );
}

function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
      sx={{ minWidth: 132 }}
    >
      {options.map((size) => (
        <MenuItem key={size} value={size}>
          {size}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** The toolbar: search, sort, filters, menus, extras and page size. */
export const Toolbar = /* @__PURE__ */ createToolbar({
  Frame,
  Search,
  SortSelect,
  Button,
  FiltersButton,
  filtersPopover: "anchor",
  RowsPerPage,
});
