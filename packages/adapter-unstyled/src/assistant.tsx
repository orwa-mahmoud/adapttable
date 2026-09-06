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
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
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
}: Readonly<TableAssistantButtonProps>) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      data-adapttable-part={part}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children ?? label}
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

/**
 * Ask this table a question, in native HTML.
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
