import type { TableLabels, UseSavedViewsOptions } from "@adapttable/core";
import { useSavedViews } from "@adapttable/core";
import { useState } from "react";

import type { DataTableClassNames } from "../types";
import { MENU_PANEL_STYLE, useMenuPopover } from "./menuPopover";

/** The label strings the saved-views menu renders. */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

export interface SavedViewsMenuProps {
  /** Wiring for core's `useSavedViews` — storage key, storage, adapter, urlKey. */
  options: UseSavedViewsOptions;
  labels: SavedViewsLabels;
  classNames: DataTableClassNames;
}

/**
 * Saved-views popover: a disclosure button + a panel listing the saved views
 * (click applies one; each has a delete button) above a save row that
 * captures the table's CURRENT state under a typed name. Built on core's
 * `useSavedViews`; closes on outside-click or Escape. Ships no styles —
 * target the `data-adapttable-part` hooks or the `views*` className slots.
 */
export function SavedViewsMenu({
  options,
  labels,
  classNames,
}: Readonly<SavedViewsMenuProps>) {
  const { views, save, apply, remove } = useSavedViews(options);
  const { open, setOpen, rootRef, triggerRef } = useMenuPopover();
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
      {open && (
        <div
          data-adapttable-part="views-panel"
          className={classNames.viewsPanel}
          style={MENU_PANEL_STYLE}
        >
          {views.map((view) => (
            <div
              key={view.name}
              style={{ display: "flex", alignItems: "center" }}
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
          <div style={{ display: "flex", alignItems: "center" }}>
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
        </div>
      )}
    </div>
  );
}
