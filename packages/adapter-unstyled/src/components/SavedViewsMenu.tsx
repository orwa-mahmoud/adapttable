import type { TableLabels, UseSavedViewsOptions } from "@adapttable/core";
import { useSavedViews } from "@adapttable/core";
import type { CSSProperties } from "react";
import { useState } from "react";
import { createPortal } from "react-dom";

import type { DataTableClassNames } from "../types";
import { MENU_PANEL_STYLE, useMenuPopover } from "./menuPopover";

/**
 * Layout for a panel row: the name/input takes the space, the trailing
 * button keeps its size. The gap is structural — without it the two sit
 * flush, and no class hook can add space a consumer has not asked for.
 */
const ROW_STYLE: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
};

/**
 * The label strings the saved-views menu renders.
 *
 * @public
 */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

/**
 * Props for the saved-views menu: the views, and what may be done to them.
 *
 * @public
 */
export interface SavedViewsMenuProps {
  /** Wiring for core's `useSavedViews` — storage key, storage, adapter, urlKey. */
  options: UseSavedViewsOptions;
  /** Resolved labels, every key filled. */
  labels: SavedViewsLabels;
  /** Per-part classes. */
  classNames: DataTableClassNames;
}

/**
 * Saved-views popover: a disclosure button + a panel listing the saved views
 * (click applies one and closes; each has a delete button) above a save row
 * that captures the table's CURRENT state under a typed name. Built on core's
 * `useSavedViews`; closes on outside-click or Escape. Ships no styles —
 * target the `data-adapttable-part` hooks or the `views*` className slots.
 *
 * @public
 */
export function SavedViewsMenu({
  options,
  labels,
  classNames,
}: Readonly<SavedViewsMenuProps>) {
  const { views, save, apply, remove } = useSavedViews(options);
  const { open, setOpen, rootRef, triggerRef, panelRef } = useMenuPopover();
  const [name, setName] = useState("");
  const trimmed = name.trim();

  return (
    <div
      ref={rootRef}
      data-adapttable-part="views-menu"
      className={classNames.viewsMenu}
      style={{ position: "relative" }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        data-adapttable-part="views-button"
        data-active={open || undefined}
        className={classNames.viewsButton}
        style={{ flexShrink: 0, whiteSpace: "nowrap" }}
        onClick={() => setOpen((v) => !v)}
      >
        {labels.savedViews}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            data-adapttable-part="views-panel"
            className={classNames.viewsPanel}
            style={MENU_PANEL_STYLE}
          >
            {views.map((view) => (
              <div
                key={view.name}
                data-adapttable-part="views-row"
                className={classNames.viewsRow}
                style={ROW_STYLE}
              >
                <button
                  type="button"
                  data-adapttable-part="views-item"
                  className={classNames.viewsItem}
                  onClick={() => {
                    apply(view.name);
                    setOpen(false);
                  }}
                >
                  {view.name}
                </button>
                <button
                  type="button"
                  aria-label={`${labels.deleteView}: ${view.name}`}
                  data-adapttable-part="views-delete"
                  className={classNames.viewsDelete}
                  onClick={() => remove(view.name)}
                >
                  ×
                </button>
              </div>
            ))}
            <hr
              data-adapttable-part="views-divider"
              className={classNames.viewsDivider}
            />
            <div
              data-adapttable-part="views-save-row"
              className={classNames.viewsSaveRow}
              style={ROW_STYLE}
            >
              <input
                aria-label={labels.viewName}
                placeholder={labels.viewName}
                data-adapttable-part="views-input"
                className={classNames.viewsInput}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />
              <button
                type="button"
                disabled={trimmed === ""}
                data-adapttable-part="views-save"
                className={classNames.viewsSave}
                onClick={() => {
                  save(trimmed);
                  setName("");
                }}
              >
                {labels.saveView}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
