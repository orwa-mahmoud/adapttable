import type {
  ColumnMenuButtonProps,
  ColumnMenuSlots,
} from "@adapttable/vue/adapter";
import { Ellipsis, Eye, EyeOff, GripVertical, Pencil, Pin } from "@lucide/vue";
import { h } from "vue";

import { shadcnInput, shadcnSelect } from "../controls";
import { cn } from "../lib/utils";
import { shadcnAction } from "../tableControls";

const icons = {
  grip: GripVertical,
  visible: Eye,
  hidden: EyeOff,
  pin: Pin,
  more: Ellipsis,
  rename: Pencil,
};
export function columnButton({ attrs, label, icon }: ColumnMenuButtonProps) {
  return shadcnAction(
    {
      variant: icon ? "ghost" : "outline",
      size: icon ? "icon-sm" : "sm",
      ...attrs,
    },
    icon ? h(icons[icon], { class: "size-4", "aria-hidden": true }) : label
  );
}
export const columnControls: Pick<
  ColumnMenuSlots,
  "Trigger" | "Button" | "Input" | "Choice"
> = {
  Trigger: columnButton,
  Button: columnButton,
  Input: shadcnInput,
  Choice: shadcnSelect,
};

/** Menu layout styles stay in the optional column-menu chunk. */
export function columnClassNames(
  input: Readonly<Record<string, string | undefined>> = {}
) {
  const defaults: Record<string, string> = {
    columnMenuPanel: "space-y-3",
    columnMenuItem:
      "flex flex-wrap items-center gap-1 rounded-md px-1 py-1 hover:bg-muted/50",
    columnMenuName: "min-w-0 flex-1 truncate text-sm",
    columnMenuSubmenu:
      "grid w-full gap-2 rounded-md border border-border bg-muted/30 p-2",
    columnMenuChoice: "grid gap-1 text-sm",
    columnMenuChoiceLabel: "text-muted-foreground",
    columnMenuSeparator: "my-2 border-border",
    columnMenuActions: "flex flex-wrap gap-2",
  };
  return Object.fromEntries(
    [...new Set([...Object.keys(defaults), ...Object.keys(input)])].map(
      (key) => [key, cn(defaults[key], input[key])]
    )
  );
}
