# Angular PDF export and printing

`exportPdf()` from the kit's `/export` entry creates a PDF of the resolved table
values. It shares CSV's scope and async lifecycle. It does not capture a
screenshot of the Angular component, so a custom cell needs an `exportValue`
when its displayed template is not a portable value.

```ts
import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { exportPdf } from "@adapttable/angular-unstyled/export";
import { print } from "@adapttable/angular-unstyled/print";

interface Line {
  id: string;
  description: string;
  quantity: number;
}

@Component({
  selector: "app-printable-lines",
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      tableLabel="Order lines"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  `,
})
export class PrintableLines {
  readonly rows: readonly Line[] = [
    { id: "l1", description: "Notebook", quantity: 3 },
  ];
  readonly columns: readonly ColumnDef<Line>[] = [
    { key: "description", header: "Description" },
    { key: "quantity", header: "Quantity" },
  ];
  readonly rowKey = (row: Line) => row.id;
  readonly features = [
    exportPdf<Line>({ filename: "order-lines.pdf", scope: "page" }),
    print(() => window.print(), true),
  ];
}
```

Use the matching `@adapttable/ng-zorro` imports for NG-ZORRO controls. Both kits
are private workspace packages. `print(callback, true)` adds a separate print
button; the host callback runs on activation and owns the browser print flow.
It does not start automatically during SSR.

## Layout and fonts

The default PDF uses A4 landscape and Helvetica. Text outside the default
font's WinAnsi coverage can become `?`. For international text, supply a font
that covers your content through the neutral `pdfWriter` helper and use
`exportCsv({ writer })` as the general writer entry:

```ts
import { exportCsv } from "@adapttable/angular-unstyled/export";
import { pdfWriter } from "@adapttable/core/pdf";

export async function createArabicPdfFeature() {
  const response = await fetch("/fonts/NotoSansArabic-Regular.ttf");
  if (!response.ok) throw new Error("The PDF font could not be loaded");
  const font = await response.arrayBuffer();
  return exportCsv({
    filename: "report.pdf",
    writer: pdfWriter({
      font,
      direction: "rtl",
      title: "تقرير",
      pageSize: "a4-landscape",
      pageBreak: "group",
    }),
  });
}
```

Load and cache the feature before mounting the table that uses it; show a
loading state and handle the promise rejection in your host. Font bytes must have
TrueType outlines. CFF-flavored OpenType is rejected. The writer subsets the
font, handles its supported RTL/Arabic shaping path and preserves logical text
in `ActualText`. A language still needs a suitable font; a locale label alone
cannot supply missing glyphs.

`pageBreak: "auto"` fits rows to pages and avoids leaving a group header alone
at the bottom. `"group"` also starts a new page before later top-level groups.
The writer uses column widths and hierarchy metadata. Long text may be fitted
to its column rather than reproducing an arbitrarily tall custom template.
`exportPdf()` intentionally fixes the default writer; writer-specific options
belong to `pdfWriter()`.

## Downloads, errors and print limits

All-row server exports need `onExportAll`, `request` or explicitly capped
`fetchAll`. Propagate rejected requests and honor cancellation; the Angular
export controller owns busy, error and retry presentation and releases its run
on destroy. `onAfterExport` means browser handoff, not a confirmed file save.

Browser printing only sees content available to the print flow. A virtualized
or server-paged table is not automatically a complete report. Build a full
report with a declared export scope when that is the intent. Keep print/export
controls available to keyboard and mobile users, and use localized labels and
the correct direction in the host.

See [Exporting](./exporting.md), [Virtualization](./virtualization.md),
[i18n and RTL](./i18n-rtl.md) and the
[PDF writer options](../../packages/shared/core/src/export/pdf.ts).
