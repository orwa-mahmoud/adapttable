/** The saved-views management panel, in native HTML. */
import {
  SavedViewsPanelChrome,
  type SavedViewsPanelChromeProps,
  type SavedViewsPanelEmptyProps,
  type SavedViewsPanelInputProps,
  type SavedViewsPanelRowProps,
  type SavedViewsPanelSlots,
  type SavedViewsPanelSurfaceProps,
} from "@adapttable/core/adapter";
import type { CSSProperties } from "react";

import type { DataTableClassNames } from "../types";
import { ClassNamesProvider, useClassNames } from "./classNamesContext";

/**
 * One saved view and its controls.
 *
 * The classes are the map's, on the two keys the saved-views *menu* already
 * uses for these two shapes: `viewsItem` for the view's own name, which fills
 * the row and applies it, and `viewsDelete` for the compact icon controls
 * beside it. One preset therefore styles the menu and the panel that manages
 * it, and a native panel mounted beside a styled table is styled with it.
 *
 * The slot reads the map from context rather than closing over it, which is
 * what keeps the rename box from being remounted — and losing the caret —
 * on every keystroke.
 */
function Row({
  name,
  viewName,
  isEditing,
  isDefault,
  readOnly,
  defaultLabel,
  readOnlyLabel,
  onApply,
  applyLabel,
  controls,
  layout,
  ...rest
}: SavedViewsPanelRowProps) {
  const { viewsRow, viewsItem, viewsDelete } = useClassNames();
  return (
    <div className={viewsRow} style={layout.row} {...rest}>
      <div style={layout.caption} data-adapttable-part="saved-view-caption">
        {isEditing ? (
          name
        ) : (
          <button
            type="button"
            className={viewsItem}
            title={applyLabel}
            style={{
              flex: "1 1 auto",
              minWidth: 0,
              textAlign: "start",
              fontWeight: isDefault ? 600 : 400,
            }}
            onClick={onApply}
          >
            {viewName}
          </button>
        )}
        {readOnly && (
          <span data-adapttable-part="saved-view-readonly">
            {readOnlyLabel}
          </span>
        )}
        {isDefault && (
          <span data-adapttable-part="saved-view-default">{defaultLabel}</span>
        )}
      </div>
      <div style={layout.controls} data-adapttable-part="saved-view-controls">
        {controls.map((control) => (
          <button
            key={control.key}
            type="button"
            className={viewsDelete}
            style={layout.control}
            aria-label={control.label}
            aria-pressed={control.pressed}
            title={control.label}
            disabled={!control.onPress}
            onClick={control.onPress}
          >
            {control.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The inline rename box, on the `viewsInput` key the menu's own box uses. */
function Input({
  label,
  ref,
  value,
  onChange,
  onCommit,
  onCancel,
}: SavedViewsPanelInputProps) {
  const { viewsInput } = useClassNames();
  return (
    <input
      aria-label={label}
      className={viewsInput}
      value={value}
      ref={ref}
      style={{ flex: "1 1 auto", minWidth: 0 }}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") onCommit();
        if (event.key === "Escape") onCancel();
      }}
    />
  );
}

/**
 * The panel body. Every other kit stacks its rows with the kit's own Stack;
 * native has none, and a row that wraps its controls onto a second line runs
 * into the next view's name without one.
 */
const LIST: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
};

/** The card's heading. Native has no typography scale, so this is the shape. */
const TITLE: CSSProperties = {
  display: "block",
  marginBlockEnd: 8,
  fontSize: "0.7rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.7,
};

const FOOTER: CSSProperties = {
  display: "block",
  marginBlockStart: 10,
  fontSize: "0.78rem",
  opacity: 0.75,
};

const slots: SavedViewsPanelSlots = {
  Surface: ({
    children,
    className,
    title,
    footer,
    ...rest
  }: SavedViewsPanelSurfaceProps) => (
    <div className={className} style={{ minWidth: 0 }} {...rest}>
      <span style={TITLE} data-adapttable-part="saved-views-title">
        {title}
      </span>
      <div style={LIST}>{children}</div>
      {footer && (
        <span style={FOOTER} data-adapttable-part="saved-views-footer">
          {footer}
        </span>
      )}
    </div>
  ),
  Empty: ({ message }: SavedViewsPanelEmptyProps) => <p>{message}</p>,
  Input,
  Row,
};

/**
 * Manage saved views: apply, rename, reorder, default, delete.
 *
 * Native markup carries no look of its own, so the panel takes the same
 * `classNames` map the table does and honors the `views*` keys — a panel
 * mounted beside a styled table would otherwise be raw HTML beside it.
 *
 * @public
 */
export function SavedViewsPanel(
  props: Readonly<
    Omit<SavedViewsPanelChromeProps, "slots"> & {
      classNames?: DataTableClassNames;
    }
  >
) {
  const { classNames, ...rest } = props;
  return (
    <ClassNamesProvider classNames={classNames}>
      <SavedViewsPanelChrome
        {...rest}
        className={classNames?.viewsPanel}
        slots={slots}
      />
    </ClassNamesProvider>
  );
}
