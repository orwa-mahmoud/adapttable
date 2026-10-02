# Angular agent capabilities

`tableAgent()` from `@adapttable/ai-angular` exposes a live table session to an
agent integration. It observes the mounted table's rows, view and available
operations; it does not insert a model SDK into the Angular binding or grant
writes that the host has not wired. The AI Angular binding and both Angular
kits are private, unpublished workspace packages.

## Attach a session to a table

```ts
import { Component, signal } from "@angular/core";
import type { AgentSession } from "@adapttable/ai";
import { tableAgent } from "@adapttable/ai-angular";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";

interface Product {
  id: string;
  name: string;
  stock: number;
}

@Component({
  selector: "app-agent-products",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Products"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
    <button
      type="button"
      [disabled]="!session() || busy()"
      (click)="sortStock()"
    >
      Sort stock highest first
    </button>
    <p role="status">{{ message() }}</p>
  `,
})
export class AgentProducts {
  readonly rows: readonly Product[] = [
    { id: "p1", name: "Notebook", stock: 10 },
    { id: "p2", name: "Pencil", stock: 30 },
  ];
  readonly rowKey = (row: Product) => row.id;
  readonly columns: readonly ColumnDef<Product>[] = [
    { key: "name", header: "Product", sortable: true },
    { key: "stock", header: "Stock", sortable: true },
  ];
  readonly session = signal<AgentSession | undefined>(undefined);
  readonly busy = signal(false);
  readonly message = signal("");
  private request = 0;
  readonly features = [
    tableAgent({
      tableId: "products",
      columns: {
        name: { type: "string", readable: true, sortable: true },
        stock: { type: "number", readable: true, sortable: true },
      },
      bridge: { attach: (session) => this.session.set(session) },
    }),
  ];

  async sortStock(): Promise<void> {
    const session = this.session();
    if (!session || this.busy()) return;
    this.busy.set(true);
    try {
      const result = await session.execute(
        "view.setSort",
        { key: "stock", dir: "desc" },
        session.manifest().viewRevision,
        `sort-stock-${++this.request}`
      );
      this.message.set(
        result.ok
          ? "Stock sorted."
          : (result.error?.message ?? "The table action was refused.")
      );
    } catch {
      this.message.set("The table action could not be completed.");
    } finally {
      this.busy.set(false);
    }
  }
}
```

This example calls the real session directly to demonstrate the contract; it
does not connect a language model. Use the NG-ZORRO root table for that kit;
`tableAgent` remains in `@adapttable/ai-angular`.

## Capabilities and permissions

Read the current manifest instead of assuming every table has every command.
Sorting, filters, grouping, export, pinning and edits depend on the composed
features, source capabilities and declared column policy. `excludeCapabilities`
only narrows the agent surface. It does not remove the person's table controls,
and an approval option cannot enable an operation the table does not offer.

For editing, wire `editing()` or the appropriate row/batch host callback, mark
the permitted columns writable in the agent policy, and configure `writePolicy`,
`commit` and `approval` deliberately. The callback persists the rows. A staged
write and a persisted write are different outcomes; render the result receipts
instead of claiming success from an assistant's prose alone.

The kit's `/assistant` entry supplies `agentApproval()` and assistant controls.
Approval can be presented in the table, a modal or the conversation widget.
When the assistant is outside the table, wire `bridge.approvals` and pass its
pending value to the assistant so a waiting write is visible and reviewable.
`onApprove` is the alternative for a host-owned approval flow. Per-capability
policy and revocable always-allow state do not replace backend authorization.

Column readability is separate from visibility. Hiding a salary column is not
a redaction policy; declare unreadable fields explicitly and enforce the same
boundary at the transport/server. Server sources expose only their supported
read scope; `full` is not a promise to fetch the entire database.

## Live state, transport and cleanup

Calls include the current view revision and an idempotency key. A stale revision
can be refused; inspect the result and obtain current state instead of
blindly repeating an action against changed rows. Pass an `AbortSignal` for
cancelable work and report partial or rejected outcomes truthfully.

`tableAgent(computed(() => options))` follows reactive policy and callback
changes. Its mounted lifecycle synchronizes committed table state and releases
subscriptions on destroy. A session attached to one mounted table should not
be retained as an active controller after that table is removed.

`injectTableAssistant()` returns an Angular signal over the conversation
controller. Provide a transport explicitly; without one it stays disconnected.
Protocol/provider helpers remain under neutral `@adapttable/ai/*` entries such
as `/http`, `/openai` and `/mcp`. Keep credentials in your server integration.
`webmcp` is a separate opt-in browser exposure and does nothing when that
browser API is unavailable; it still obeys the table's capability policy.

Keyboard and mobile users need access to approval, Stop, failure and retry
controls. The same session operates over mobile cards; changing presentation
does not alter write permission.

See [AI and voice](./ai-voice.md), [Cell editing](./cell-editing.md),
[Data tiers](./data-tiers.md) and the
[Angular table-agent lifecycle](../../packages/angular/ai-angular/src/tableAgent.ts).
