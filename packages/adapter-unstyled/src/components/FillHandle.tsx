import {
  FillHandleChrome,
  type FillHandleChromeProps,
  type FillHandleSlotProps,
  type FillHandleSlots,
} from "@adapttable/core/adapter";

function Handle({ label, handleProps, className }: FillHandleSlotProps) {
  return (
    <span
      data-adapttable-part="fill-handle-anchor"
      style={{ position: "relative", display: "block", height: 0 }}
    >
      <span
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
          borderRadius: 1,
          background: "var(--adapttable-fill-handle, currentColor)",
          cursor: "crosshair",
        }}
      />
    </span>
  );
}

const slots: FillHandleSlots = { Handle };

/**
 * Unstyled fill handle; core only decides which cell receives it.
 *
 * @public
 */
export function FillHandle(
  props: Readonly<Omit<FillHandleChromeProps, "slots">>
) {
  return <FillHandleChrome {...props} slots={slots} />;
}
