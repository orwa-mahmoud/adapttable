# Realtime React data table — live row updates, websockets

▶ **See it working:** [watch rows patch in on the Mantine demo](https://orwa-mahmoud.github.io/adapttable/demo/mantine/realtime/) — budgets change while you read them; sort and selection hold. The same page exists for MUI, Chakra, antd, Radix, Base UI, shadcn and Tailwind.

A realtime table is one whose rows update as data arrives — a websocket, a
poll, another tab. AdaptTable does not open the socket. You do. When a change
lands, you patch the rows you already hold. There is no `realtime` prop.

**Related:** [Inline cell editing](./cell-editing.md) · [API](./api.md) ·
[Data tiers](./data-tiers.md)

## Apply a patch

`applyRowPatches` updates the array you pass as `data`. Untouched rows keep
their object identity, so React does not redraw the whole page, and scroll,
sort, filters and selection survive.

```tsx
import { DataTable } from "@adapttable/mantine";
import { applyRowPatches, updateRow } from "@adapttable/core";

export function People({ rows, columns, setRows }) {
  const byId = (row) => row.id;

  // Your socket / poll calls this when a row changes.
  const onMessage = (id, budget) =>
    setRows(applyRowPatches(rows, [updateRow(id, { budget })], byId));

  return <DataTable data={rows} columns={columns} rowKey={byId} />;
}
```

`insertRow`, `updateRow`, `upsertRow` and `removeRow` build the batch. A later
patch sees what an earlier one did.

## Incremental re-evaluation

Hand the array `applyRowPatches` returns back as `data` — do not spread it.
The result carries a `rowPatchLog`; `useFrontendData` continues the live
view and re-runs search, filters, sort, grouping and aggregates for the
rows the patch touched, not the whole set. A copy (`[...patched]`) drops
the log and rebuilds everything, which is how the scale bench's full-rebuild
arm is built.

```tsx
setRows(applyRowPatches(rows, [updateRow(id, { budget })], byId));
```

`createIncrementalView` / `applyRowPatchesToView` /
`applyRowPatchLogToView` are the same engine if you hold the snapshot
yourself. All eight adapters share it, including the mobile card layout.

The scale demo measures both pipelines: `?patch=200` spreads (full rebuild)
and `?patch=200&incremental=1` keeps the log. `node scripts/bench.mjs
--only patch` prints the burst times. A 2026-08-26 run on this machine was
**13.5 s** full rebuild → **9.9 s** incremental (**1.4×**) for 200 updates
on 20,000 rows through the live Mantine table.

## What this page is not

A websocket that changes the row **under an open editor** is a conflict, not
this page. That lives under [cell editing](./cell-editing.md#live-update-conflicts).

## Notes

- Works in all eight adapters. The demo is the same feed on each kit.
- The table never owns your data. A patch is a new array you hand back.
- [API reference](./api.md) lists `applyRowPatches`, `applyRowPatchesWithLog`
  and the patch shapes.
