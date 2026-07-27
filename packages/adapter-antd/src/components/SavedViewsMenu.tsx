import type {
  Direction,
  TableLabels,
  UseSavedViewsOptions,
} from "@adapttable/core";
import { useSavedViews } from "@adapttable/core";
import { Button, Divider, Flex, Input, Popover } from "antd";
import { useEffect, useRef, useState } from "react";

/** The label strings the saved-views menu renders. */
export type SavedViewsLabels = Pick<
  Required<TableLabels>,
  "savedViews" | "saveView" | "viewName" | "deleteView"
>;

/** Props for {@link SavedViewsMenu}. */
export interface SavedViewsMenuProps {
  /** Storage + URL wiring, forwarded to core's `useSavedViews`. */
  options: UseSavedViewsOptions;
  /** Resolved labels. */
  labels: SavedViewsLabels;
  dir?: Direction;
}

/**
 * AntD saved-views popover on core's headless `useSavedViews`: a list of
 * captured views (click re-applies one to the table's URL state, a trailing
 * button deletes it) plus a name-input row that saves the table's CURRENT
 * state. Controlled open state so Escape dismisses it (antd's Popover has no
 * built-in Escape handling) and the trigger reports `aria-expanded`, matching
 * the ColumnMenu beside it.
 */
export function SavedViewsMenu({
  options,
  labels,
  dir,
}: Readonly<SavedViewsMenuProps>) {
  const { views, save, apply, remove } = useSavedViews(options);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState("");
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  const trimmed = name.trim();
  const content = (
    <div style={{ padding: 8, minWidth: 240 }}>
      {views.map((view) => (
        <Flex key={view.name} align="center" gap={4}>
          <Button
            size="small"
            type="text"
            style={{ flex: 1, justifyContent: "flex-start" }}
            onClick={() => {
              apply(view.name);
              setOpen(false);
            }}
          >
            {view.name}
          </Button>
          <Button
            size="small"
            type="text"
            aria-label={`${labels.deleteView}: ${view.name}`}
            onClick={() => remove(view.name)}
          >
            <span aria-hidden="true">×</span>
          </Button>
        </Flex>
      ))}
      <Divider style={{ margin: "8px 0" }} />
      <Flex align="center" gap={4}>
        <Input
          size="small"
          placeholder={labels.viewName}
          aria-label={labels.viewName}
          value={name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <Button
          size="small"
          disabled={trimmed === ""}
          onClick={() => {
            save(trimmed);
            setName("");
          }}
        >
          {labels.saveView}
        </Button>
      </Flex>
    </div>
  );
  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement={dir === "rtl" ? "bottomLeft" : "bottomRight"}
      content={content}
      styles={{ content: { padding: 0 } }}
    >
      <Button ref={triggerRef} aria-expanded={open} aria-haspopup="true">
        {labels.savedViews}
      </Button>
    </Popover>
  );
}
