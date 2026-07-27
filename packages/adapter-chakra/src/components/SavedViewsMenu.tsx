import {
  type TableLabels,
  useSavedViews,
  type UseSavedViewsOptions,
} from "@adapttable/core";
import {
  Button,
  HStack,
  IconButton,
  Input,
  Popover,
  Portal,
  Separator,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

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

/** Props for {@link SavedViewsMenu}. */
/** The label strings the saved-views menu renders. */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

export interface SavedViewsMenuProps {
  /** Forwarded to core's `useSavedViews` (storage key, adapter, urlKey, …). */
  options: UseSavedViewsOptions;
  /** The four saved-view strings (pass `table.labels` or your own). */
  labels: SavedViewsLabels;
  /** Chakra color scheme for the save button. */
  colorScheme?: string;
}

/**
 * Saved-views toolbar menu on core's `useSavedViews`: a popover listing the
 * captured views (click applies; the trailing × deletes) above a save row
 * that snapshots the table's CURRENT URL state under a typed name.
 */
export function SavedViewsMenu({
  options,
  labels,
  colorScheme,
}: Readonly<SavedViewsMenuProps>) {
  const { views, save, apply, remove } = useSavedViews(options);
  const [name, setName] = useState("");
  const trimmed = name.trim();
  const saveCurrent = () => {
    save(trimmed);
    setName("");
  };
  return (
    <Popover.Root positioning={{ placement: "bottom-end" }} lazyMount>
      <Popover.Trigger asChild>
        <Button size="sm" variant="outline">
          {labels.savedViews}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content minW="240px" w="auto">
            <Popover.Body px={2} py={2}>
              <Text
                fontSize="xs"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.06em"
                color="gray.500"
                px={1}
                pb={1}
              >
                {labels.savedViews}
              </Text>
              {views.map((view) => (
                <HStack key={view.name} gap={1} py={0.5}>
                  <Button
                    size="xs"
                    variant="ghost"
                    fontWeight="normal"
                    flex={1}
                    justifyContent="flex-start"
                    onClick={() => apply(view.name)}
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
                  colorPalette={colorScheme}
                  disabled={trimmed === ""}
                  onClick={saveCurrent}
                >
                  {labels.saveView}
                </Button>
              </HStack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
