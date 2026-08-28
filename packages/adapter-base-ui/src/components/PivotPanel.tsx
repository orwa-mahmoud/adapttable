/** The pivot configuration panel, in Base UI. */
import {
  type PivotAddProps,
  type PivotAggProps,
  type PivotFieldProps,
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
  type PivotPanelSurfaceProps,
  type PivotZoneProps,
} from "@adapttable/core/adapter";

import { Button, Flex, Text } from "../ui";
import { NativeSelect } from "./primitives";

/** The adapter's own class list, in the order `DataTable` writes it. */
function classes(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

const slots: PivotPanelSlots = {
  // The adapter's tokens live on `adapttable-base-ui`, and a panel mounted
  // beside the table rather than inside it is outside that scope — without the
  // class every `var(--adapttable-*)` in here resolves to nothing and the kit's
  // own controls paint as bare text.
  Surface: ({ children, className, ...rest }: PivotPanelSurfaceProps) => (
    <Flex
      direction="column"
      gap="3"
      className={classes("adapttable-base-ui", className)}
      {...rest}
    >
      {children}
    </Flex>
  ),
  // The fieldset groups the zone's fields for a screen reader; the adapter's
  // card class gives it the same surface the table sits on instead of the
  // browser's frame.
  Zone: ({ label, children, zone, ...rest }: PivotZoneProps) => (
    <fieldset
      className="adapttable-card"
      data-pivot-zone={zone}
      style={{ margin: 0, minInlineSize: 0 }}
      {...rest}
    >
      <legend>
        <Text size="1" color="gray">
          {label}
        </Text>
      </legend>
      <Flex direction="column" gap="1">
        {children}
      </Flex>
    </fieldset>
  ),
  Field: ({
    label,
    onMoveUp,
    onMoveDown,
    onRemove,
    moveUpLabel,
    moveDownLabel,
    removeLabel,
    aggregation,
    ...rest
  }: PivotFieldProps) => (
    <Flex gap="1" align="center" wrap="wrap" {...rest}>
      <Text size="2" style={{ flex: "1 1 auto", minWidth: 0 }}>
        {label}
      </Text>
      {aggregation}
      <Button
        size="1"
        variant="soft"
        aria-label={`${moveUpLabel}: ${label}`}
        disabled={!onMoveUp}
        onClick={onMoveUp}
      >
        {"\u2191"}
      </Button>
      <Button
        size="1"
        variant="soft"
        aria-label={`${moveDownLabel}: ${label}`}
        disabled={!onMoveDown}
        onClick={onMoveDown}
      >
        {"\u2193"}
      </Button>
      <Button
        size="1"
        variant="soft"
        aria-label={`${removeLabel}: ${label}`}
        onClick={onRemove}
      >
        {"\u2715"}
      </Button>
    </Flex>
  ),
  Add: ({ label, options, onAdd }: PivotAddProps) => (
    <NativeSelect
      aria-label={label}
      value=""
      placeholder={label}
      options={options.map((option) => ({
        value: option.key,
        label: option.label,
      }))}
      onValueChange={(next) => {
        if (next) onAdd(next);
      }}
    />
  ),
  Agg: ({ label, value, options, onChange }: PivotAggProps) => (
    <NativeSelect
      aria-label={label}
      value={value}
      options={options.map((option) => ({ value: option, label: option }))}
      onValueChange={(next) => {
        onChange(next as (typeof options)[number]);
      }}
    />
  ),
};

/**
 * Configure a pivot: three zones, and buttons that move fields between them.
 *
 * @public
 */
export function PivotPanel(
  props: Readonly<Omit<PivotPanelChromeProps, "slots">>
) {
  return <PivotPanelChrome {...props} slots={slots} />;
}
