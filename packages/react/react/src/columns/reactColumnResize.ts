import type { ColumnResizeHandleProps as CoreColumnResizeHandleProps } from "@adapttable/core";
import type { HTMLAttributes } from "react";

/**
 * Column-resize handle props safe to spread onto React elements.
 *
 * @public
 */
export type ReactColumnResizeHandleProps = Omit<
  CoreColumnResizeHandleProps,
  "onPointerDown" | "onKeyDown" | "onDoubleClick"
> &
  Pick<
    HTMLAttributes<HTMLElement>,
    "onPointerDown" | "onKeyDown" | "onDoubleClick"
  > & {
    /** The shared styling hook on the actual resize control. */
    readonly "data-adapttable-part"?: "resize-handle";
  };

/**
 * @public
 */
export function toReactColumnResizeHandleProps(
  props: CoreColumnResizeHandleProps
): ReactColumnResizeHandleProps {
  return {
    ...props,
    "data-adapttable-part": "resize-handle",
  } as unknown as ReactColumnResizeHandleProps;
}
