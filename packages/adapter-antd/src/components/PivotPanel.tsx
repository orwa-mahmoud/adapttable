/** The pivot configuration panel, in Ant Design. */
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
import { Button, Flex, Select, Typography } from "antd";

const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...rest }: PivotPanelSurfaceProps) => (
    <Flex vertical gap={12} className={className} {...rest}>
      {children}
    </Flex>
  ),
  Zone: ({ label, children, zone, ...rest }: PivotZoneProps) => (
    <fieldset
      data-pivot-zone={zone}
      style={{ border: 0, padding: 0, margin: 0 }}
      {...rest}
    >
      <legend>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {label}
        </Typography.Text>
      </legend>
      <Flex vertical gap={4}>
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
    <Flex gap={4} align="center" {...rest}>
      <Typography.Text style={{ flex: 1 }}>{label}</Typography.Text>
      {aggregation}
      <Button
        size="small"
        aria-label={`${moveUpLabel}: ${label}`}
        disabled={!onMoveUp}
        onClick={onMoveUp}
      >
        {"↑"}
      </Button>
      <Button
        size="small"
        aria-label={`${moveDownLabel}: ${label}`}
        disabled={!onMoveDown}
        onClick={onMoveDown}
      >
        {"↓"}
      </Button>
      <Button
        size="small"
        aria-label={`${removeLabel}: ${label}`}
        onClick={onRemove}
      >
        {"✕"}
      </Button>
    </Flex>
  ),
  Add: ({ label, options, onAdd }: PivotAddProps) => (
    <Select
      aria-label={label}
      placeholder={label}
      size="small"
      value={null}
      disabled={options.length === 0}
      options={options.map((option) => ({
        value: option.key,
        label: option.label,
      }))}
      // The panel lives inside a side panel that can itself be portalled;
      // rendering the dropdown in place keeps it with its trigger.
      getPopupContainer={(trigger: HTMLElement) =>
        trigger.parentElement ?? document.body
      }
      onChange={(next: string) => {
        if (next) onAdd(next);
      }}
    />
  ),
  Agg: ({ label, value, options, onChange }: PivotAggProps) => (
    <Select
      aria-label={label}
      size="small"
      style={{ width: 90 }}
      value={value}
      options={options.map((option) => ({ value: option, label: option }))}
      getPopupContainer={(trigger: HTMLElement) =>
        trigger.parentElement ?? document.body
      }
      onChange={(next: (typeof options)[number]) => {
        onChange(next);
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
