import {
  type TableLabels,
  useSavedViews,
  type UseSavedViewsOptions,
} from "@adapttable/core";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Menu,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { CloseIcon } from "../icons";

/** The label strings the saved-views menu renders. */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

/** Props for {@link SavedViewsMenu}. */
export interface SavedViewsMenuProps {
  /** Storage + URL backend wiring, forwarded to core's `useSavedViews`. */
  options: UseSavedViewsOptions;
  /** Resolved table labels (trigger, save row, delete action). */
  labels: SavedViewsLabels;
}

/**
 * Saved-views menu: lists every captured view (click a name to apply it, the
 * trailing ✕ to delete it) above a save row that captures the table's
 * CURRENT URL state under the typed name. Pairs with core's `useSavedViews`
 * and composes into the `toolbar` slot — or let `<DataTable savedViews>`
 * mount it for you next to the Columns menu.
 */
export function SavedViewsMenu({
  options,
  labels,
}: Readonly<SavedViewsMenuProps>) {
  const views = useSavedViews(options);
  const [name, setName] = useState("");
  const trimmed = name.trim();
  // Saving clears the input but keeps the menu open, so several views can
  // be captured in one sitting.
  const handleSave = () => {
    views.save(trimmed);
    setName("");
  };
  return (
    <Menu closeOnItemClick={false} position="bottom-end" withinPortal>
      <Menu.Target>
        <Button variant="default" size="sm">
          {labels.savedViews}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Box p={4} miw={220}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" px={4} pb={6}>
            {labels.savedViews}
          </Text>
          {views.views.map((view) => (
            <Group key={view.name} gap={6} px={4} py={2} wrap="nowrap">
              <Button
                variant="subtle"
                size="compact-sm"
                justify="flex-start"
                style={{ flex: 1 }}
                onClick={() => views.apply(view.name)}
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
          <Menu.Divider />
          <Group gap={6} p={4} wrap="nowrap">
            <TextInput
              size="xs"
              style={{ flex: 1 }}
              placeholder={labels.viewName}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <Button size="xs" disabled={trimmed === ""} onClick={handleSave}>
              {labels.saveView}
            </Button>
          </Group>
        </Box>
      </Menu.Dropdown>
    </Menu>
  );
}
