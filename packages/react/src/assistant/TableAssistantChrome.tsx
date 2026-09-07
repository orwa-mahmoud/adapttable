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
  useSyncExternalStore,
} from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantIcon, CloseIcon, SettingsIcon } from "./assistantIcons";
import {
  AssistantEmpty,
  AssistantMessage,
  AssistantSuggestions,
} from "./AssistantMessages";
import {
  FLOATING_MIN_WIDTH,
  floatingFits,
  floatingStyle,
  launcherStyle,
  type TableAssistantBoundary,
} from "./assistantPlacement";
import type { TableAssistantSlots } from "./assistantSlots";
import type {
  TableAssistantMessageView,
  TableAssistantView,
} from "./assistantView";

export type { TableAssistantBoundary } from "./assistantPlacement";

/** Whether the panel is mid-turn — re-exported for a host's own chrome. */
export { assistantIsBusy } from "./assistantView";
import { useConversationScroll } from "./useConversationScroll";

/**
 * Which surface the conversation takes.
 *
 * - `floating` — a nonmodal window over the page, anchored bottom
 *   inline-end. The table keeps its full width and stays operable. Below the
 *   width where that stops being true it becomes the kit's own modal sheet.
 * - `panel` — an in-flow surface the host places itself.
 * - `sheet` — the kit's modal sheet at every width.
 *
 * @public
 */
export type TableAssistantPresentation = "panel" | "sheet" | "floating";

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
  /**
   * Where a floating window is placed: the viewport, or a container of the
   * host's own. Ignored by the other presentations.
   */
  readonly boundary?: TableAssistantBoundary;
  /**
   * One sentence under the empty conversation's heading, for what the host
   * alone knows — that the examples are scripted until a backend is
   * connected, say.
   */
  readonly note?: string;
  /**
   * An offer to put at the end of one reply.
   *
   * The panel knows a message arrived; only the host knows whether it was an
   * answer or a wall. A scripted demo that cannot understand a question can
   * hand back the way past it — "connect a backend" — instead of leaving the
   * reader to find it. Return nothing for messages that need no offer.
   */
  readonly messageAction?: (
    message: TableAssistantMessageView
  ) => { readonly label: string; readonly onRun: () => void } | undefined;
}

/** Props for {@link TableAssistantChrome}. @public */
export interface TableAssistantChromeProps extends TableAssistantProps {
  /** The kit's components for each part. */
  readonly slots: TableAssistantSlots;
}

/**
 * Whether a floating window still fits.
 *
 * Subscribed rather than measured once: a reader who rotates a tablet or
 * drags a window narrower gets the sheet, and the conversation carries over
 * because only the surface changes — the controller above it never remounts.
 */
function useFloatingFits(): boolean {
  const subscribe = useCallback((notify: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    // `matchMedia` is absent in jsdom, and the minimal stubs test setups and
    // embedded webviews install often return nothing usable. Resize is the
    // coarser signal but it is always there, so the window still becomes a
    // sheet on a narrow viewport rather than throwing on the way.
    const query =
      typeof window.matchMedia === "function"
        ? window.matchMedia(`(min-width: ${String(FLOATING_MIN_WIDTH)}px)`)
        : undefined;
    if (typeof query?.addEventListener !== "function") {
      window.addEventListener("resize", notify);
      return () => {
        window.removeEventListener("resize", notify);
      };
    }
    query.addEventListener("change", notify);
    return () => {
      query.removeEventListener("change", notify);
    };
  }, []);
  return useSyncExternalStore(
    subscribe,
    () =>
      typeof window === "undefined" ? true : floatingFits(window.innerWidth),
    () => true
  );
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5em",
        minHeight: "3.5em",
        paddingInline: "0.25em",
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        data-adapttable-part="assistant-mark"
        style={{ display: "flex", fontSize: "1.15em", opacity: 0.8 }}
      >
        <AssistantIcon />
      </span>
      <span
        data-adapttable-part="assistant-title"
        style={{
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {labels?.assistantTitle ?? "Table assistant"}
      </span>
      <Badge
        label={connection}
        part="assistant-connection"
        tone={badgeTone(status)}
      />
      {/* The controls sit together at the trailing edge, as icons: the header
          is one row at 400px wide, and a spelled-out "Assistant settings"
          across it is what pushed the title onto a second line. */}
      <span
        style={{
          marginInlineStart: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.15em",
        }}
      >
        {onSettings ? (
          <Button
            label={labels?.assistantSettings ?? "Assistant settings"}
            tooltip={labels?.assistantSettings ?? "Assistant settings"}
            part="assistant-settings"
            variant="subtle"
            icon={<SettingsIcon />}
            iconOnly
            onClick={onSettings}
          />
        ) : null}
        <Button
          label={labels?.assistantClose ?? "Close"}
          tooltip={labels?.assistantClose ?? "Close"}
          part="assistant-close"
          variant="subtle"
          icon={<CloseIcon />}
          iconOnly
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
  note,
  messageAction,
}: {
  readonly assistant: TableAssistantView;
  readonly labels: TableLabels | undefined;
  readonly slots: TableAssistantSlots;
  readonly note?: string;
  readonly messageAction?: TableAssistantProps["messageAction"];
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
            note={note}
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
                action={messageAction?.(message)}
              />
            ))}
          </ul>
        )}
        {/* A scripted demo is unusable if the one click that starts it also
            hides every other example, so they stay within reach. */}
        {assistant.messages.length > 0 && assistant.suggestions.length > 0 ? (
          <details data-adapttable-part="assistant-examples">
            <summary data-adapttable-part="assistant-examples-summary">
              {labels?.assistantExamples ?? "Examples"}
            </summary>
            <AssistantSuggestions
              slots={slots}
              labels={labels}
              suggestions={assistant.suggestions}
              more={assistant.moreSuggestions ?? []}
              onRun={run}
              part="assistant-examples-list"
            />
          </details>
        ) : null}
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
  boundary = "viewport",
  note,
  messageAction,
  slots,
}: Readonly<TableAssistantChromeProps>): ReactElement {
  const wide = useFloatingFits();
  const launcherRef = useRef<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const Button = slots.Button;
  const Panel = slots.Panel;
  const Sheet = slots.Sheet;
  const Window = slots.Window;

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

  // A floating request that cannot fit becomes the kit's own modal sheet.
  // The switch is deliberate and only ever applies to `floating`: an explicit
  // `panel` stays a panel, because silently modalizing what a host asked to
  // place itself is worse than a narrow one.
  const resolved =
    presentation === "floating" && !wide ? "sheet" : presentation;
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
      <Body
        assistant={assistant}
        labels={labels}
        slots={slots}
        note={note}
        messageAction={messageAction}
      />
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
        busy={assistant.busy}
        draft={assistant.draft}
        setDraft={assistant.setDraft}
        onSend={send}
        onStop={assistant.stop}
      />
      {resolved === "sheet" ? (
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
  if (open && resolved === "floating") {
    surface = (
      <Window
        label={title}
        part="assistant-window"
        className={className}
        style={floatingStyle(boundary)}
      >
        {contents}
      </Window>
    );
  } else if (open && resolved === "sheet") {
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
      <span
        ref={launcherRef}
        data-adapttable-part="assistant-launcher-anchor"
        style={
          resolved === "floating" || resolved === "sheet"
            ? launcherStyle(boundary)
            : { display: "contents" }
        }
      >
        {launcher && !open ? (
          <Button
            label={labels?.assistantOpen ?? "Ask AI"}
            part="assistant-launcher"
            variant="primary"
            icon={<AssistantIcon />}
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
