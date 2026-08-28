import {
  FillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "@adapttable/core/adapter";
import { Box } from "@mui/material";

function Handle({ label, handleProps, className }: FillHandleSlotProps) {
  return (
    <Box
      component="span"
      data-adapttable-part="fill-handle-anchor"
      sx={{ position: "relative", display: "block", height: 0 }}
    >
      <Box
        component="span"
        {...handleProps}
        aria-hidden="true"
        title={label}
        className={className}
        data-adapttable-part="fill-handle"
        sx={{
          position: "absolute",
          insetInlineEnd: -3,
          bottom: -3,
          width: 8,
          height: 8,
          borderRadius: "2px",
          bgcolor: "primary.main",
          cursor: "crosshair",
        }}
      />
    </Box>
  );
}

const slots: FillHandleSlots = { Handle };

/**
 * MUI-owned fill handle; core only decides which cell receives it.
 *
 * @public
 */
export function FillHandle(
  props: Readonly<Omit<FillHandleChromeProps, "slots">>
) {
  return <FillHandleChrome {...props} slots={slots} />;
}
