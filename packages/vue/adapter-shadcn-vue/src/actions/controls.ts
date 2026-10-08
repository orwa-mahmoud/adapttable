import type { Attrs } from "@adapttable/vue";
import { h, type VNodeChild } from "vue";

import { Button } from "../components/button";
import { shadcnControlAttrs } from "../controls";
import { cn } from "../lib/utils";

export { shadcnInput } from "../controls";

/** Shared shadcn Button paint; feature state always comes from binding Chrome. */
export function shadcnActionButton(attrs: Attrs, content: VNodeChild) {
  return h(
    Button,
    {
      variant: "outline",
      type: "button",
      ...shadcnControlAttrs(attrs),
      class: cn("min-h-11 sm:min-h-9", attrs.class as string | undefined),
    },
    () => content
  );
}

export const menuClass =
  "adapttable-shadcn-vue z-50 min-w-40 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none";
export const menuItemClass =
  "relative flex min-h-11 cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[danger]:text-destructive sm:min-h-8";
