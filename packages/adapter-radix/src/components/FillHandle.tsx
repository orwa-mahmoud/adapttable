import {
  FillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "@adapttable/core/adapter";
import { Box } from "@radix-ui/themes";

function Handle({ label, handleProps, className }: FillHandleSlotProps) {
  return (
    <Box
      asChild
      data-adapttable-part="fill-handle-anchor"
      style={{ position: "relative", display: "block", height: 0 }}
    >
      <span>
        <Box
          asChild
          {...handleProps}
          aria-hidden="true"
          title={label}
          className={className}
          data-adapttable-part="fill-handle"
          style={{
            position: "absolute",
            insetInlineEnd: -3,
            bottom: -3,
            width: 8,
            height: 8,
            borderRadius: 2,
            background: "var(--adapttable-fill-handle, var(--accent-9))",
            cursor: "crosshair",
          }}
        >
          <span />
        </Box>
      </span>
    </Box>
  );
}

const slots: FillHandleSlots = { Handle };

/**
 * Radix-owned fill handle; core only decides which cell receives it.
 *
 * @public
 */
export function FillHandle(
  props: Readonly<Omit<FillHandleChromeProps, "slots">>
) {
  return <FillHandleChrome {...props} slots={slots} />;
}
