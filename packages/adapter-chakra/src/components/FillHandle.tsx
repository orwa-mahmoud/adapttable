import {
  FillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "@adapttable/core/adapter";
import { Box } from "@chakra-ui/react";

function Handle({ label, handleProps, className }: FillHandleSlotProps) {
  return (
    <Box
      as="span"
      data-adapttable-part="fill-handle-anchor"
      position="relative"
      display="block"
      height={0}
    >
      <Box
        as="span"
        {...handleProps}
        aria-hidden="true"
        title={label}
        className={className}
        data-adapttable-part="fill-handle"
        position="absolute"
        insetInlineEnd="-3px"
        bottom="-3px"
        width="8px"
        height="8px"
        borderRadius="2px"
        background="var(--adapttable-fill-handle, currentColor)"
        cursor="crosshair"
      />
    </Box>
  );
}

const slots: FillHandleSlots = { Handle };

/**
 * Chakra-owned fill handle; core only decides which cell receives it.
 *
 * @public
 */
export function FillHandle(
  props: Readonly<Omit<FillHandleChromeProps, "slots">>
) {
  return <FillHandleChrome {...props} slots={slots} />;
}
