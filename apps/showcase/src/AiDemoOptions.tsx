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

export type DemoEditingMode = "off" | "cell" | "row" | "batch";

/** One feature switch. */
export interface DemoFeature {
  readonly key: string;
  readonly label: string;
  readonly help: string;
  readonly on: boolean;
  readonly onChange: () => void;
}

/** One action whose approval the reader can override. */
export interface DemoActionApproval {
  /** Capability key — stable, and never shown as the label. */
  readonly key: string;
  /** Reader-facing name, from the capability's own presentation. */
  readonly label: string;
  /** What it resolves to right now. */
  readonly policy: "required" | "automatic";
  /** True when the table's shared default is what produced that. */
  readonly inherited: boolean;
  readonly onChange: (policy: "required" | "automatic" | "inherit") => void;
}

/** Props for {@link AiDemoOptions}. */
export interface AiDemoOptionsProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly editingMode: DemoEditingMode;
  readonly onEditingMode: (next: DemoEditingMode) => void;
  readonly features: readonly DemoFeature[];
  readonly actions: readonly DemoActionApproval[];
  readonly presentation: ApprovalPresentation;
  readonly onPresentation: (next: ApprovalPresentation) => void;
  readonly commit: "stage" | "immediate";
  readonly onCommit: (next: "stage" | "immediate") => void;
  readonly rtl: boolean;
  readonly onRtl: (next: boolean) => void;
  readonly onReset: () => void;
}

const PRESENTATIONS: readonly {
  readonly value: ApprovalPresentation;
  readonly label: string;
  readonly help: string;
}[] = [
  {
    value: "widget",
    label: "In the assistant",
    help: "Reviewed in the conversation where the change was asked for.",
  },
  {
    value: "table",
    label: "Above the table",
    help: "Reviewed in a strip over the rows it changes.",
  },
  {
    value: "modal",
    label: "In a dialog",
    help: "Reviewed in a dialog over the page. Nothing else is reachable until you answer.",
  },
];

const SAVING: readonly {
  readonly value: "stage" | "immediate";
  readonly label: string;
  readonly help: string;
}[] = [
  {
    value: "stage",
    label: "Stage changes",
    help: "An approved change becomes an unsaved edit. You still press Save.",
  },
  {
    value: "immediate",
    label: "Save immediately",
    help: "An approved change goes straight to the save path and reports what came back.",
  },
];

/** What an action's approval resolves to, and whether it was inherited. */
function describe(action: DemoActionApproval): string {
  if (!action.inherited) return "Overridden for this action";
  return action.policy === "required"
    ? "Inherited: asks first"
    : "Inherited: runs without asking";
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
}: Readonly<AiDemoOptionsProps>) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ai-opts"
      aria-label="Demo options"
      data-testid="ai-demo-options-drawer"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="ai-opts__head">
        <h3>Demo options</h3>
        <button
          type="button"
          className="ai-opts__close"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>
      </header>

      <div className="ai-opts__body">
        <Section title="Table features">
          <p className="ai-opts__help">
            Turn one off and the assistant offers less: it only ever suggests
            what this table currently wires.
          </p>
          <div className="ai-opts__row ai-opts__row--mode">
            <span>
              <span className="ai-opts__label">Editing mode</span>
              <span className="ai-opts__hint">
                Cell and row stay ordinary fields until you open them. Batch
                keeps every editable cell as an input.
              </span>
            </span>
            <Segmented
              label="Editing mode"
              value={editingMode}
              onChange={onEditingMode}
              options={[
                { value: "off", label: "Off", testId: "ai-editing-off" },
                { value: "cell", label: "Cell", testId: "ai-editing-cell" },
                { value: "row", label: "Row", testId: "ai-editing-row" },
                { value: "batch", label: "Batch", testId: "ai-editing-batch" },
              ]}
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

        <Section title="Action approvals">
          <p className="ai-opts__help">
            Whether the assistant has to ask before it runs an action. This is
            not where the question appears — that is below.
          </p>
          {actions.length === 0 ? (
            <p className="ai-opts__hint">
              This table wires no actions the assistant may run.
            </p>
          ) : (
            actions.map((action) => (
              <div key={action.key} className="ai-opts__row">
                <span>
                  <span className="ai-opts__label">{action.label}</span>
                  <span className="ai-opts__hint">{describe(action)}</span>
                </span>
                <span className="ai-opts__choices">
                  <select
                    aria-label={`Approval for ${action.label}`}
                    data-testid={`ai-approval-${action.key}`}
                    value={action.inherited ? "inherit" : action.policy}
                    onChange={(event) => {
                      action.onChange(
                        event.target.value as
                          "required" | "automatic" | "inherit"
                      );
                    }}
                  >
                    <option value="inherit">Use the default</option>
                    <option value="required">Always ask</option>
                    <option value="automatic">Never ask</option>
                  </select>
                </span>
              </div>
            ))
          )}
        </Section>

        <Section title="Approval location">
          <p className="ai-opts__help">
            Where a waiting change is reviewed. One place at a time — the others
            say a change is waiting, and never repeat the buttons.
          </p>
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

        <Section title="Saving">
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

        <Section title="Language and direction">
          <label className="ai-opts__row">
            <input
              type="checkbox"
              aria-label="Right-to-left table"
              checked={rtl}
              data-testid="ai-toggle-rtl"
              onChange={() => {
                onRtl(!rtl);
              }}
            />
            <span>
              <span className="ai-opts__label">Right-to-left table</span>
              <span className="ai-opts__hint">
                Mirrors the table and its overlays, and reads it in Arabic. The
                page around it stays as it is.
              </span>
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
          Reset demo
        </button>
      </footer>
    </dialog>
  );
}
