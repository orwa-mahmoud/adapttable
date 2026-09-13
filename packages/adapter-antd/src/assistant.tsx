/**
 * The assistant panel in Ant Design — `@adapttable/antd/assistant`.
 */
import {
  createAdapterTableAssistantFeature,
  type TableAssistantBadgeProps,
  type TableAssistantButtonProps,
  TableAssistantChrome,
  type TableAssistantComposerProps,
  type TableAssistantLanguageChipProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
  type TableAssistantSuggestionProps,
  type TableAssistantWindowProps,
} from "@adapttable/react/adapter";
import {
  Button,
  Card,
  Drawer,
  Input,
  Select,
  Tag,
  Tooltip,
  Typography,
} from "antd";

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
  icon,
  iconOnly,
  tooltip,
  variant = "secondary",
}: Readonly<TableAssistantButtonProps>) {
  if (iconOnly) {
    const control = (
      <Button
        type="text"
        size="small"
        icon={icon}
        aria-label={label}
        aria-expanded={expanded}
        data-adapttable-part={part}
        className={className}
        disabled={disabled}
        onClick={onClick}
      />
    );
    return tooltip ? <Tooltip title={tooltip}>{control}</Tooltip> : control;
  }
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
  dir,
  children,
}: Readonly<TableAssistantSheetProps>) {
  return (
    <Drawer
      placement="bottom"
      open={open}
      onClose={onClose}
      title={label}
      // antd's Drawer takes no `dir` of its own, and its own direction comes
      // from ConfigProvider — which a host may not have set for this subtree.
      // `rootStyle` reaches the portalled root, which is the element that has
      // to carry it.
      rootStyle={dir ? { direction: dir } : undefined}
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

function AssistantWindow({
  label,
  part,
  className,
  style,
  children,
}: Readonly<TableAssistantWindowProps>) {
  return (
    <Card
      size="small"
      role="dialog"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={{ ...style, boxShadow: "var(--ant-box-shadow-secondary)" }}
      styles={{
        body: {
          height: "100%",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        },
      }}
    >
      {children}
    </Card>
  );
}

function AssistantSuggestion({
  title,
  description,
  icon,
  part,
  className,
  onClick,
  disabled,
}: Readonly<TableAssistantSuggestionProps>) {
  return (
    <button
      type="button"
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex",
        gap: 8,
        alignItems: "flex-start",
        padding: 8,
        borderRadius: "var(--ant-border-radius)",
        border: "1px solid var(--ant-color-border)",
        background: "var(--ant-color-bg-container)",
        color: "inherit",
        font: "inherit",
        textAlign: "start",
        width: "100%",
        cursor: "pointer",
      }}
    >
      <Typography.Text
        type="secondary"
        style={{ display: "flex", marginTop: 2 }}
      >
        {icon}
      </Typography.Text>
      <span>
        <Typography.Text
          strong
          style={{ display: "block" }}
          data-adapttable-part="assistant-suggestion-title"
        >
          {title}
        </Typography.Text>
        {description ? (
          <Typography.Text
            type="secondary"
            style={{ display: "block", fontSize: 12 }}
            data-adapttable-part="assistant-suggestion-description"
          >
            {description}
          </Typography.Text>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Ask this table a question, in Ant Design.
 *
 * @public
 */
/**
 * The dictation language chooser, in antd.
 *
 * Drawn only beside a mic that is already there, and only when more than one
 * language is offered — the chrome decides both. This is the kit's own
 * chooser, not a button with a list bolted on.
 */
function AssistantLanguageChip({
  label,
  value,
  options,
  part,
  className,
  onChange,
  disabled,
}: Readonly<TableAssistantLanguageChipProps>) {
  return (
    <Select
      size="small"
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={{ minWidth: "7.5rem" }}
      value={value}
      disabled={disabled}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      onChange={onChange}
    />
  );
}

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
        Window: AssistantWindow,
        Suggestion: AssistantSuggestion,
        LanguageChip: AssistantLanguageChip,
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
