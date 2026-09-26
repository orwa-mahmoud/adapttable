/**
 * The command palette: every table action, findable by typing.
 *
 * A context menu answers "what can I do to this?"; a palette answers "how
 * do I do that?" — and the second question is the one people ask when they
 * cannot find a control. So it lists the same commands, and the list is
 * literally the same objects: no palette-shaped command type exists.
 *
 * Unlike the context menu, focus IS core's problem here. A palette is a
 * modal dialog, and the kits' menu primitives do not model one — their
 * dialogs do, but a dialog is not a listbox and would give the kit's
 * dismissal behaviour without the type-to-filter behaviour that makes a
 * palette a palette. So the pattern is built here, once, correctly:
 *
 * - focus moves to the input on open and back to the opener on close, so
 *   the keyboard user who summoned it is returned to where they were
 * - Tab is trapped inside, because a modal that lets focus wander behind it
 *   is a modal only visually
 * - the arrows move a highlighted option while focus stays in the input,
 *   the combobox pattern — a palette where typing loses the highlight, or
 *   where arrowing loses the caret, is unusable at speed
 * - Enter runs the highlighted command, Escape closes
 *
 * What the kit owns is every visible piece: the dialog surface, the input,
 * the rows.
 */
import {
  type Command,
  commandListKeyAction,
  commandListView,
  createCommandList,
  runCommand,
  type TableLabels,
  tabTrapTarget,
} from "@adapttable/core";
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

export type { Command };

/**
 * Props an adapter's palette surface receives.
 *
 * @public
 */
export interface CommandPaletteSurfaceProps {
  /** Accessible name for the dialog. */
  readonly label: string;
  /** Close it — bind to the kit's own dismiss channel. */
  readonly onClose: () => void;
  /** Content rendered inside. */
  readonly children: ReactNode;
  /** Class for the element. */
  readonly className?: string;
}

/**
 * Props an adapter's search input receives.
 *
 * @public
 */
export interface CommandPaletteInputProps {
  /** Spread onto the input: value, handlers, and the combobox wiring. */
  readonly inputProps: {
    readonly value: string;
    readonly onChange: (next: string) => void;
    readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    readonly ref: (element: HTMLInputElement | null) => void;
    readonly role: "combobox";
    readonly "aria-expanded": true;
    readonly "aria-controls": string;
    readonly "aria-activedescendant": string | undefined;
    readonly "aria-label": string;
    readonly placeholder: string;
    readonly "data-adapttable-part": "command-input";
  };
}

/**
 * Props an adapter's command row receives.
 *
 * @public
 */
export interface CommandPaletteItemProps {
  /** The command being rendered. */
  readonly command: Command;
  /** Whether this entry is the highlighted one. */
  readonly active: boolean;
  /** Spread onto the row: the option role, its id, and selection. */
  readonly itemProps: {
    readonly id: string;
    readonly role: "option";
    readonly "aria-selected": boolean;
    readonly "aria-disabled": boolean | undefined;
    readonly "data-adapttable-part": "command-item";
    readonly onClick: () => void;
    readonly onMouseEnter: () => void;
  };
}

/**
 * Adapter-owned rendering for {@link CommandPaletteChrome}.
 *
 * @public
 */
export interface CommandPaletteSlots {
  /** The modal surface. */
  readonly Surface: (props: CommandPaletteSurfaceProps) => ReactNode;
  /** The search box. */
  readonly Input: (props: CommandPaletteInputProps) => ReactNode;
  /** One command. */
  readonly Item: (props: CommandPaletteItemProps) => ReactNode;
  /** Shown when nothing matches. */
  readonly Empty: (props: { readonly message: string }) => ReactNode;
}

/**
 * What the palette needs to render.
 *
 * @public
 */
export interface CommandPaletteChromeProps {
  /** Every command available right now. */
  commands: readonly Command[];
  /** Whether it is showing. */
  open: boolean;
  /** Close it. */
  onClose: () => void;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** A kit's own class for the surface. */
  className?: string;
  /** Adapter-owned visible components. */
  slots: CommandPaletteSlots;
}

/** Every element inside that can hold focus, for the Tab trap. */
function focusablesIn(root: HTMLElement | null): HTMLElement[] {
  return [
    ...(root?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ) ?? []),
  ];
}

/**
 * Renders the command palette, or nothing when it is closed.
 *
 * @param props - The commands, whether it is open, and the kit's slots.
 * @returns The palette.
 *
 * @public
 */
export function CommandPaletteChrome(
  props: Readonly<CommandPaletteChromeProps>
) {
  const { commands, open, onClose, slots } = props;
  const [list] = useState(createCommandList);
  const snapshot = useSyncExternalStore(
    list.subscribe,
    list.getSnapshot,
    list.getSnapshot
  );
  const surface = useRef<HTMLDivElement | null>(null);

  // Clicking away closes it — decided here, beside Escape, rather than by
  // each kit hanging a handler on its scrim. A scrim that listens has to
  // carry an ARIA role to justify the handler, and `presentation` is ignored
  // on an element wrapping a dialog, so the markup ends up claiming
  // something ARIA will not honour. A document listener needs no such claim.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event: PointerEvent) => {
      const node = surface.current;
      if (node && !node.contains(event.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose]);
  const input = useRef<HTMLInputElement | null>(null);
  const opener = useRef<Element | null>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    list.reset();
    return () => {
      const back = opener.current;
      opener.current = null;
      if (back instanceof HTMLElement) back.focus();
    };
  }, [open, list]);

  const view = commandListView(commands, snapshot);
  const { matches, active: clamped } = view;
  const activeId = matches[clamped]
    ? `${listId}-${matches[clamped].key}`
    : undefined;

  const run = (command: Command | undefined) => {
    runCommand(command, onClose);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const action = commandListKeyAction(event.key, view);
    if (action) {
      event.preventDefault();
      if (action.kind === "close") onClose();
      else if (action.kind === "run") run(action.command);
      else list.setActive(action.to);
      return;
    }
    if (event.key !== "Tab") return;
    // The trap. A modal that lets Tab reach the page behind it is a modal to
    // the eye and not to the keyboard.
    const target = tabTrapTarget(
      focusablesIn(surface.current),
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
      event.shiftKey
    );
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  if (!open) return null;
  const labels = props.labels;
  return (
    <slots.Surface
      label={labels?.commandPalette ?? "Command palette"}
      onClose={onClose}
      className={props.className}
    >
      {/* A layout wrapper for the focus trap's bounds — the kit's
          surface around it is the element worth a part name. */}
      <div ref={surface}>
        <slots.Input
          inputProps={{
            value: snapshot.query,
            onChange: (next) => {
              list.setQuery(next);
            },
            onKeyDown,
            // Focus is taken when the element ARRIVES, not when the
            // palette opens. Several kits render their dialog through a
            // portal that mounts a tick later, so an effect on `open`
            // reaches for an input that does not exist yet and focus is
            // left on the body.
            ref: (element) => {
              const arrived = element !== null && input.current !== element;
              input.current = element;
              if (!arrived) return;
              // The opener is captured HERE, immediately before focus
              // moves — not in an effect. The ref runs during commit and
              // the effect after it, so an effect would record the input
              // this line is about to focus and close would restore focus
              // to a node that no longer exists.
              opener.current ??= document.activeElement;
              element.focus();
            },
            role: "combobox",
            "aria-expanded": true,
            "aria-controls": listId,
            "aria-activedescendant": activeId,
            "aria-label": labels?.commandSearch ?? "Search commands",
            placeholder: labels?.commandSearch ?? "Search commands",
            "data-adapttable-part": "command-input",
          }}
        />
        <div
          id={listId}
          role="listbox"
          aria-label={labels?.commandPalette ?? "Command palette"}
          data-adapttable-part="command-list"
        >
          {matches.map((command, index) => (
            <slots.Item
              key={command.key}
              command={command}
              active={index === clamped}
              itemProps={{
                id: `${listId}-${command.key}`,
                role: "option",
                "aria-selected": index === clamped,
                "aria-disabled": command.disabled,
                "data-adapttable-part": "command-item",
                onClick: () => {
                  run(command);
                },
                onMouseEnter: () => {
                  list.setActive(index);
                },
              }}
            />
          ))}
        </div>
        {matches.length === 0 && (
          <slots.Empty
            message={labels?.commandEmpty ?? "No matching command"}
          />
        )}
      </div>
    </slots.Surface>
  );
}
