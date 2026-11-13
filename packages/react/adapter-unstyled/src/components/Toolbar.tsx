/** The toolbar, laid out by the binding and drawn with native controls. */
import {
  createToolbar,
  type KitButtonProps,
  type KitFiltersButtonProps,
  type KitRowsPerPageProps,
  type KitToolbarFrameProps,
  type KitToolbarSearchProps,
  type KitToolbarSortProps,
} from "@adapttable/react/adapter";
import { type CSSProperties, forwardRef } from "react";

import { useClassNames, useClassOfPart } from "./classNamesContext";
import { FiltersIcon, SearchIcon } from "./icons";
import { Button as NativeButton } from "./kitPrimitives";

/** The regions in order; the toolbar element itself is the table's. */
function Frame({ start, search, controls }: Readonly<KitToolbarFrameProps>) {
  "use no memo";
  return (
    <>
      {start}
      {search}
      {controls}
    </>
  );
}

const SEARCH_FIELD: CSSProperties = {
  flex: "1 1 200px",
  minWidth: "min(200px, 100%)",
  display: "inline-flex",
  alignItems: "center",
};
const INLINE_FLEX: CSSProperties = { display: "inline-flex" };
const SEARCH_INPUT: CSSProperties = { flex: 1, minWidth: 0 };

function Search({ input }: Readonly<KitToolbarSearchProps>) {
  "use no memo";
  const classNames = useClassNames();
  return (
    <span
      data-adapttable-part="search-field"
      className={classNames.searchField}
      style={SEARCH_FIELD}
    >
      <span
        data-adapttable-part="search-icon"
        className={classNames.searchIcon}
        style={INLINE_FLEX}
      >
        <SearchIcon size={14} />
      </span>
      <input
        {...input}
        data-adapttable-part="search"
        className={classNames.search}
        style={SEARCH_INPUT}
      />
    </span>
  );
}

/** The sort-by choice, labelled, with an empty option to stop sorting. */
function SortSelect({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitToolbarSortProps>) {
  "use no memo";
  return (
    <label>
      {label}{" "}
      <select
        aria-label={label}
        data-adapttable-part="sort-select"
        className={useClassNames().sortSelect}
        value={value}
        onChange={(event) =>
          onValueChange(event.currentTarget.value || undefined)
        }
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const NO_WRAP: CSSProperties = { flexShrink: 0, whiteSpace: "nowrap" };

/** The toolbar's buttons; add-row keeps its caption on one line. */
const Button = forwardRef<HTMLButtonElement, KitButtonProps>(
  function Button(props, ref) {
    "use no memo";
    const part = props["data-adapttable-part"];
    return (
      <NativeButton
        ref={ref}
        className={useClassOfPart(part)}
        style={part === "add-row" ? NO_WRAP : undefined}
        {...props}
      />
    );
  }
);

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
  const classNames = useClassNames();
  return (
    <button
      ref={elementRef}
      type="button"
      aria-expanded={expanded}
      data-active={open || undefined}
      data-adapttable-part="filters-button"
      className={classNames.filtersButton}
      style={NO_WRAP}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <span
        data-adapttable-part="filters-icon"
        className={classNames.filtersIcon}
        style={INLINE_FLEX}
      >
        <FiltersIcon />
      </span>
      {label}
      {count > 0 && (
        <span
          data-adapttable-part="filters-count"
          className={classNames.filtersCount}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** The rows-per-page choice, labelled. */
function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <label>
      {label}{" "}
      <select
        aria-label={label}
        data-adapttable-part="rows-per-page"
        className={useClassNames().rowsPerPage}
        value={value}
        onChange={(event) => onValueChange(Number(event.currentTarget.value))}
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}

/** The toolbar, with native controls. */
export const Toolbar = /* @__PURE__ */ createToolbar({
  Frame,
  Search,
  SortSelect,
  Button,
  FiltersButton,
  filtersPopover: "wrap",
  RowsPerPage,
});
