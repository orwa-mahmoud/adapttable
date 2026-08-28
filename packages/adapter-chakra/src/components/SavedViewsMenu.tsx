import type { TableLabels, UseSavedViewsOptions } from "@adapttable/core";
import { useSavedViews } from "@adapttable/core";
import {
  Button,
  HStack,
  IconButton,
  Input,
  Popover,
  Separator,
} from "@chakra-ui/react";
import { useState } from "react";

import { KitPortal } from "./kitPortal";

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

/** Props for the saved-views menu: the views, and what may be done to them. */
export interface SavedViewsMenuProps {
  /** Forwarded to core's `useSavedViews` (storage key, adapter, urlKey, …). */
  options: UseSavedViewsOptions;
  /** The four saved-view strings (pass `table.labels` or your own). */
  labels: SavedViewsLabels;
  /** Chakra color scheme for the save button. */
  accentColor?: string;
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
    <Popover.Root
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      positioning={{ placement: "bottom-end", flip: false }}
      lazyMount
    >
      <Popover.Trigger asChild>
        <Button size="sm" variant="outline">
          {labels.savedViews}
        </Button>
      </Popover.Trigger>
      <KitPortal>
        <Popover.Positioner>
          <Popover.Content
            minW="240px"
            w="auto"
            maxH="min(70vh, 360px)"
            overflowY="auto"
          >
            <Popover.Body px={2} py={2}>
              {views.map((view) => (
                <HStack key={view.name} gap={1} py={0.5}>
                  <Button
                    size="xs"
                    variant="ghost"
                    fontWeight="normal"
                    flex={1}
                    justifyContent="flex-start"
                    onClick={() => {
                      apply(view.name);
                      setOpen(false);
                    }}
                  >
                    {view.name}
                  </Button>
                  <IconButton
                    size="xs"
                    variant="ghost"
                    aria-label={`${labels.deleteView}: ${view.name}`}
                    onClick={() => remove(view.name)}
                  >
                    <CrossIcon />
                  </IconButton>
                </HStack>
              ))}
              <Separator my={1} />
              <HStack gap={1}>
                <Input
                  size="xs"
                  aria-label={labels.viewName}
                  placeholder={labels.viewName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Button
                  size="xs"
                  flexShrink={0}
                  colorPalette={accentColor}
                  disabled={trimmed === ""}
                  onClick={saveCurrent}
                >
                  {labels.saveView}
                </Button>
              </HStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </KitPortal>
    </Popover.Root>
  );
}
