import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "@adapttable/react/adapter";

import type { DataTableClassNames } from "../types";
import { ClassNamesProvider, useClassNames } from "./classNamesContext";

function Surface({ label, children, className }: CommandPaletteSurfaceProps) {
  return (
    <div
      // No part name: four kits paint this with their own Dialog's
      // backdrop and could not tag it, so it is not contract.
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        zIndex: 1000,
      }}
      // A scrim, not a control: the dialog inside owns every interaction and
      // Escape closes from there. It carries no role at all — `presentation`
      // is ignored on an element with focusable descendants, so declaring it
      // over a dialog says something ARIA will not honour.
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={className}
        data-adapttable-part="command-palette"
        style={{ minWidth: 360, maxWidth: 520, width: "100%" }}
      >
        {children}
      </div>
    </div>
  );
}

function Input({ inputProps }: CommandPaletteInputProps) {
  const { commandInput } = useClassNames();
  const { onChange, ref, ...bind } = inputProps;
  return (
    <input
      {...bind}
      ref={ref}
      className={commandInput}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

function Item({ command, active, itemProps }: CommandPaletteItemProps) {
  const { commandItem } = useClassNames();
  return (
    <button
      type="button"
      {...itemProps}
      data-active={active || undefined}
      disabled={command.disabled}
      className={commandItem}
    >
      {command.label}
    </button>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  const { commandEmpty } = useClassNames();
  return (
    <p data-adapttable-part="command-empty" className={commandEmpty}>
      {message}
    </p>
  );
}

const slots: CommandPaletteSlots = { Surface, Input, Item, Empty };

/**
 * Unstyled command palette: semantic markup with class hooks, no styles.
 *
 * The slots read the class map from context rather than closing over it, so
 * their component identity survives a re-render — a palette whose input
 * remounts on every keystroke loses the caret — and two palettes with
 * different maps on one page still get their own.
 */
export function CommandPalette(
  props: Readonly<
    Omit<CommandPaletteChromeProps, "slots"> & {
      classNames?: DataTableClassNames;
    }
  >
) {
  const { classNames, ...rest } = props;
  return (
    <ClassNamesProvider classNames={classNames}>
      <CommandPaletteChrome
        {...rest}
        className={classNames?.commandPalette}
        slots={slots}
      />
    </ClassNamesProvider>
  );
}
