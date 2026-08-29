import type { TableLabels, UseSavedViewsOptions } from "@adapttable/core";
import { useSavedViews } from "@adapttable/core";
import {
  Button,
  Flex,
  IconButton,
  Popover,
  Separator,
  TextField,
} from "@radix-ui/themes";
import { useState } from "react";

import type { RadixAccentColor } from "../types";

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
  /** Forwarded to core's `useSavedViews` (storage key, adapter, urlKey, …). */
  options: UseSavedViewsOptions;
  /** The four saved-view strings (pass `table.labels` or your own). */
  labels: SavedViewsLabels;
  /** Radix accent color for the save button. */
  accentColor?: RadixAccentColor;
}

/**
 * Saved-views toolbar menu on core's `useSavedViews`: a popover listing the
 * captured views (click applies and closes; the trailing × deletes) above a
 * save row that snapshots the table's CURRENT URL state under a typed name.
 *
 * @public
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
      <Popover.Trigger>
        <Button size="2" variant="outline">
          {labels.savedViews}
        </Button>
      </Popover.Trigger>
      <Popover.Content
        align="end"
        side="bottom"
        avoidCollisions={false}
        minWidth="240px"
        maxHeight="min(70vh, 360px)"
        style={{ overflowY: "auto", zIndex: 10050 }}
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
              disabled={trimmed === ""}
              onClick={saveCurrent}
              style={{ flexShrink: 0 }}
            >
              {labels.saveView}
            </Button>
          </Flex>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
