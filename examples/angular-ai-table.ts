/** Shared live Angular table for the transport examples. No synthetic session. */
import type { AgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai-angular";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { Component, DestroyRef, inject, input, signal } from "@angular/core";

interface Order {
  id: string;
  customer: string;
  total: number;
}

/** A transport receives the session attached by this rendered table. */
export type AngularAgentRun = (
  session: AgentSession,
  destroy: DestroyRef
) => Promise<unknown>;

@Component({
  selector: "angular-agent-table",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Orders"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [urlSync]="false"
    />
    <button type="button" [disabled]="!session() || busy()" (click)="execute()">
      Run example
    </button>
    <output aria-live="polite">{{ result() }}</output>
  `,
})
export class AngularAgentTable {
  readonly run = input.required<AngularAgentRun>();
  readonly session = signal<AgentSession | undefined>(undefined);
  readonly busy = signal(false);
  readonly result = signal("");
  readonly destroy = inject(DestroyRef);
  readonly rows: readonly Order[] = [
    { id: "ada", customer: "Ada", total: 120 },
    { id: "grace", customer: "Grace", total: 140 },
    { id: "katherine", customer: "Katherine", total: 130 },
  ];
  readonly columns: readonly ColumnDef<Order>[] = [
    { key: "customer", header: "Customer", sortable: true },
    { key: "total", header: "Total", sortable: true },
  ];
  readonly rowKey = (row: Order) => row.id;
  readonly features = [
    tableAgent({
      tableId: "orders",
      approval: "never",
      columns: {
        customer: { type: "string", sortable: true },
        total: { type: "number", sortable: true },
      },
      bridge: { attach: (session) => this.session.set(session) },
    }),
  ];

  async execute(): Promise<void> {
    const session = this.session();
    if (!session || this.busy()) return;
    this.busy.set(true);
    try {
      const result = await this.run()(session, this.destroy);
      if (!this.destroy.destroyed) this.result.set(JSON.stringify(result));
    } catch (error) {
      if (!this.destroy.destroyed)
        this.result.set(error instanceof Error ? error.message : String(error));
    } finally {
      if (!this.destroy.destroyed) this.busy.set(false);
    }
  }
}
