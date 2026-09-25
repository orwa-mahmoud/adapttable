/**
 * The assistant panel in native HTML — `@adapttable/unstyled/assistant`.
 *
 * Native IS this kit, so the controls are a `button`, a `textarea` and a
 * `dialog`. Every one carries its `data-adapttable-part`, which is what
 * shadcn and any Tailwind app style it through.
 */
import {
  createAdapterTableAssistantFeature,
  type TableAssistantBadgeProps,
  type TableAssistantButtonProps,
  TableAssistantChrome,
  type TableAssistantComposerProps,
  type TableAssistantLanguageChipProps,
  type TableAssistantMenuProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
  type TableAssistantWindowProps,
} from "@adapttable/react/adapter";
import { useEffect, useRef } from "react";

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
}: Readonly<TableAssistantButtonProps>) {
  return (
    <button
      type="button"
      title={tooltip}
      aria-label={label}
      aria-expanded={expanded}
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      // A corner launcher is round and hand-sized; the header's controls are
      // neither. Native elements are this kit, so the shape is set here
      // rather than borrowed from a component.
      {...(part === "assistant-launcher"
        ? {
            style: {
              inlineSize: 56,
              blockSize: 56,
              borderRadius: "50%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            },
          }
        : {})}
      onClick={onClick}
    >
      {icon}
      {iconOnly ? null : (children ?? label)}
    </button>
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
    <textarea
      rows={2}
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
    <span data-adapttable-part={part} data-tone={tone} className={className}>
      {label}
    </span>
  );
}

function AssistantPanel({
  label,
  part,
  className,
  children,
}: Readonly<TableAssistantPanelProps>) {
  return (
    <section
      aria-label={label}
      data-adapttable-part={part}
      className={className}
    >
      {children}
    </section>
  );
}

/**
 * `<dialog>` is the native modal: the browser owns the focus trap, the
 * backdrop and the top layer, so nothing here reimplements them.
 */
function AssistantSheet({
  label,
  part,
  className,
  open,
  onClose,
  dir,
  children,
}: Readonly<TableAssistantSheetProps>) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // jsdom and very old browsers have no showModal; the element still
    // renders, so the panel degrades to a nonmodal one rather than vanishing.
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      open={open}
      aria-label={label}
      dir={dir}
      data-adapttable-part={part}
      className={className}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
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
    // The native element rather than `role="dialog"`: it is nonmodal here —
    // `open` rather than `showModal()` — so the table behind it stays
    // operable, and the UA's own margin is cleared because the chrome
    // positions this itself.
    <dialog
      open
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      style={{ margin: 0, padding: 0, border: 0, ...style }}
    >
      {children}
    </dialog>
  );
}

/**
 * Ask this table a question, in native HTML.
 *
 * @public
 */
/**
 * The dictation language chooser, in native HTML.
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
    <select
      aria-label={label}
      data-adapttable-part={part}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * The examples menu, in this kit's own vocabulary: native HTML.
 *
 * `<details>` is the platform's disclosure, and a `menu` list inside it is
 * the platform's list of commands — no portal, no positioning code, and the
 * keyboard and dismissal the browser already implements. A styled kit hangs
 * its own popup here; native IS the kit here, so this is the real thing
 * rather than a stand-in for one.
 */
function AssistantMenu({
  label,
  part,
  className,
  icon,
  disabled,
  items,
  onSelect,
  maxHeight,
}: Readonly<TableAssistantMenuProps>) {
  const close = (event: { currentTarget: HTMLElement }): void => {
    event.currentTarget.closest("details")?.removeAttribute("open");
  };
  return (
    <details data-adapttable-part="assistant-examples">
      <summary
        aria-label={label}
        title={label}
        data-adapttable-part={part}
        className={className}
        {...(disabled ? { "aria-disabled": true } : {})}
      >
        {icon}
      </summary>
      <menu
        data-adapttable-part="assistant-examples-list"
        style={{ maxHeight, overflowY: "auto" }}
      >
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              data-adapttable-part={item.part}
              onClick={(event) => {
                close(event);
                onSelect(item.id);
              }}
            >
              {item.icon}
              <span>{item.title}</span>
              {item.description ? <small>{item.description}</small> : null}
            </button>
          </li>
        ))}
      </menu>
    </details>
  );
}

export function TableAssistant(props: Readonly<TableAssistantProps>) {
  return (
    <TableAssistantChrome
      // The colour the conversation is drawn in. The browser's own accent — native controls are this kit, so the colour the platform picked is the one they are drawn in.
      // Before the spread, so a host that names its own still wins.
      accent="AccentColor"
      {...props}
      slots={{
        Panel: AssistantPanel,
        Sheet: AssistantSheet,
        Button: AssistantButton,
        Composer: AssistantInput,
        Badge: AssistantBadge,
        Window: AssistantWindow,
        Menu: AssistantMenu,
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
