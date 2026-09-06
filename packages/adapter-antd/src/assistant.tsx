/**
 * The assistant panel in Ant Design — `@adapttable/antd/assistant`.
 */
import {
  createAdapterTableAssistantFeature,
  type TableAssistantBadgeProps,
  type TableAssistantButtonProps,
  TableAssistantChrome,
  type TableAssistantComposerProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
} from "@adapttable/react/adapter";
import { Button, Card, Drawer, Input, Tag } from "antd";

const TAG_COLOR: Record<string, string | undefined> = {
  neutral: undefined,
  busy: "processing",
  warning: "warning",
  danger: "error",
};

/** How this kit spells the three prominences the chrome asks for. */
const KIT_VARIANT = {
  primary: "primary",
  secondary: "default",
  subtle: "text",
} as const;

function AssistantButton({
  label,
  part,
  className,
  onClick,
  disabled,
  children,
  expanded,
  variant = "secondary",
}: Readonly<TableAssistantButtonProps>) {
  return (
    <Button
      htmlType="button"
      size="small"
      type={KIT_VARIANT[variant]}
      aria-label={label}
      aria-expanded={expanded}
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children ?? label}
    </Button>
  );
}

function AssistantInput({
  label,
  placeholder,
  part,
  className,
  value,
  disabled,
  onChange,
  onKeyDown,
}: Readonly<TableAssistantComposerProps>) {
  return (
    <Input.TextArea
      autoSize={{ minRows: 1, maxRows: 6 }}
      aria-label={label}
      placeholder={placeholder}
      data-adapttable-part={part}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      onKeyDown={onKeyDown}
    />
  );
}

function AssistantBadge({
  label,
  part,
  className,
  tone,
}: Readonly<TableAssistantBadgeProps>) {
  return (
    <Tag
      color={TAG_COLOR[tone]}
      data-adapttable-part={part}
      data-tone={tone}
      className={className}
    >
      {label}
    </Tag>
  );
}

function AssistantPanel({
  label,
  part,
  className,
  children,
}: Readonly<TableAssistantPanelProps>) {
  return (
    <Card
      size="small"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      styles={{
        body: {
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        },
      }}
      style={{ height: "100%" }}
    >
      {children}
    </Card>
  );
}

function AssistantSheet({
  label,
  part,
  className,
  open,
  onClose,
  children,
}: Readonly<TableAssistantSheetProps>) {
  return (
    <Drawer
      placement="bottom"
      open={open}
      onClose={onClose}
      title={label}
      data-adapttable-part={part}
      // antd forwards `data-*` to the content wrapper but `className` to the
      // drawer root, which would put the host's class on a different element
      // from the part it names. `classNames.wrapper` lands them together.
      classNames={{ wrapper: className }}
      styles={{
        wrapper: { height: "90%" },
        body: {
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        },
      }}
    >
      {children}
    </Drawer>
  );
}

/**
 * Ask this table a question, in Ant Design.
 *
 * @public
 */
export function TableAssistant(props: Readonly<TableAssistantProps>) {
  return (
    <TableAssistantChrome
      {...props}
      slots={{
        Panel: AssistantPanel,
        Sheet: AssistantSheet,
        Button: AssistantButton,
        Composer: AssistantInput,
        Badge: AssistantBadge,
      }}
    />
  );
}

/**
 * Bind this kit's assistant panel to the assistant slot.
 *
 * @public
 */
export function tableAssistant() {
  return createAdapterTableAssistantFeature(TableAssistant);
}
