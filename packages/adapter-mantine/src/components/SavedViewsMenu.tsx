import type { TableLabels, UseSavedViewsOptions } from "@adapttable/core";
import { useSavedViews } from "@adapttable/core";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Popover,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { CloseIcon } from "../icons";
import { useEscapeClose } from "./useEscapeClose";

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
 * Props for {@link SavedViewsMenu}.
 *
 * @public
 */
export interface SavedViewsMenuProps {
  /** Storage + URL backend wiring, forwarded to core's `useSavedViews`. */
  options: UseSavedViewsOptions;
  /** Resolved table labels (trigger, save row, delete action). */
  labels: SavedViewsLabels;
}

/**
 * Saved-views menu: lists every captured view (click a name to apply it and
 * close, the trailing ✕ to delete it) above a save row that captures the
 * table's CURRENT URL state under the typed name. Pairs with core's
 * `useSavedViews` and composes into the `toolbar` slot — or let
 * `<DataTable savedViews>` mount it for you next to the Columns menu.
 *
 * @public
 */
export function SavedViewsMenu({
  options,
  labels,
}: Readonly<SavedViewsMenuProps>) {
  const views = useSavedViews(options);
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const trimmed = name.trim();
  useEscapeClose(opened, () => setOpened(false));
  // Saving clears the input but keeps the menu open, so several views can
  // be captured in one sitting.
  const handleSave = () => {
    views.save(trimmed);
    setName("");
  };
  // A Popover, not a Menu: the panel holds buttons and a text input, so
  // `role="menu"` semantics (menuitem children, typeahead) would be a lie.
  return (
    <Popover
      opened={opened}
      onChange={(nextOpened) => {
        if (!nextOpened) setOpened(false);
      }}
      position="bottom-end"
      withinPortal
      returnFocus
      zIndex={10050}
      middlewares={{ flip: false, shift: { padding: 8, mainAxis: false } }}
    >
      <Popover.Target>
        <Button
          variant="default"
          size="sm"
          aria-expanded={opened}
          onClick={() => setOpened((value) => !value)}
        >
          {labels.savedViews}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Box
          p={4}
          miw={220}
          mah="min(70vh, 360px)"
          style={{ overflowY: "auto" }}
        >
          {views.views.map((view) => (
            <Group key={view.name} gap={6} px={4} py={2} wrap="nowrap">
              <Button
                variant="subtle"
                size="compact-sm"
                justify="flex-start"
                style={{ flex: 1 }}
                onClick={() => {
                  views.apply(view.name);
                  setOpened(false);
                }}
              >
                {view.name}
              </Button>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={`${labels.deleteView}: ${view.name}`}
                onClick={() => views.remove(view.name)}
              >
                <CloseIcon size={12} />
              </ActionIcon>
            </Group>
          ))}
          <Divider my={4} />
          <Group gap={6} p={4} wrap="nowrap">
            <TextInput
              size="xs"
              style={{ flex: 1 }}
              aria-label={labels.viewName}
              placeholder={labels.viewName}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <Button size="xs" disabled={trimmed === ""} onClick={handleSave}>
              {labels.saveView}
            </Button>
          </Group>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
