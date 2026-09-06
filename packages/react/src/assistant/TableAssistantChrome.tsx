/**
 * The assistant panel: structure, keyboard, part names, announcements.
 *
 * Nothing a reader can click is drawn here — every control is a kit slot, so
 * a Mantine table's assistant is Mantine and an antd table's is antd. What
 * this file owns is the behaviour that must be identical everywhere: which
 * surface a viewport gets, where focus goes, what Escape does, and what a
 * screen reader is told.
 *
 * The panel is deliberately NOT inside the table. It sits beside it, so it
 * never covers the cells the reader is asking about; on a viewport too narrow
 * for both, it becomes the kit's own modal sheet instead of a panel squeezed
 * to nothing.
 */
import type { TableLabels } from "@adapttable/core";
import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantEmpty, AssistantMessage } from "./AssistantMessages";
import type { TableAssistantSlots } from "./assistantSlots";
import { assistantIsBusy, type TableAssistantView } from "./assistantView";
import { useConversationScroll } from "./useConversationScroll";

/** Which surface the panel takes. @public */
export type TableAssistantPresentation = "panel" | "sheet";

/**
 * Props for an adapter `TableAssistant` — no slots on the public API.
 *
 * @public
 */
export interface TableAssistantProps {
  /** The live conversation. */
  readonly assistant: TableAssistantView;
  /** Whether the panel is showing. */
  readonly open: boolean;
  /** Asked to open or close. */
  readonly onOpenChange: (open: boolean) => void;
  /**
   * Nonmodal panel beside the table, or a modal sheet over it.
   *
   * A host that knows its own layout sets this; the default is a panel,
   * because a modal that was not asked for is worse than a narrow one.
   */
  readonly presentation?: TableAssistantPresentation;
  /** Labels; falls back to the built-in English. */
  readonly labels?: TableLabels;
  /** Class for the surface. */
  readonly className?: string;
  /** Hide the floating launcher when the host supplies its own trigger. */
  readonly launcher?: boolean;
  /** Opens the host's own settings. Omit and no settings control is drawn. */
  readonly onSettings?: () => void;
}

/** Props for {@link TableAssistantChrome}. @public */
export interface TableAssistantChromeProps extends TableAssistantProps {
  /** The kit's components for each part. */
  readonly slots: TableAssistantSlots;
}

function badgeTone(status: string): "neutral" | "busy" | "warning" | "danger" {
  if (status === "sending" || status === "connecting") return "busy";
  if (status === "awaiting-approval") return "warning";
  if (status === "error" || status === "disconnected") return "danger";
  return "neutral";
}

function Header({
  slots,
  labels,
  status,
  onClose,
  onSettings,
}: {
  readonly slots: TableAssistantSlots;
  readonly labels: TableLabels | undefined;
  readonly status: string;
  readonly onClose: () => void;
  readonly onSettings?: () => void;
}): ReactElement {
  const Badge = slots.Badge;
  const Button = slots.Button;
  const connection =
    labels?.assistantConnection?.(status) ?? status.replace("-", " ");
  return (
    <header
      data-adapttable-part="assistant-header"
      style={{ display: "flex", alignItems: "center", gap: "0.5em" }}
    >
      <span data-adapttable-part="assistant-title">
        {labels?.assistantTitle ?? "Table assistant"}
      </span>
      <Badge
        label={connection}
        part="assistant-connection"
        tone={badgeTone(status)}
      />
      <span style={{ marginInlineStart: "auto", display: "flex" }}>
        {onSettings ? (
          <Button
            label={labels?.assistantSettings ?? "Assistant settings"}
            part="assistant-settings"
            variant="subtle"
            onClick={onSettings}
          />
        ) : null}
        <Button
          label={labels?.assistantClose ?? "Close"}
          part="assistant-close"
          variant="subtle"
          onClick={onClose}
        />
      </span>
    </header>
  );
}

function Body({
  assistant,
  labels,
  slots,
}: {
  readonly assistant: TableAssistantView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
}): ReactElement {
  const scroll = useConversationScroll(assistant.messages.length);
  const Button = slots.Button;
  const run = (id: string): void => {
    void assistant.runSuggestion(id);
  };
  return (
    <div
      data-adapttable-part="assistant-conversation-region"
      style={{ position: "relative", flex: 1, minHeight: 0 }}
    >
      <div
        ref={scroll.ref}
        onScroll={scroll.onScroll}
        data-adapttable-part="assistant-conversation"
        style={{ height: "100%", overflowY: "auto" }}
      >
        {assistant.messages.length === 0 ? (
          <AssistantEmpty
            labels={labels}
            slots={slots}
            suggestions={assistant.suggestions}
            more={assistant.moreSuggestions ?? []}
            onRun={run}
          />
        ) : (
          <ul
            data-adapttable-part="assistant-messages"
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.75em",
            }}
          >
            {assistant.messages.map((message) => (
              <AssistantMessage
                key={message.id}
                message={message}
                labels={labels}
                slots={slots}
              />
            ))}
          </ul>
        )}
      </div>
      {scroll.hasUnseen ? (
        <span
          style={{
            position: "absolute",
            insetBlockEnd: "0.5em",
            insetInlineStart: "50%",
          }}
        >
          <Button
            label={labels?.assistantNewMessages ?? "New messages"}
            part="assistant-jump-latest"
            variant="secondary"
            onClick={scroll.jumpToLatest}
          />
        </span>
      ) : null}
    </div>
  );
}

/**
 * The assistant panel.
 *
 * @param props - See {@link TableAssistantChromeProps}.
 * @returns The launcher, the panel, or both.
 *
 * @public
 */
export function TableAssistantChrome({
  assistant,
  open,
  onOpenChange,
  presentation = "panel",
  labels,
  className,
  launcher = true,
  onSettings,
  slots,
}: Readonly<TableAssistantChromeProps>): ReactElement {
  const launcherRef = useRef<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const Button = slots.Button;
  const Panel = slots.Panel;
  const Sheet = slots.Sheet;

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Closing returns the reader where they were. Without this, focus falls to
  // the document and the next Tab starts from the top of the page.
  useEffect(() => {
    if (open) return;
    const trigger = launcherRef.current?.querySelector<HTMLElement>(
      '[data-adapttable-part="assistant-launcher"]'
    );
    trigger?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = surfaceRef.current;
    if (!root) return;
    const onKey = (event: KeyboardEvent): void => {
      // Only the innermost overlay answers Escape: a kit popover open inside
      // the panel handles its own and stops this from seeing it.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      close();
    };
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const title = labels?.assistantTitle ?? "Table assistant";
  const send = (): void => {
    void assistant.send();
  };

  const contents = (
    <div
      ref={surfaceRef}
      data-adapttable-part="assistant-surface"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5em",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Header
        slots={slots}
        labels={labels}
        status={assistant.status}
        onClose={close}
        onSettings={onSettings}
      />
      {/* Status only — re-reading the transcript on every token is what makes
          a chat unusable with a screen reader. */}
      <LiveRegion part="assistant-status" statusRole>
        {labels?.assistantConnection?.(assistant.status) ?? assistant.status}
      </LiveRegion>
      <Body assistant={assistant} labels={labels} slots={slots} />
      {assistant.error ? (
        <p data-adapttable-part="assistant-error" role="alert">
          {assistant.error}
        </p>
      ) : null}
      {assistant.status === "disconnected" ? (
        <p data-adapttable-part="assistant-unavailable">
          {labels?.assistantUnavailable ?? "The assistant is not connected."}
        </p>
      ) : null}
      <AssistantComposer
        slots={slots}
        labels={labels}
        status={assistant.status}
        draft={assistant.draft}
        setDraft={assistant.setDraft}
        onSend={send}
        onStop={assistant.stop}
      />
      {presentation === "sheet" ? (
        <Button
          label={labels?.assistantBackToTable ?? "Back to table"}
          part="assistant-back"
          variant="subtle"
          onClick={close}
        />
      ) : null}
    </div>
  );

  let surface: ReactNode = null;
  if (open && presentation === "sheet") {
    surface = (
      <Sheet
        label={title}
        part="assistant-sheet"
        className={className}
        open
        onClose={close}
      >
        {contents}
      </Sheet>
    );
  } else if (open) {
    surface = (
      <Panel label={title} part="assistant-panel" className={className}>
        {contents}
      </Panel>
    );
  }

  return (
    <>
      <span ref={launcherRef} style={{ display: "contents" }}>
        {launcher && !open ? (
          <Button
            label={labels?.assistantOpen ?? "Ask AI"}
            part="assistant-launcher"
            variant="primary"
            onClick={() => {
              onOpenChange(true);
            }}
          />
        ) : null}
      </span>
      {surface}
    </>
  );
}

/** Whether the panel is mid-turn — exported for a host's own chrome. @public */
export { assistantIsBusy };
