import type { TableLabels, UseSavedViewsOptions } from "@adapttable/core";
import { useSavedViews } from "@adapttable/core";
import { Popover } from "@base-ui/react/popover";
import { useState } from "react";

import type { BaseUiAccentColor } from "../types";
import { Button, Flex, IconButton, Separator, TextField } from "../ui";

/** Small × glyph for the per-view delete button. */
function CrossIcon() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** The label strings the saved-views menu renders. */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

/** Props for the saved-views menu: the views, and what may be done to them. */
export interface SavedViewsMenuProps {
  /** Forwarded to core's `useSavedViews` (storage key, adapter, urlKey, …). */
  options: UseSavedViewsOptions;
  /** The four saved-view strings (pass `table.labels` or your own). */
  labels: SavedViewsLabels;
  /** Accent color for the save button. */
  accentColor?: BaseUiAccentColor;
}

/**
 * Saved-views toolbar menu on core's `useSavedViews`: a popover listing the
 * captured views (click applies and closes; the trailing × deletes) above a
 * save row that snapshots the table's CURRENT URL state under a typed name.
 */
export function SavedViewsMenu({
  options,
  labels,
  accentColor,
}: Readonly<SavedViewsMenuProps>) {
  const { views, save, apply, remove } = useSavedViews(options);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const saveCurrent = () => {
    save(trimmed);
    setName("");
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="adapttable-btn"
        data-size="2"
        data-variant="outline"
      >
        {labels.savedViews}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="adapttable-popup-positioner"
          side="bottom"
          align="end"
          sideOffset={8}
          collisionAvoidance={{
            side: "none",
            align: "shift",
            fallbackAxisSide: "none",
          }}
        >
          <Popover.Popup
            className="adapttable-popup"
            style={{
              minWidth: 240,
              maxHeight: "min(70vh, 360px)",
              overflowY: "auto",
            }}
          >
            <Flex direction="column" gap="1">
              {views.map((view) => (
                <Flex key={view.name} gap="1" align="center">
                  <Button
                    size="1"
                    variant="ghost"
                    style={{ flex: 1, justifyContent: "flex-start" }}
                    onClick={() => {
                      apply(view.name);
                      setOpen(false);
                    }}
                  >
                    {view.name}
                  </Button>
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="gray"
                    aria-label={`${labels.deleteView}: ${view.name}`}
                    onClick={() => remove(view.name)}
                  >
                    <CrossIcon />
                  </IconButton>
                </Flex>
              ))}
              <Separator my="1" size="4" />
              <Flex gap="1" align="center">
                <TextField.Root
                  size="1"
                  aria-label={labels.viewName}
                  placeholder={labels.viewName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  size="1"
                  color={accentColor}
                  variant="solid"
                  disabled={trimmed === ""}
                  onClick={saveCurrent}
                  style={{ flexShrink: 0 }}
                >
                  {labels.saveView}
                </Button>
              </Flex>
            </Flex>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
