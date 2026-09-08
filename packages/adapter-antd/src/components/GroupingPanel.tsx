/** The interactive grouping strip, drawn with Ant Design controls. */
import {
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "@adapttable/react/adapter";
import { Button, Card, Flex, Select, Tag, Typography } from "antd";

const TOUCH_TARGET = 40;

const slots: GroupingPanelSlots = {
  Surface: ({
    children,
    label,
    mobile,
    dir,
    ...rest
  }: GroupingPanelSurfaceProps) => (
    <Card
      size="small"
      role="group"
      aria-label={label}
      dir={dir}
      {...rest}
      styles={{ body: { padding: 8 } }}
    >
      <Flex
        align="center"
        gap={8}
        wrap="wrap"
        data-mobile={mobile || undefined}
      >
        {children}
      </Flex>
    </Card>
  ),
  DropZone: ({
    label,
    empty,
    active,
    dragging,
    dropProps,
    ...rest
  }: GroupingPanelDropZoneProps) => (
    <Card
      size="small"
      role="group"
      aria-label={label}
      {...dropProps}
      {...rest}
      data-dragging={dragging || undefined}
      styles={{ body: { padding: empty ? "6px 10px" : "6px 8px" } }}
      style={{
        minBlockSize: TOUCH_TARGET,
        minInlineSize: empty ? 180 : TOUCH_TARGET,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderStyle: "dashed",
        borderColor: active
          ? "var(--ant-color-primary, #1677ff)"
          : "var(--ant-color-border, #d9d9d9)",
        background: active ? "var(--ant-color-primary-bg, #e6f4ff)" : undefined,
      }}
    >
      <Typography.Text type="secondary">{empty ? label : "+"}</Typography.Text>
    </Card>
  ),
  Chip: ({
    label,
    level,
    dragProps,
    keyboardProps,
    onRemove,
    removeLabel,
    ...rest
  }: GroupingPanelChipProps) => (
    <Tag
      {...rest}
      style={{
        margin: 0,
        padding: 0,
        minBlockSize: TOUCH_TARGET,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      <Flex align="center" gap={4}>
        <Button
          type="text"
          size="small"
          data-adapttable-part="grouping-chip-handle"
          {...dragProps}
          {...keyboardProps}
          style={{
            minWidth: TOUCH_TARGET,
            minHeight: TOUCH_TARGET,
            padding: 0,
            cursor: "grab",
            touchAction: "none",
          }}
        >
          {"⠿"}
        </Button>
        <Typography.Text>
          {level}. {label}
        </Typography.Text>
        <Button
          type="text"
          size="small"
          data-adapttable-part="grouping-chip-remove"
          aria-label={removeLabel}
          data-no-group-drag=""
          style={{
            minWidth: TOUCH_TARGET,
            minHeight: TOUCH_TARGET,
            padding: 0,
          }}
          onClick={onRemove}
        >
          {"×"}
        </Button>
      </Flex>
    </Tag>
  ),
  Select: ({
    label,
    value,
    options,
    onChange,
    disabled,
    "data-adapttable-part": part,
  }: GroupingPanelSelectProps) => {
    const addControl = part === "grouping-add";
    return (
      <Select
        aria-label={label}
        data-adapttable-part={part}
        value={addControl && value === "" ? undefined : value}
        placeholder={addControl ? label : undefined}
        disabled={disabled}
        options={options.map((option) => ({ ...option }))}
        style={{ minWidth: 160 }}
        getPopupContainer={(trigger: HTMLElement) =>
          trigger.parentElement ?? document.body
        }
        onChange={(next: string) => onChange(next)}
      />
    );
  },
  RemoveZone: ({
    label,
    active,
    dropProps,
    ...rest
  }: GroupingPanelRemoveZoneProps) => (
    <Card
      size="small"
      role="group"
      aria-label={label}
      {...dropProps}
      {...rest}
      styles={{ body: { padding: "6px 10px" } }}
      style={{
        minBlockSize: TOUCH_TARGET,
        minInlineSize: 180,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderStyle: "dashed",
        borderColor: active
          ? "var(--ant-color-error, #ff4d4f)"
          : "var(--ant-color-border, #d9d9d9)",
        background: active ? "var(--ant-color-error-bg, #fff2f0)" : undefined,
      }}
    >
      <Typography.Text type={active ? "danger" : "secondary"}>
        {label}
      </Typography.Text>
    </Card>
  ),
};

/**
 * Configure row grouping with drag, keyboard, and touch-friendly controls.
 *
 * @public
 */
export function GroupingPanel<TRow>(
  props: Readonly<Omit<GroupingPanelChromeProps<TRow>, "slots">>
) {
  return <GroupingPanelChrome {...props} slots={slots} />;
}
