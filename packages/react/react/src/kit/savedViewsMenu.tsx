/**
 * The saved-views menu, built once from a kit's primitives.
 *
 * Core's saved views capture, list, apply and delete the table's URL state;
 * this file lays the menu out: a button that opens a panel listing the views
 * (a click applies one and closes the panel, the trailing button deletes it)
 * above a row that saves the current state under a typed name.
 */
import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useRef,
  useState,
} from "react";

import type { SavedViewsSlotProps } from "../features/slotKeys";
import { useEscapeClose } from "../overlays/useEscapeClose";
import { useSavedViews } from "../url/useSavedViews";
import { spaceBelow } from "./panelHeight";
import { type KitUsePartClass, noPartClass } from "./partClass";
import type { KitPrimitivesOf, KitTriggerProps } from "./primitives";

/**
 * The spacing that keeps the saved-views menu in a kit's own rhythm.
 *
 * @public
 */
export interface KitSavedViewsLook {
  /** The scrolling panel: its padding, minimum and maximum height. */
  readonly panel: CSSProperties;
  /** One saved view's row: its name and delete button. */
  readonly row: CSSProperties;
  /** The rule between the views and the save row. */
  readonly divider: CSSProperties;
  /** The row that names and saves the current view. */
  readonly saveRow: CSSProperties;
  /** The name field in the save row. */
  readonly nameInput: CSSProperties;
}

/** The tallest the panel grows before it scrolls. */
const PANEL_MAX_HEIGHT = 360;

/** The parts of the saved-views menu. */
const VIEWS_PARTS = {
  button: "views-button",
  panel: "views-panel",
  row: "views-row",
  item: "views-item",
  remove: "views-delete",
  divider: "views-divider",
  saveRow: "views-save-row",
  input: "views-input",
  save: "views-save",
} as const;

/**
 * Build the saved-views menu: the toolbar button and the panel it opens.
 *
 * @param kit - The kit's button, icon button, text input, popover and
 *   divider, and the delete button's glyph.
 * @param useLook - The kit's spacing; called as a hook.
 * @returns The saved-views menu.
 *
 * @public
 */
export function createSavedViewsMenu(
  kit: KitPrimitivesOf<
    "Button" | "IconButton" | "TextInput" | "Popover" | "Divider"
  > & {
    /** The delete button's glyph. */
    readonly deleteIcon: ReactNode;
    /**
     * The host's class for a part the menu draws itself: the panel, each row
     * and the save row. Absent, they carry none.
     */
    readonly usePartClass?: KitUsePartClass;
  },
  useLook: () => KitSavedViewsLook
): (props: Readonly<SavedViewsSlotProps>) => ReactElement {
  const { Button, IconButton, TextInput, Popover, Divider } = kit;
  const usePartClass = kit.usePartClass ?? noPartClass;
  return function SavedViewsMenu({
    options,
    labels,
  }: Readonly<SavedViewsSlotProps>): ReactElement {
    const look = useLook();
    const classOf = usePartClass();
    const { views, save, apply, remove } = useSavedViews(options);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    const nameRef = useRef<HTMLInputElement | null>(null);
    const trimmed = name.trim();
    // One owner for Escape: it closes from wherever focus sits in the panel
    // and hands focus back to the button.
    useEscapeClose(open, () => {
      setOpen(false);
      anchorRef.current?.focus();
    });
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        placement="bottom-start"
        flush
        aria-label={labels.savedViews}
        trigger={({ elementRef, ...trigger }: KitTriggerProps) => (
          <Button
            {...trigger}
            elementRef={(node: HTMLButtonElement | null) => {
              anchorRef.current = node;
              if (typeof elementRef === "function") elementRef(node);
              else if (elementRef) elementRef.current = node;
            }}
            variant="outlined"
            aria-haspopup="true"
            data-adapttable-part={VIEWS_PARTS.button}
            data-active={open ? "" : undefined}
          >
            {labels.savedViews}
          </Button>
        )}
      >
        <div
          data-adapttable-part={VIEWS_PARTS.panel}
          className={classOf(VIEWS_PARTS.panel)}
          style={{
            ...look.panel,
            maxHeight:
              look.panel.maxHeight ??
              spaceBelow(anchorRef.current, PANEL_MAX_HEIGHT),
            overflowY: look.panel.overflowY ?? "auto",
          }}
        >
          {views.map((view) => (
            <div
              key={view.name}
              data-adapttable-part={VIEWS_PARTS.row}
              className={classOf(VIEWS_PARTS.row)}
              style={look.row}
            >
              <Button
                variant="text"
                fullWidth
                justify="start"
                data-adapttable-part={VIEWS_PARTS.item}
                onClick={() => {
                  apply(view.name);
                  setOpen(false);
                }}
              >
                {view.name}
              </Button>
              <IconButton
                aria-label={`${labels.deleteView}: ${view.name}`}
                data-adapttable-part={VIEWS_PARTS.remove}
                onClick={() => remove(view.name)}
              >
                {kit.deleteIcon}
              </IconButton>
            </div>
          ))}
          {views.length > 0 ? (
            <Divider
              data-adapttable-part={VIEWS_PARTS.divider}
              style={look.divider}
            />
          ) : null}
          <div
            data-adapttable-part={VIEWS_PARTS.saveRow}
            className={classOf(VIEWS_PARTS.saveRow)}
            style={look.saveRow}
          >
            <TextInput
              elementRef={nameRef}
              aria-label={labels.viewName}
              placeholder={labels.viewName}
              data-adapttable-part={VIEWS_PARTS.input}
              value={name}
              style={look.nameInput}
              onValueChange={setName}
            />
            <Button
              variant="filled"
              disabled={trimmed === ""}
              data-adapttable-part={VIEWS_PARTS.save}
              onClick={() => {
                save(trimmed);
                setName("");
                // The save button turns disabled; focus stays in the panel,
                // on the field, so the next name can be typed and Escape
                // still closes it.
                nameRef.current?.focus();
              }}
            >
              {labels.saveView}
            </Button>
          </div>
        </div>
      </Popover>
    );
  };
}
