import {
  CommandPaletteChrome,
  type CommandPaletteChromeProps,
  type CommandPaletteInputProps,
  type CommandPaletteItemProps,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
} from "@adapttable/core/adapter";
import { Button, Dialog, Input, Text } from "@chakra-ui/react";

import { KitPortal } from "./kitPortal";

/**
 * The kit's own dialog, holding core's combobox.
 *
 * The dialog is the kit's — its backdrop, its portal, its entrance — while
 * the input, the list and the highlight belong to core, because a palette
 * is a combobox over a listbox and no kit ships that shape. Splitting it
 * this way means the palette looks like the rest of the app and behaves the
 * same in all nine kits.
 */
function Surface({
  label,
  onClose,
  children,
  className,
}: Readonly<CommandPaletteSurfaceProps>) {
  return (
    <Dialog.Root
      open
      onOpenChange={(event) => {
        if (!event.open) onClose();
      }}
    >
      <KitPortal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            aria-label={label}
            className={className}
            data-adapttable-part="command-palette"
            p={2}
          >
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </KitPortal>
    </Dialog.Root>
  );
}

function Input_({ inputProps }: CommandPaletteInputProps) {
  const { onChange, ref, ...rest } = inputProps;
  return (
    <Input
      {...rest}
      ref={ref}
      mb={2}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  );
}

function Item({ command, active, itemProps }: CommandPaletteItemProps) {
  return (
    <Button
      {...itemProps}
      variant={active ? "subtle" : "ghost"}
      width="100%"
      justifyContent="flex-start"
      disabled={command.disabled}
    >
      {command.label}
    </Button>
  );
}

function Empty({ message }: Readonly<{ message: string }>) {
  return (
    <Text
      textStyle="sm"
      color="fg.muted"
      p={2}
      data-adapttable-part="command-empty"
    >
      {message}
    </Text>
  );
}

const slots: CommandPaletteSlots = { Surface, Input: Input_, Item, Empty };

/** chakra-owned command palette. */
export function CommandPalette(
  props: Readonly<Omit<CommandPaletteChromeProps, "slots">>
) {
  return <CommandPaletteChrome {...props} slots={slots} />;
}
