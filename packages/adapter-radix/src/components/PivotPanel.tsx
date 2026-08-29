/** The pivot configuration panel, in Radix Themes. */
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
import { Button, Card, Flex, Text } from "@radix-ui/themes";

import { NativeSelect } from "./primitives";

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...rest }: PivotPanelSurfaceProps) => (
    <Flex direction="column" gap="3" className={className} {...rest}>
      {children}
    </Flex>
  ),
  // The fieldset groups the zone's fields for a screen reader; the surface it
  // sits on is Radix's own Card, so the box carries the theme's panel colour
  // and radius instead of the browser's frame.
  Zone: ({ label, children, zone, ...rest }: PivotZoneProps) => (
    <Card asChild size="1">
      <fieldset
        data-pivot-zone={zone}
        style={{ border: 0, margin: 0, minInlineSize: 0 }}
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
    </Card>
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
