# React table PDF export and print layout

▶ **See it working:** [download a grouped PDF and print the same view](https://orwa-mahmoud.github.io/adapttable/demo/mantine/export/) — a real table, not a recording.

▶ **Try it live:** [open a Mantine starter in StackBlitz](https://stackblitz.com/github/orwa-mahmoud/adapttable/tree/main/starters/mantine?file=src%2FApp.tsx) — import `@adapttable/core/pdf`. [Other UI kits →](./getting-started.md#try-it-in-stackblitz)

A downloaded PDF and a printed page are the same view — the columns, group
structure and page breaks the reader can actually see — shipped as
`@adapttable/core/pdf` so a table that never imports it never pays for it.
No PDF library.

```tsx
import { pdfWriter, printTable } from "@adapttable/core/pdf";
import { DataTable } from "@adapttable/mantine";

<DataTable
  data={people}
  columns={columns}
  rowKey={(row) => row.id}
  exportCsv={{ writer: pdfWriter(), scope: "all" }}
/>;
```

`pdfWriter` is the production default for the export button: the same
`exportCsv` seam as [CSV and XLSX](./customization.md#export), the same
scopes (`page`, `all`, `selected`, `range`) and the same column subset.
The button relabels itself **Export PDF** from `labels.exportFile("pdf")`.
`buildTablePdf` is the same file, for a host assembling rows by hand.

Print is a different verb. `downloadExportFile` cannot open a dialog, so
`openPrintLayout` (an `ExportTable`) and `printTable` (rows and columns)
load `buildPrintDocument` into a hidden iframe and call `window.print()`.
`buildPrintTableHtml` is the `<table>` alone; `printStyles` is the
stylesheet — repeating `thead`, `break-inside: avoid` on rows and groups,
column widths from the table, `padding-inline-start` so a tree or a
group indents under RTL. `PrintLayoutOptions` / `PdfWriterOptions` /
`PrintPageSize` / `PrintPageBreak` configure title, direction, paper and whether a
top-level group starts a new page (`pageBreak: "group"`). Paper defaults
to A4 landscape; direction inherits `document.documentElement.dir` when
omitted, so print matches what the reader is looking at.

What to print stays the host's call — the table never picks the rows for a
dialog it cannot open. Wire `onPrint` and Print becomes a palette command; add
`printButton` and the toolbar draws a Print button beside the view controls,
captioned from `labels.print`. Both are opt-in, and the button needs the
handler as well as the option, so neither can appear on its own.

The PDF is written by hand (one page tree, no dependency). By default it
draws in Helvetica and embeds nothing, so the file stays a few kilobytes
and the alphabet stops at WinAnsi — glyphs outside it paint as `?` and
still travel in `/ActualText`. Give it a font and that limit lifts; see
[Fonts and non-Latin text](#fonts-and-non-latin-text) below.

## Fonts and non-Latin text

`font` takes a TrueType file as bytes — `Uint8Array` or `ArrayBuffer` —
and the writer embeds a **subset** of it: only the glyphs this table
drew. A 421 KB Arabic face becomes about 20 KB in the file, which is what
makes the option usable on a CJK font at all.

```tsx
import { pdfWriter } from "@adapttable/core/pdf";

const font = await fetch("/fonts/NotoSansArabic-Regular.ttf").then((res) =>
  res.arrayBuffer()
);

<DataTable
  exportCsv={{
    scope: "all",
    writer: pdfWriter({ font, direction: "rtl", title: "تقرير المبيعات" }),
    filename: "report.pdf",
  }}
  …
/>;
```

Arabic needs more than glyphs, and it gets it. Letters take their
contextual shapes — initial, medial, final, isolated — lam and alef
become the single glyph they are written as, and right-to-left runs are
reordered for drawing with the Unicode bidirectional algorithm's
reordering rule, so a Latin product name, a date or a price inside an
Arabic sentence still reads forwards and brackets face the right way.
The logical string travels untouched in `/ActualText` and in the font's
`/ToUnicode` map, so copy-paste, search and a screen reader read the
sentence as written whatever order it was drawn in. Hebrew, Persian and
Urdu reorder the same way; Persian and Urdu letters shape too.

CJK needs neither shaping nor reordering — embed the font and the
subsetter does the rest.

What the option does not do:

- **OpenType shaping (GSUB).** Contextual alternates and a font's own
  ligature tables need a shaping engine, which is a dependency. Shapes
  come from the Unicode presentation forms instead: correct, readable,
  connected Arabic, drawn plainly where a face's own design would go
  further.
- **Bold.** A PDF font resource is one face, so a header row is stroked
  as well as filled rather than switching to a bold file.
- **Characters the font does not cover** — colour emoji, or Latin in an
  Arabic-only face — draw as `?`, the same fallback the built-in face
  uses. Pick a font that covers the scripts the table holds.
- **CFF-flavoured OpenType.** Those store outlines as PostScript
  charstrings; the writer throws with a message saying so rather than
  embedding megabytes whole. Use the `.ttf` build of the same family.

`openPrintLayout` and `printTable` take `font` too, and embed it whole as
an `@font-face` — the browser shapes text itself and needs every glyph.
Print does not require it: the browser already has fonts. Pass it when
the printed page must match the downloaded one, or when the machine doing
the printing cannot be assumed to have a face for the script.

Mobile cards use the same button and the same file. `hideOnMobile` never
shrinks an export; print and PDF are the column view, not a card list.
A grouped or tree-shaped table exports that structure, not a
denormalised leaf list — the same `ExportViewEntry` rows XLSX writes as
outline levels. Omit the import and nothing is drawn and nothing is
downloaded.
