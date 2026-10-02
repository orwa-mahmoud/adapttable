/** A deterministic local agent over the real Angular table and the selected kit UI. */
import {
  type AgentContextInputs,
  type AgentSession,
  type AssistantSuggestion,
  type AssistantTransport,
  receiptFromResult,
} from "@adapttable/ai";
import { injectTableAssistant, tableAgent } from "@adapttable/ai-angular";
import type {
  AgentApprovalPending,
  ColumnDef,
  TableAssistantProps,
} from "@adapttable/angular";
import { Component, computed, inject, signal } from "@angular/core";

import { SHOWCASE_PRESENTATION } from "./data";
import { AdaptShowcaseAssistant, AdaptShowcaseTable } from "./kitComponents";
import { SHOWCASE_KIT } from "./showcaseKit";

interface AgentPerson {
  id: string;
  name: string;
  salary: number;
}

const INITIAL: readonly AgentPerson[] = [
  { id: "ada", name: "Ada Lovelace", salary: 120 },
  { id: "grace", name: "Grace Hopper", salary: 140 },
  { id: "katherine", name: "Katherine Johnson", salary: 130 },
];

const SUGGESTIONS: readonly AssistantSuggestion[] = [
  {
    id: "sort",
    title: "Sort salaries",
    prompt: "Sort salaries highest first",
    kind: "sort",
    requires: ["view.setSort"],
  },
  {
    id: "choose",
    title: "Choose a person",
    prompt: "Choose a person",
    kind: "filter",
    requires: ["view.setSearch"],
  },
  {
    id: "edit",
    title: "Propose salary",
    prompt: "Propose Grace's salary as 150",
    kind: "edit",
    requires: ["edit.cells"],
  },
];

/** The feature body mounted by the Angular matrix's AI page. */
@Component({
  selector: "adapt-showcase-ai",
  imports: [AdaptShowcaseTable, AdaptShowcaseAssistant],
  templateUrl: "./aiBody.html",
})
export class AiBody {
  private readonly kit = inject(SHOWCASE_KIT);
  readonly presentation = SHOWCASE_PRESENTATION;
  readonly rows = signal(INITIAL);
  readonly rowKey = (row: AgentPerson) => row.id;
  readonly columns: readonly ColumnDef<AgentPerson>[] = [
    { key: "name", header: "Person", sortable: true },
    {
      key: "salary",
      header: "Salary",
      sortable: true,
      editable: true,
      editor: "number",
    },
  ];
  readonly session = signal<AgentSession | undefined>(undefined);
  readonly pending = signal<AgentApprovalPending | null>(null);
  readonly open = signal(true);
  readonly approvalSurface = signal<"widget" | "table" | "modal">("widget");
  readonly log = signal("No host writes yet");
  readonly direction = this.presentation.dir;
  private readView: (() => AgentContextInputs) | undefined;
  private turn = 0;

  private readonly transport: AssistantTransport = {
    send: async ({ session, text, signal: abort, askUser, onPartialText }) => {
      const request = text.toLowerCase();
      let key: string;
      let args: unknown;
      let success: string;
      if (request.includes("choose")) {
        const answer = await askUser?.({
          id: `person-${String(++this.turn)}`,
          question: "Which person should I show?",
          options: INITIAL.map((row) => ({ id: row.id, label: row.name })),
          allowFreeText: true,
        });
        if (!answer || abort?.aborted) return { text: "No filter applied." };
        const person = INITIAL.find((row) => row.id === answer.optionId);
        const search = person?.name ?? answer.text?.trim();
        if (!search) return { text: "No filter applied." };
        key = "view.setSearch";
        args = { search };
        success = `Showing ${search}.`;
      } else if (request.includes("propose")) {
        key = "edit.cells";
        args = { edits: [{ rowKey: "grace", column: "salary", value: 150 }] };
        success = "Grace's salary is now 150.";
      } else if (request.includes("everyone") || request.includes("reset")) {
        key = "view.setSearch";
        args = { search: "" };
        success = "Showing everyone.";
      } else if (request.includes("sort")) {
        key = "view.setSort";
        args = { key: "salary", dir: "desc" };
        success = "Highest salary first.";
      } else if (request.includes("wait")) {
        onPartialText?.("Waiting. Press Stop to cancel this local turn.");
        await new Promise<void>((resolve) => {
          if (!abort || abort.aborted) resolve();
          else abort.addEventListener("abort", () => resolve(), { once: true });
        });
        return { text: "Cancelled without changing the table." };
      } else {
        return {
          text: "Try: sort salaries, choose a person, propose Grace's salary as 150, or show everyone.",
        };
      }
      if (abort?.aborted)
        return { text: "Cancelled without changing the table." };
      const result = await session.execute(
        key,
        args,
        session.manifest().viewRevision,
        `angular-demo-${String(++this.turn)}`,
        abort
      );
      const receipt = receiptFromResult(
        result,
        key,
        session.manifest().policy.commit
      );
      return {
        text:
          receipt.status === "executed"
            ? success
            : `No change applied: ${result.error?.message ?? "the request was refused"}.`,
        keys: [key],
        results: [result],
      };
    },
  };

  readonly assistant = injectTableAssistant(
    computed(() => ({
      session: this.session(),
      transport: this.transport,
      transportKey: "angular-local-script",
      suggestions: SUGGESTIONS,
      open: this.open(),
      onOpenChange: (open: boolean) => this.open.set(open),
      awaitingApproval: this.pending() !== null,
      contextInputs: () => this.readView?.() ?? {},
    }))
  );

  readonly assistantProps = computed((): TableAssistantProps => ({
    assistant: this.assistant(),
    approval: this.pending(),
    open: this.open(),
    onOpenChange: (open) => this.open.set(open),
    presentation: "panel",
    dir: this.direction,
    labels: this.presentation.labels,
    note: "Scripted locally. Table changes and host writes are real.",
    greeting: "What would you like to do with these people?",
  }));

  readonly features = [
    this.kit.editing<AgentPerson>((row, column, value) => {
      if (column !== "salary") throw new Error("This demo only edits salary");
      const salary = Number(value);
      this.rows.update((rows) =>
        rows.map((person) =>
          person.id === row.id ? { ...person, salary } : person
        )
      );
      this.log.set(`${row.name} salary saved: ${String(salary)}`);
    }),
    this.kit.agentApproval(),
    tableAgent(
      computed(() => ({
        tableId: "angular-ai-people",
        writePolicy: "allow" as const,
        commit: "immediate" as const,
        approval: {
          policy: "writes" as const,
          presentation: this.approvalSurface(),
        },
        columns: {
          name: { type: "string" as const, readable: true, sortable: true },
          salary: {
            type: "number" as const,
            readable: true,
            writable: true,
            sortable: true,
          },
        },
        bridge: {
          attach: (session: AgentSession) => this.session.set(session),
          approvals: (pending: AgentApprovalPending | null) =>
            this.pending.set(pending),
          viewInputs: (read: () => AgentContextInputs) => {
            this.readView = read;
          },
        },
      }))
    ),
  ];

  send(text: string): void {
    this.open.set(true);
    void this.assistant().send(text);
  }

  changeSurface(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === "widget" || value === "table" || value === "modal")
      this.approvalSurface.set(value);
  }
}
