# React table exports — browser files and server-built jobs

AdaptTable uses one `exportCsv()` feature for CSV, XLSX, PDF, and custom
writers. Small and medium exports can be built in the browser. Large
server-backed exports can stay beside the data while the table shows progress,
offers cancellation, and returns the finished download to the reader.

## Browser-built export

For frontend data, `scope: "all"` reads the source's complete filtered and
sorted set and builds the file directly:

```tsx
import { exportCsv } from "@adapttable/mantine/export";

<DataTable
  features={[exportCsv({ scope: "all", filename: "people.csv" })]}
  {...props}
/>;
```

A server source normally holds one page. `fetchAll` is the explicit
browser-built alternative: it pages the current query, then runs the normal
writer. The walk defaults to `EXPORT_FETCH_ALL_MAX_ROWS` (50,000). Reaching
that cap calls `onCapped` and never pretends a partial file is complete.

```tsx
features={[
  exportCsv({
    scope: "all",
    fetchAll: {
      fetchPage: (query) => api.people.list(query),
      onCapped: ({ rows }) => notify(`${rows} rows is the browser limit`),
    },
  }),
]}
```

`maxRows` (default `EXPORT_FETCH_ALL_MAX_ROWS`) and `pageSize` tune the walk;
`onCapped` receives `{ rows, maxRows }`.

Use this route only when downloading every page and holding the resulting file
in the tab is appropriate. The file goes through the normal writer, and
`onBeforeExport`/`onAfterExport` run as they do for any browser-built export.

## Server-built export with progress

`onExportAll(query, controls)` is the path beyond the browser cap. The table
does not fetch rows. It sends the page-free view only:

- committed search, flat filters, and the nested filter tree;
- the primary sort and complete multi-sort chain;
- grouping keys, outermost first;
- visible column keys and requested export column keys, both in display order;
- filename and writer format.

```tsx
import { exportCsv } from "@adapttable/mantine/export";

<DataTable
  features={[
    exportCsv({
      scope: "all",
      filename: "people.csv",
      onExportAll: async (query, controls) => {
        const job = await api.exports.start(query, {
          signal: controls.signal,
        });

        for await (const update of api.exports.watch(job.id, {
          signal: controls.signal,
        })) {
          controls.setProgress?.(update.percent);
          controls.setMessage?.(update.message);
          if (update.url) return { url: update.url };
        }
      },
    }),
  ]}
  {...props}
/>;
```

Each run gets a fresh `AbortSignal`. The surface's Cancel button aborts it;
the host should pass that signal through every request and stop its polling or
stream. `setProgress` is clamped to 0–100. If it is never called, the kit shows
an indeterminate indicator. `setMessage` supplies short job-specific detail
below the localized heading.

The host settles in one of three ways:

- resolve `{ url }`: the completed surface offers a **Download export** link;
- resolve nothing: the host chose another delivery method, and the surface
  still shows **Export complete**;
- reject: the error surface shows the reason and a localized **Retry** button.

Every terminal state — complete with or without a URL, failed, or cancelled —
also offers a localized **Dismiss** control. Dismiss returns the surface to
idle, clears the stale message, error, and download URL, and restores focus to
the Export button. It does not abort or restart a job. Busy work keeps
**Cancel** only; Dismiss never replaces it.

Cancellation is not a failure. It shows and announces **Export cancelled**,
ignores a late rejection from the aborted run, and never offers Retry for that
run. Retry starts a new job with a new signal and the table's current view.

`onExportAll` takes precedence over the generic `request` callback for
`scope: "all"`. `request` remains available for hosts that take over page,
selected, or range exports without the progress protocol. Neither host-owned
route runs `onBeforeExport` or `onAfterExport`, because the table never builds
their file.

## Accessibility and adapter behavior

Every published adapter renders the same lifecycle through its own components:
a progress card and determinate bar or indeterminate spinner, plus native-kit
Cancel, Retry, Download, and Dismiss controls. The card is viewport-safe on
mobile and uses logical positioning, so it remains at the inline end in LTR
and RTL. Dismiss sits at the inline end of the heading so RTL placement stays
correct.

A polite live region announces start, each reported progress value, completion,
failure, and cancellation. The Export button remains present with
`aria-busy="true"` while a job runs, and the single-flight guard refuses a
second start until that run settles or is cancelled.

For column scopes, writers, lifecycle hooks, and headless helpers, see
[Customization — Export](./customization.md#export). For PDF and print-specific
options, see [PDF export and print layout](./export-pdf.md).
