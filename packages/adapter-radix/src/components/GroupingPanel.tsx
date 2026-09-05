/** The interactive row-grouping panel, in Radix Themes. */
import {
  GripIcon,
  type GroupingPanelChipProps,
  GroupingPanelChrome,
  type GroupingPanelChromeProps,
  type GroupingPanelDropZoneProps,
  type GroupingPanelRemoveZoneProps,
  type GroupingPanelSelectProps,
  type GroupingPanelSlots,
  type GroupingPanelSurfaceProps,
} from "@adapttable/react/adapter";
import { Box, Card, Flex, IconButton, Text } from "@radix-ui/themes";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { NativeSelect } from "./primitives";

const TOUCH_TARGET = 44;
const GroupingPanelPortalContext = createContext<{
  dir: GroupingPanelSurfaceProps["dir"];
  container?: HTMLElement;
}>({ dir: undefined });

const PANEL_CLASS = "adapttable-radix-grouping-panel";
const CONTENT_CLASS = "adapttable-radix-grouping-panel__content";
const PANEL_CSS =
  `.${CONTENT_CLASS}>[data-adapttable-part="grouping-item"],` +
  `.${CONTENT_CLASS}>[data-adapttable-part="grouping-aggregate-controls"]` +
  `{display:inline-flex;align-items:center;flex-wrap:wrap;gap:var(--space-2);min-width:0}` +
  `.${PANEL_CLASS}[data-mobile] .${CONTENT_CLASS}>[data-adapttable-part="grouping-item"]` +
  `{max-width:100%}` +
  `.${PANEL_CLASS}[data-mobile] [data-adapttable-part^="grouping-a"]` +
  `{flex:1 1 160px}`;

function dropZoneWidth(empty: boolean, active: boolean): number {
  if (empty) return 168;
  return active ? 28 : 12;
}

const slots: GroupingPanelSlots = {
  Surface: ({
    children,
    label,
    mobile,
    dir,
    ...rest
  }: GroupingPanelSurfaceProps) => (
    <Card asChild size="1">
      <section
        aria-label={label}
        dir={dir}
        className={PANEL_CLASS}
        data-mobile={mobile || undefined}
        {...rest}
      >
        <Text as="span" size="1" weight="bold" color="gray">
          {label}
        </Text>
        <Flex
          className={CONTENT_CLASS}
          gap="2"
          align="center"
          wrap="wrap"
          mt="2"
          style={{ minWidth: 0 }}
        >
          {children}
        </Flex>
        <style>{PANEL_CSS}</style>
      </section>
    </Card>
  ),
  DropZone: ({
    label,
    empty,
    active,
    dropProps,
    ...rest
  }: GroupingPanelDropZoneProps) => (
    <Box
      role="group"
      aria-label={label}
      data-active={active || undefined}
      {...dropProps}
      {...rest}
      style={{
        alignSelf: "stretch",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minBlockSize: TOUCH_TARGET,
        minInlineSize: dropZoneWidth(empty, active),
        paddingInline: empty ? "var(--space-3)" : undefined,
        border: "1px dashed",
        borderColor: active ? "var(--accent-9)" : "var(--gray-a7)",
        borderRadius: "var(--radius-2)",
        background: active ? "var(--accent-a3)" : "transparent",
        color: active ? "var(--accent-11)" : "var(--gray-11)",
        transition:
          "min-inline-size 120ms ease, border-color 120ms ease, background-color 120ms ease",
      }}
    >
      {empty ? (
        <Text as="span" size="1" align="center">
          {label}
        </Text>
      ) : (
        <span aria-hidden="true" />
      )}
    </Box>
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
    <Card
      asChild
      size="1"
      style={{
        opacity: dragProps["data-grouping-dragging"] ? 0.55 : undefined,
      }}
    >
      <span
        {...rest}
        style={{
          display: "inline-flex",
          alignItems: "center",
          minBlockSize: TOUCH_TARGET,
          overflow: "hidden",
        }}
      >
        <IconButton
          size="2"
          variant="ghost"
          color="gray"
          data-adapttable-part="grouping-chip-handle"
          {...dragProps}
          {...keyboardProps}
          style={{
            minWidth: TOUCH_TARGET,
            minHeight: TOUCH_TARGET,
            borderRadius: 0,
            cursor: "grab",
            touchAction: "none",
          }}
        >
          <GripIcon />
        </IconButton>
        <Text
          as="span"
          size="2"
          weight="medium"
          style={{ paddingInline: "var(--space-1)", whiteSpace: "nowrap" }}
        >
          {level}. {label}
        </Text>
        <IconButton
          size="2"
          variant="ghost"
          color="gray"
          data-adapttable-part="grouping-chip-remove"
          aria-label={removeLabel}
          data-no-group-drag=""
          onClick={onRemove}
          style={{
            minWidth: TOUCH_TARGET,
            minHeight: TOUCH_TARGET,
            borderRadius: 0,
          }}
        >
          {"\u00d7"}
        </IconButton>
      </span>
    </Card>
  ),
  Select: ({
    label,
    value,
    options,
    onChange,
    disabled,
    ...rest
  }: GroupingPanelSelectProps) => {
    const portal = useContext(GroupingPanelPortalContext);
    return (
      <NativeSelect
        size="2"
        aria-label={label}
        value={value}
        placeholder={label}
        disabled={disabled}
        options={options}
        dir={portal.dir}
        container={portal.container}
        width="min(100%, 220px)"
        minHeight={TOUCH_TARGET}
        onValueChange={onChange}
        {...rest}
      />
    );
  },
  RemoveZone: ({
    label,
    active,
    dropProps,
    ...rest
  }: GroupingPanelRemoveZoneProps) => (
    <Box
      role="group"
      aria-label={label}
      data-active={active || undefined}
      {...dropProps}
      {...rest}
      style={{
        alignSelf: "stretch",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minBlockSize: TOUCH_TARGET,
        minInlineSize: 168,
        paddingInline: "var(--space-3)",
        border: "1px dashed",
        borderColor: active ? "var(--red-9)" : "var(--gray-a7)",
        borderRadius: "var(--radius-2)",
        background: active ? "var(--red-a3)" : "transparent",
        color: active ? "var(--red-11)" : "var(--gray-11)",
        transition:
          "border-color 120ms ease, background-color 120ms ease, color 120ms ease",
      }}
    >
      <Text as="span" size="1" weight="medium">
        {label}
      </Text>
    </Box>
  ),
};

/** Adapter-only portal target supplied by the table's fullscreen state. @public */
export interface RadixGroupingPanelProps<TRow> extends Omit<
  GroupingPanelChromeProps<TRow>,
  "slots"
> {
  /** Portal target used while the table is fullscreen. */
  container?: HTMLElement;
}

/** Configure row grouping by drag, keyboard, or Radix-native selects. @public */
export function GroupingPanel<TRow>({
  container,
  ...props
}: Readonly<RadixGroupingPanelProps<TRow>>): ReactNode {
  const portal = useMemo(
    () => ({ dir: props.dir, container }),
    [props.dir, container]
  );
  return (
    <GroupingPanelPortalContext.Provider value={portal}>
      <GroupingPanelChrome {...props} slots={slots} />
    </GroupingPanelPortalContext.Provider>
  );
}
