/**
 * The demo's own settings, in a drawer.
 *
 * Everything here is scaffolding around the table rather than part of it, so
 * it stays in the page's language and out of the table's direction. The
 * sections are the questions a reader actually has — what the table can do,
 * which actions need a human, where they are asked, and what saving means —
 * each with a line of help, because a switch whose consequence is invisible
 * is a switch nobody touches.
 */
import type { ApprovalPresentation } from "@adapttable/core";
import { type ReactNode, useEffect, useRef } from "react";

import { Segmented } from "./kitDemos";
import {
  APPROVAL_CHOICES,
  type ApprovalOverride,
  type DemoActionApproval,
  type DemoContextProfile,
  type DemoEditingMode,
  EDITING_MODES,
  OPTIONS_TEXT,
  PRESENTATIONS,
  PROFILES,
  SAVING,
} from "./shared/aiDemo";

/** One feature switch. */
export interface DemoFeature {
  readonly key: string;
  readonly label: string;
  readonly help: string;
  readonly on: boolean;
  readonly onChange: () => void;
}

/** One write whose approval the reader can override, with its control. */
export interface DemoActionApprovalControl extends DemoActionApproval {
  readonly onChange: (policy: ApprovalOverride | "inherit") => void;
}

/** One capability the reader can take away from the agent. */
export interface DemoExclusion {
  /** Capability key — stable, and never shown as the label. */
  readonly key: string;
  /** Reader-facing name. */
  readonly label: string;
  /** What taking it away costs, in one line. */
  readonly help: string;
  /** True when the agent may still use it. */
  readonly offered: boolean;
  readonly onChange: () => void;
}

/** Props for {@link AiDemoOptions}. */
export interface AiDemoOptionsProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly editingMode: DemoEditingMode;
  readonly onEditingMode: (next: DemoEditingMode) => void;
  readonly features: readonly DemoFeature[];
  readonly actions: readonly DemoActionApprovalControl[];
  readonly presentation: ApprovalPresentation;
  readonly onPresentation: (next: ApprovalPresentation) => void;
  readonly commit: "stage" | "immediate";
  readonly onCommit: (next: "stage" | "immediate") => void;
  readonly rtl: boolean;
  readonly onRtl: (next: boolean) => void;
  readonly onReset: () => void;
  /** How much of the contract each turn carries. */
  readonly contextProfile: DemoContextProfile;
  readonly onContextProfile: (next: DemoContextProfile) => void;
  /** Capabilities the reader can take away from the agent. */
  readonly exclusions: readonly DemoExclusion[];
  /** Whether the table registers itself as browser tools. */
  readonly webmcp: boolean;
  readonly onWebmcp: (next: boolean) => void;
  /** Whether this browser has the API at all. */
  readonly webmcpAvailable: boolean;
}

function Section({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="ai-opts__section">
      <h4 className="ai-opts__heading">{title}</h4>
      {children}
    </section>
  );
}

/** The demo's settings drawer. */
export function AiDemoOptions({
  open,
  onClose,
  editingMode,
  onEditingMode,
  features,
  actions,
  presentation,
  onPresentation,
  commit,
  onCommit,
  rtl,
  onRtl,
  onReset,
  contextProfile,
  onContextProfile,
  exclusions,
  webmcp,
  onWebmcp,
  webmcpAvailable,
}: Readonly<AiDemoOptionsProps>) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const view = dialog.ownerDocument.defaultView;
      const top = view?.scrollY;
      const left = view?.scrollX;
      dialog.showModal();
      // Stop a pending page scroll before the modal holds the background.
      view?.scrollTo({ top, left, behavior: "instant" });
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Dismissal from the dark around the panel. The backdrop is painted by the
  // dialog itself, so a click out there reaches the dialog rather than
  // anything behind it and the browser does nothing with it; reading the click
  // against the panel's own box tells the two apart. A listener rather than a
  // handler on the element: the backdrop is a surface, not a control, and
  // Escape and the close button are what a keyboard uses.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const dismiss = (event: MouseEvent): void => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      const onPanel =
        event.clientX >= box.left &&
        event.clientX <= box.right &&
        event.clientY >= box.top &&
        event.clientY <= box.bottom;
      if (!onPanel) onClose();
    };
    dialog.addEventListener("click", dismiss);
    return () => {
      dialog.removeEventListener("click", dismiss);
    };
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className="ai-opts"
      aria-label={OPTIONS_TEXT.title}
      data-testid="ai-demo-options-drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="ai-opts__head">
        <h3>{OPTIONS_TEXT.title}</h3>
        <button
          type="button"
          className="ai-opts__close"
          aria-label={OPTIONS_TEXT.close}
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      <div className="ai-opts__body">
        <Section title={OPTIONS_TEXT.features}>
          <p className="ai-opts__help">{OPTIONS_TEXT.featuresHelp}</p>
          <div className="ai-opts__row ai-opts__row--mode">
            <span>
              <span className="ai-opts__label">{OPTIONS_TEXT.editingMode}</span>
              <span className="ai-opts__hint">
                {OPTIONS_TEXT.editingModeHelp}
              </span>
            </span>
            <Segmented
              label={OPTIONS_TEXT.editingMode}
              value={editingMode}
              onChange={onEditingMode}
              options={EDITING_MODES.map((mode) => ({
                ...mode,
                testId: `ai-editing-${mode.value}`,
              }))}
            />
          </div>
          {features.map((feature) => (
            <label key={feature.key} className="ai-opts__row">
              <input
                type="checkbox"
                aria-label={feature.label}
                checked={feature.on}
                data-testid={`ai-toggle-${feature.key}`}
                onChange={feature.onChange}
              />
              <span>
                <span className="ai-opts__label">{feature.label}</span>
                <span className="ai-opts__hint">{feature.help}</span>
              </span>
            </label>
          ))}
        </Section>

        <Section title={OPTIONS_TEXT.approvals}>
          <p className="ai-opts__help">{OPTIONS_TEXT.approvalsHelp}</p>
          {actions.length === 0 ? (
            <p className="ai-opts__hint">{OPTIONS_TEXT.noApprovals}</p>
          ) : (
            actions.map((action) => (
              <div key={action.key} className="ai-opts__row">
                <span>
                  <span className="ai-opts__label">{action.label}</span>
                  <span className="ai-opts__hint">{action.description}</span>
                </span>
                <span className="ai-opts__choices">
                  <select
                    aria-label={OPTIONS_TEXT.approvalFor(action.label)}
                    data-testid={`ai-approval-${action.key}`}
                    value={action.inherited ? "inherit" : action.policy}
                    onChange={(event) => {
                      const next = APPROVAL_CHOICES.find(
                        (choice) => choice.value === event.target.value
                      );
                      if (next) action.onChange(next.value);
                    }}
                  >
                    {APPROVAL_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </span>
              </div>
            ))
          )}
        </Section>

        <Section title={OPTIONS_TEXT.location}>
          <p className="ai-opts__help">{OPTIONS_TEXT.locationHelp}</p>
          {PRESENTATIONS.map((option) => (
            <label key={option.value} className="ai-opts__row">
              <input
                type="radio"
                name="ai-approval-location"
                aria-label={option.label}
                value={option.value}
                checked={presentation === option.value}
                data-testid={`ai-presentation-${option.value}`}
                onChange={() => {
                  onPresentation(option.value);
                }}
              />
              <span>
                <span className="ai-opts__label">{option.label}</span>
                <span className="ai-opts__hint">{option.help}</span>
              </span>
            </label>
          ))}
        </Section>

        <Section title={OPTIONS_TEXT.saving}>
          {SAVING.map((option) => (
            <label key={option.value} className="ai-opts__row">
              <input
                type="radio"
                name="ai-saving"
                aria-label={option.label}
                value={option.value}
                checked={commit === option.value}
                disabled={option.value === "stage" && editingMode !== "batch"}
                data-testid={`ai-commit-${option.value}`}
                onChange={() => {
                  onCommit(option.value);
                }}
              />
              <span>
                <span className="ai-opts__label">{option.label}</span>
                <span className="ai-opts__hint">{option.help}</span>
              </span>
            </label>
          ))}
        </Section>

        <Section title={OPTIONS_TEXT.told}>
          <p className="ai-opts__help">{OPTIONS_TEXT.toldHelp}</p>
          {PROFILES.map((option) => (
            <label key={option.value} className="ai-opts__row">
              <input
                type="radio"
                name="ai-context-profile"
                aria-label={option.label}
                value={option.value}
                checked={contextProfile === option.value}
                data-testid={`ai-profile-${option.value}`}
                onChange={() => {
                  onContextProfile(option.value);
                }}
              />
              <span>
                <span className="ai-opts__label">{option.label}</span>
                <span className="ai-opts__hint">{option.help}</span>
              </span>
            </label>
          ))}
        </Section>

        <Section title={OPTIONS_TEXT.may}>
          <p className="ai-opts__help">{OPTIONS_TEXT.mayHelp}</p>
          {exclusions.map((exclusion) => (
            <label key={exclusion.key} className="ai-opts__row">
              <input
                type="checkbox"
                aria-label={exclusion.label}
                checked={exclusion.offered}
                data-testid={`ai-offer-${exclusion.key}`}
                onChange={exclusion.onChange}
              />
              <span>
                <span className="ai-opts__label">{exclusion.label}</span>
                <span className="ai-opts__hint">{exclusion.help}</span>
              </span>
            </label>
          ))}
        </Section>

        <Section title={OPTIONS_TEXT.browser}>
          <label className="ai-opts__row">
            <input
              type="checkbox"
              aria-label={OPTIONS_TEXT.webmcp}
              checked={webmcp && webmcpAvailable}
              disabled={!webmcpAvailable}
              data-testid="ai-toggle-webmcp"
              onChange={() => {
                onWebmcp(!webmcp);
              }}
            />
            <span>
              <span className="ai-opts__label">{OPTIONS_TEXT.webmcp}</span>
              <span className="ai-opts__hint">
                {webmcpAvailable
                  ? OPTIONS_TEXT.webmcpHelp
                  : OPTIONS_TEXT.webmcpMissing}
              </span>
            </span>
          </label>
        </Section>

        <Section title={OPTIONS_TEXT.direction}>
          <label className="ai-opts__row">
            <input
              type="checkbox"
              aria-label={OPTIONS_TEXT.rtl}
              checked={rtl}
              data-testid="ai-toggle-rtl"
              onChange={() => {
                onRtl(!rtl);
              }}
            />
            <span>
              <span className="ai-opts__label">{OPTIONS_TEXT.rtl}</span>
              <span className="ai-opts__hint">{OPTIONS_TEXT.rtlHelp}</span>
            </span>
          </label>
        </Section>
      </div>

      <footer className="ai-opts__foot">
        <button
          type="button"
          className="ai-opts__reset"
          data-testid="ai-reset"
          onClick={onReset}
        >
          {OPTIONS_TEXT.reset}
        </button>
        {/* Clicking outside closes the panel and Escape closes it, and
            neither is something a reader can see. Done is where a reader
            looks for the way out of a settings panel. */}
        <button
          type="button"
          className="ai-opts__done"
          data-testid="ai-demo-options-done"
          onClick={onClose}
        >
          {OPTIONS_TEXT.done}
        </button>
      </footer>
    </dialog>
  );
}
