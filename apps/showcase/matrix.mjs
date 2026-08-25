/**
 * The adapter × feature matrix — who the showcase's demo pages are FOR.
 *
 * AdaptTable is one engine wearing eight kits, so the demo reads that way: a
 * landing page per adapter ("AdaptTable for Mantine"), and one page per feature
 * underneath it ("Saved views in Mantine"). Somebody searching for a Mantine
 * pivot table finds a page about a Mantine pivot table, with Mantine's install
 * line and Mantine's components on screen — not a generic page with a kit
 * switcher they have to find and press.
 *
 * Everything about those pages is here, in plain JavaScript, because four
 * consumers with nothing else in common read it:
 *
 *   - `pages.mjs` expands the matrix into the page manifest.
 *   - `scripts/build-showcase-html.mjs` writes each page's static HTML —
 *     the title, the description and the no-JavaScript copy a crawler reads.
 *   - `src/matrix/*` renders the live page from the same words.
 *   - `src/sections.tsx` builds the nav out of the same two lists.
 *
 * One home per fact: the copy a reader sees in Google and the copy they see on
 * the page are the same string, and a feature added here appears in the
 * manifest, the sitemap, the nav and the built HTML without being typed again.
 *
 * `{kit}`, `{pkg}` and `{peer}` in any string are filled from the adapter the
 * page is for — see `fillTemplate`. They are the only substitution: a sentence
 * that would need more than a name swapped is written per adapter in `notes`,
 * or it is not written at all.
 */

/**
 * One UI kit AdaptTable adapts to.
 *
 * @typedef {object} ShowcaseAdapter
 * @property {string} key URL segment and switcher id — `mantine`.
 * @property {string} label The kit's own name — `Mantine`.
 * @property {string} blurb One phrase on the kit's look, for the switcher card.
 * @property {string} accentLight The kit's accent on a light page.
 * @property {string} accentDark The kit's accent on a dark page.
 * @property {string} pkg The adapter package a consumer installs.
 * @property {string} peer The kit's own packages, which stay peers.
 * @property {string} install The full install line, kit packages included.
 * @property {string} provider The kit's provider component, or "" when the kit
 *   needs none.
 * @property {string} tagline The landing page's promise, one sentence.
 * @property {string} surface What the kit renders the table's chrome with —
 *   named components, verifiable in the adapter's source.
 * @property {boolean} built Whether this adapter has its own landing and
 *   feature pages yet. Until it does, the nav sends readers to the live demo
 *   pinned to that kit, which is a page that exists and shows that kit.
 * @property {{ title: string, description: string }} [landing] The landing
 *   page's `<title>` and meta description, where the shared pair would not be
 *   true of this kit. The unstyled family is the case it exists for: shadcn and
 *   Tailwind render semantic markup wearing classes, so "rendered with its own
 *   components" is a claim about them that is simply false. Every other kit
 *   uses `LANDING`, and the page body needs no override anywhere — `tagline`
 *   and `surface` already carry what differs.
 */

/**
 * The eight adapters, in the order the switcher and the nav show them.
 *
 * `label`, `blurb` and the two accents are the switcher's tokens — the same
 * values `src/themeTokens.ts` re-exports, kept here so the nav, the landing
 * pages and the switcher cannot describe the same kit differently.
 *
 * @type {ShowcaseAdapter[]}
 */
export const SHOWCASE_ADAPTERS = [
  {
    key: "mantine",
    label: "Mantine",
    blurb: "Rounded, friendly, filled controls",
    accentLight: "oklch(0.58 0.17 252)",
    accentDark: "oklch(0.66 0.16 252)",
    pkg: "@adapttable/mantine",
    peer: "@mantine/core",
    install:
      "pnpm add @adapttable/mantine @adapttable/core @mantine/core @mantine/hooks",
    provider: "MantineProvider",
    tagline:
      "A data table that renders as Mantine, because it is built from Mantine.",
    surface:
      "Mantine's own Paper, Table, Popover, Drawer, Card, Checkbox, Select and Pagination",
    built: true,
  },
  {
    key: "mui",
    label: "MUI",
    blurb: "Material elevation, uppercase actions",
    accentLight: "oklch(0.55 0.18 264)",
    accentDark: "oklch(0.7 0.15 264)",
    pkg: "@adapttable/mui",
    peer: "@mui/material",
    install: "pnpm add @adapttable/mui @adapttable/core @mui/material",
    provider: "ThemeProvider",
    tagline: "A Material data table, drawn by MUI's own components.",
    surface:
      "MUI's Paper, Table, Popover, Drawer, Card, Checkbox and TextField",
    built: true,
  },
  {
    key: "chakra",
    label: "Chakra",
    blurb: "Soft teal, generous radius",
    accentLight: "oklch(0.6 0.1 188)",
    accentDark: "oklch(0.72 0.1 188)",
    pkg: "@adapttable/chakra",
    peer: "@chakra-ui/react",
    install:
      "pnpm add @adapttable/chakra @adapttable/core @chakra-ui/react @emotion/react",
    provider: "ChakraProvider",
    tagline: "A Chakra data table, with Chakra's controls throughout.",
    surface: "Chakra's Table, Popover, Drawer, Card, Checkbox and NativeSelect",
    built: true,
  },
  {
    key: "antd",
    label: "Ant Design",
    blurb: "Compact, tinted header, crisp",
    accentLight: "oklch(0.56 0.2 262)",
    accentDark: "oklch(0.65 0.18 262)",
    pkg: "@adapttable/antd",
    peer: "antd",
    install: "pnpm add @adapttable/antd @adapttable/core antd",
    provider: "ConfigProvider",
    tagline: "An Ant Design data table, in Ant Design's own controls.",
    surface: "antd's Table, Popover, Drawer, Card, Checkbox and Select",
    built: true,
  },
  {
    key: "radix",
    label: "Radix",
    blurb: "Radix Themes, iris accent",
    accentLight: "oklch(0.54 0.19 280)",
    accentDark: "oklch(0.7 0.16 280)",
    pkg: "@adapttable/radix",
    peer: "@radix-ui/themes",
    install: "pnpm add @adapttable/radix @adapttable/core @radix-ui/themes",
    provider: "Theme",
    tagline: "A Radix Themes data table, accent token and all.",
    surface: "Radix Themes' Table, Popover, Dialog, Card, Checkbox and Select",
    built: true,
  },
  {
    key: "base-ui",
    label: "Base UI",
    blurb: "Unstyled primitives, blue accent",
    accentLight: "oklch(0.55 0.19 255)",
    accentDark: "oklch(0.7 0.15 255)",
    pkg: "@adapttable/base-ui",
    peer: "@base-ui/react",
    install: "pnpm add @adapttable/base-ui @adapttable/core @base-ui/react",
    provider: "",
    tagline: "A Base UI data table — their primitives, your tokens.",
    surface:
      "Base UI's Popover, Drawer, Select, Checkbox, Input and Tooltip primitives",
    built: true,
  },
  {
    key: "shadcn",
    label: "shadcn",
    blurb: "Monochrome, ring focus",
    accentLight: "oklch(0.28 0.01 264)",
    accentDark: "oklch(0.92 0.004 264)",
    pkg: "@adapttable/shadcn",
    peer: "tailwindcss",
    install: "pnpm add @adapttable/shadcn @adapttable/core",
    provider: "",
    tagline: "A shadcn/ui data table, styled by the classes you already own.",
    surface: "semantic markup wearing shadcn's own class conventions",
    landing: {
      title:
        "AdaptTable for shadcn/ui — a data table in your own design tokens",
      description:
        "A batteries-included React data table for shadcn/ui: filtering, grouping, pivot, editing, saved views and export, drawn as semantic markup wearing shadcn's own tokens. Install @adapttable/shadcn.",
    },
    built: true,
  },
  {
    key: "tailwind",
    label: "Tailwind",
    blurb: "Unstyled — your own classes",
    accentLight: "oklch(0.55 0.2 277)",
    accentDark: "oklch(0.68 0.17 277)",
    pkg: "@adapttable/unstyled",
    peer: "react",
    install: "pnpm add @adapttable/unstyled @adapttable/core",
    provider: "",
    tagline: "Native controls and no opinions — every class is yours.",
    surface: "a native HTML control you address by class name",
    landing: {
      title:
        "AdaptTable for Tailwind — a data table you style with your own classes",
      description:
        "A batteries-included React data table for Tailwind CSS: filtering, grouping, pivot, editing, saved views and export, rendered as semantic HTML whose every part takes your classes. Install @adapttable/unstyled.",
    },
    built: true,
  },
];

/**
 * One feature, told per adapter.
 *
 * @typedef {object} MatrixFeature
 * @property {string} slug URL segment under the adapter — `saved-views`.
 * @property {string} label Nav and card caption — `Saved views`.
 * @property {string} h1 The page's heading. Templated.
 * @property {string} title The `<title>`, written as the search result it wants
 *   to win. Templated.
 * @property {string} description The meta description. Templated.
 * @property {string[]} intro Two or three real sentences, served in the static
 *   HTML and rendered again by the page. Templated.
 * @property {string} card The one line under this feature on the landing grid.
 * @property {string} snippet The code, with the adapter's real import path.
 *   Templated.
 * @property {Record<string, string>} notes What is true about this feature in
 *   THIS kit, keyed by adapter — the sentence that cannot be templated. A kit
 *   with nothing honest to add has no entry, and the page shows none.
 * @property {Record<string, string[]>} [intros] The intro this feature needs in
 *   THIS kit, keyed by adapter, where a shared paragraph would state something
 *   untrue of it. Two features say outright that every control "comes from" the
 *   kit's package, which is the one claim the unstyled family cannot make: it
 *   renders semantic markup and takes classes. Those get an intro of their own
 *   here rather than a sentence bent far enough to cover both.
 * @property {string[]} docs Documentation slugs this feature is written up in.
 */

/**
 * Landing-grid, rail and nav order: what people search for and need first,
 * then the specialist pages. Definition order below is not this list —
 * {@link MATRIX_FEATURES} is this ranking applied to the objects.
 *
 * @type {readonly string[]}
 */
const FEATURE_DEMAND_ORDER = [
  "filtering",
  "columns",
  "column-groups",
  "selection",
  "rows",
  "editing",
  "grouping",
  "nested-tables",
  "export",
  "scale",
  "tree",
  "mobile-cards",
  "pivot",
  "saved-views",
  "formulas",
  "rtl",
  "realtime",
  "accessibility",
];

/**
 * The eighteen features that get a page per adapter.
 *
 * Curated rather than exhaustive: these are the ones people search for by name
 * and evaluate a table on. Pagination is not among them — every table pages,
 * and the docs already own that search. Column groups, RTL, realtime, rows,
 * nested tables and accessibility used to answer once for all eight kits (or
 * live only in the Lab / docs); they are features of a kit page now, the same
 * as filtering or grouping. Accessibility is last in demand order — it is on
 * by default, and the first tile to give up if a stronger search destination
 * needs the slot.
 *
 * @type {MatrixFeature[]}
 */
const MATRIX_FEATURES_DEFINED = [
  {
    slug: "saved-views",
    label: "Saved views",
    h1: "Saved views in {kit}",
    title: "{kit} saved views — AdaptTable",
    description:
      "Name a table arrangement and switch between saved views in {kit} — filters, sort, columns, density and pivot in one link. Rename, reorder and set a default from the {kit} panel.",
    intro: [
      "A view is everything the table can put in a URL — search, sort, filters, grouping, the column layout, density and the pivot — saved under a name.",
      "Readers pick one from the views menu; the panel beside the table renames, reorders, sets the default and deletes. A view someone else shared arrives read-only and says so on the row.",
      "Both are {kit} components: the menu, the panel, the rename box and every control on it come from {peer}, so a saved view looks like the rest of your app.",
    ],
    card: "Name an arrangement, share it as a link, manage the list in place.",
    snippet: `import {
  DataTable,
  SavedViewsPanel,
  useSavedViews,
} from "{pkg}";

export function People({ rows, columns }) {
  const views = useSavedViews({
    storageKey: "people-views",
    urlKey: "v",
  });
  return (
    <>
      <SavedViewsPanel
        views={views.views}
        onApply={views.apply}
        onRename={views.rename}
        onMove={views.move}
        onSetDefault={views.setDefault}
        onRemove={views.remove}
      />
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        urlKey="v"
        savedViews={{ storageKey: "people-views" }}
      />
    </>
  );
}`,
    notes: {
      mantine:
        "The panel is a Mantine Stack of rows; each name is a Button that applies the view, the icon cluster is ActionIcons, and renaming happens in a Mantine TextInput without leaving the row.",
      mui: "The panel is an outlined Paper with an overline caption; each name is a Button, the icon cluster is IconButtons, renaming happens in a TextField, and the default and read-only markers are Chips.",
      chakra:
        "The panel is a bordered Box rather than a Card — Chakra's Card carries padding this list does not want — with a ghost Button per name, an xs Input for renaming, and Badges for the default and read-only markers.",
      antd: "The panel is a small Card using antd's own title slot, each name is a text Button, renaming happens in a small Input, and the default and read-only markers are Tags.",
      radix:
        "The panel is a size-1 Card with a TextField for renaming and IconButtons that switch from ghost to soft when pressed; the menu is a real Popover, so Escape, outside click and focus return are Radix's.",
      "base-ui":
        "The controls are Base UI's Button and Input, and the panel re-declares the adapter's token class on itself — mounted beside the table it sits outside the table's scope, and every token in it would otherwise resolve to nothing.",
      shadcn:
        "The panel and the toolbar menu share one set of class keys, so both read as the same surface: bg-card over border-border, rows highlighting on bg-muted, and the save action in bg-primary.",
      tailwind:
        "Every row is native markup carrying the map's classes — a gray-bordered button per name, an indigo ring on the rename input, and the save action in bg-indigo-600.",
    },
    intros: {
      shadcn: [
        "A view is everything the table can put in a URL — search, sort, filters, grouping, the column layout, density and the pivot — saved under a name.",
        "Readers pick one from the views menu; the panel beside the table renames, reorders, sets the default and deletes. A view someone else shared arrives read-only and says so on the row.",
        "Both are semantic markup wearing the shadcn class preset: the surface is bg-card, the rows highlight on bg-muted, and the save button is bg-primary — the tokens your own components already read.",
      ],
      tailwind: [
        "A view is everything the table can put in a URL — search, sort, filters, grouping, the column layout, density and the pivot — saved under a name.",
        "Readers pick one from the views menu; the panel beside the table renames, reorders, sets the default and deletes. A view someone else shared arrives read-only and says so on the row.",
        "Both are native elements — buttons, inputs, a list — and every one of them takes your classes, so the panel matches the rest of your app because you styled it, not because a kit did.",
      ],
    },
    docs: ["saved-views", "url-state"],
  },
  {
    slug: "pivot",
    label: "Pivot",
    h1: "Pivot tables in {kit}",
    title: "{kit} pivot table — AdaptTable",
    description:
      "Build a pivot table in {kit}: drag-free row, column and measure zones, subtotals at every level, and the whole configuration carried in the URL.",
    intro: [
      "Grouping answers “what is the total per team”. A pivot answers “what is the total per team per status”, and that second dimension becomes columns your data never had.",
      "Fields move between the three zones with buttons rather than drag, so the pivot can be built from the keyboard. Subtotals close every group and a grand total closes the table.",
      "The configuration — axes, measures, aggregation and what you folded — lives in the URL, so a pivot you build is a pivot you can send someone.",
    ],
    card: "Rows down the side, dimensions across the top, subtotals at every level.",
    snippet: `import { DataTable, PivotPanel } from "{pkg}";
import { usePivotUrlState } from "@adapttable/core/pivot";

export function Spend({ rows, fields }) {
  const pivot = usePivotUrlState({
    urlKey: "p",
    defaultConfig: {
      rows: ["team"],
      columns: ["status"],
      measures: [{ key: "budget", agg: "sum" }],
    },
  });
  return (
    <>
      <PivotPanel fields={fields} {...pivot} />
      <DataTable
        data={rows}
        columns={pivot.columns}
        rowKey={(row) => row.id}
      />
    </>
  );
}`,
    notes: {
      mantine:
        "The zone panel is Mantine's — Stack, Group, Select and Button — and the pivot renders through the same Mantine table as everything else, header tree included.",
      mui: "Each zone is a Stack drawn as a fieldset with a Typography legend, the field moves are IconButtons rather than Buttons because a 64px minimum will not fit a sidebar, and the field and aggregation pickers are TextField selects.",
      chakra:
        "Each zone is a Stack rendered as a fieldset with a Text legend — Chakra's reset strips the browser's own frame, so the border is the kit's — and the moves are xs outline Buttons beside NativeSelect pickers.",
      antd: "The zones are plain fieldsets rather than Cards, and both Selects set getPopupContainer so their dropdowns stay with the trigger instead of portalling to the body away from the panel they belong to.",
      radix:
        "Each zone is a Card wrapping a real fieldset — the fieldset is what a screen reader hears, the Card is what you see — with soft Buttons for the moves and Radix Selects for the pickers.",
      "base-ui":
        "The zones are real fieldsets carrying the adapter's card class, the pickers are Base UI Selects, and the panel re-declares the token class for the same reason the saved-views panel does.",
      shadcn:
        "The pivot panel is the one surface the preset does not reach: it renders the unstyled adapter's fieldset, legend, selects and buttons with no classes at all, so this zone editor is browser-default until you style it.",
      tailwind:
        "The pivot panel takes no class map at all, so its fieldset, legend, selects and buttons are browser defaults — the table below is fully styled, and the zone editor is yours to dress.",
    },
    docs: ["pivot"],
  },
  {
    slug: "formulas",
    label: "Formulas",
    h1: "Spreadsheet formulas in {kit}",
    title: "{kit} table formulas — AdaptTable",
    description:
      "Add computed columns to a {kit} data table from spreadsheet formulas — ROUND, IF, UPPER, string joins and aggregates, with errors reported in the cell that caused them.",
    intro: [
      "A formula column is a column nobody wrote code for: type `=ROUND(budget * 0.15, 0)` and the table computes it per row, sorts it, filters it and exports it like any other column.",
      "The engine covers arithmetic, comparison, string joins, IF, and the aggregate functions a footer needs. A bad reference reports in the cell that caused it rather than blanking the table, and a circular reference reports `#CYCLE!` instead of recursing.",
      "Formula columns serialize to the URL with everything else, so a derived column travels in the same link as the filters it sits beside.",
    ],
    card: "Computed columns typed as formulas, errors reported in the cell.",
    snippet: `import { DataTable } from "{pkg}";
import { buildFormulaColumns } from "@adapttable/core/formula";

const derived = buildFormulaColumns([
  {
    key: "margin",
    header: "Margin",
    formula: "=ROUND(budget * 0.15, 0)",
  },
  {
    key: "tag",
    header: "Tag",
    formula: '=UPPER(team) & " · " & role',
  },
]);

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={[...columns, ...derived]}
      rowKey={(row) => row.id}
    />
  );
}`,
    notes: {
      mantine:
        "The formula bar on this page is the host's own chrome, not the table's — the engine hands back column definitions, and Mantine renders the resulting columns exactly like the declared ones.",
      mui: "There is no MUI-specific formula code: the engine returns ordinary column definitions, so a computed column is a TableCell like any other and an error value is the text inside it.",
      chakra:
        "There is no Chakra-specific formula code: a computed column arrives as an ordinary column definition and renders in the same Table.Cell as a declared one, error token included.",
      antd: "The engine returns ordinary column definitions, so a computed column renders through antd's own Table cell — and an error reads as its token text rather than being dressed up as an Alert or a Tag.",
      radix:
        "The engine returns ordinary column definitions, so a computed column renders in the same Table.Cell as a declared one and an error value is simply the cell's text.",
      "base-ui":
        "There is no Base UI-specific formula code: a computed column is a column definition like any other, and the cell that holds it is the same cell that holds a declared one.",
      shadcn:
        "A computed column is an ordinary cell wearing the preset's padding, and an error token is the text inside it — the preset gives errors no colour of their own here.",
      tailwind:
        "A computed column is an ordinary cell carrying the map's padding classes, and an error token is plain text — nothing in the map singles it out.",
    },
    docs: ["formulas"],
  },
  {
    slug: "editing",
    label: "Editing",
    h1: "Inline cell editing in {kit}",
    title: "{kit} editable data table — AdaptTable",
    description:
      "Edit cells in place in a {kit} table — text, number and select editors, Enter to commit, paste from a spreadsheet, undo in one press. Your handler owns every write.",
    intro: [
      "Mark a column `editable`, pass `onCellEdit`, and double-click opens a {kit} editor in the cell. Enter commits, Escape cancels, Tab moves to the next editable cell.",
      "The table never mutates your rows. It hands your handler the row, the column and the new value, and shows whatever you hand back — which is what makes optimistic updates, validation and rollback yours to decide.",
      "With `cellNavigation` on, the same handler receives whole blocks: paste a spreadsheet range with Ctrl+V, drag the fill handle, and undo the entire paste with one Ctrl+Z.",
    ],
    card: "Kit-native editors in the cell; every write goes through your handler.",
    snippet: `import { DataTable } from "{pkg}";

const columns = [
  { key: "name", editable: true },
  {
    key: "status",
    editable: true,
    editor: { type: "select", options: ["active", "on-leave"] },
  },
  { key: "budget", editable: true, editor: "number" },
];

export function People({ rows, onSave }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      cellNavigation
      editHistory
      onCellEdit={(row, key, value) =>
        onSave({ ...row, [key]: value })
      }
    />
  );
}`,
    notes: {
      mantine:
        "The editors are Mantine's TextInput, NumberInput and NativeSelect, mounted in the cell — so an edit in progress carries your Mantine theme's focus ring and sizing.",
      mui: "Every editor is a small TextField — text, number and the select variant with MenuItem options — so a rejected value reports through the field's own error state and helperText rather than through chrome bolted beside it.",
      chakra:
        "The editors are Chakra's Input and NativeSelect at size sm; Chakra v3 ships no NumberInput here, so a number cell is an Input typed number and the validation message is the table's own.",
      antd: "Text and number both edit in an antd Input rather than an InputNumber — one control, one commit path — while a select column edits in antd's Select and a multi-select in the same Select in multiple mode.",
      radix:
        "Text and number edit in a TextField.Root, a select column edits in a Radix Select that commits on change, and a boolean edits in a Radix Checkbox.",
      "base-ui":
        "The editors are Base UI's Input, Select and Checkbox; because Base UI does not forward a ref to the inner input, the cell finds the focusable node itself when the editor mounts.",
      shadcn:
        "Text, number and select editors all share one class key, so every editor in the table is the same h-8 field over border-input — and a rejected commit reads as a form error in text-destructive, the tone shadcn already uses for one.",
      tailwind:
        "The editor is a native input or select carrying the map's field classes with an indigo focus ring; the validation and rollback parts carry no classes in this map, so a rejected commit reads as browser-default text.",
    },
    docs: ["cell-editing", "cell-navigation"],
  },
  {
    slug: "tree",
    label: "Tree data",
    h1: "Tree data in {kit}",
    title: "{kit} tree table — AdaptTable",
    description:
      "Render hierarchical rows in a {kit} data table — parent/child nesting, chevrons, keyboard traversal and expansion state carried in the URL.",
    intro: [
      "A tree grid is a different shape from a grouped table: the rows themselves nest, rather than being collected under synthetic headers. Point the table at `getChildren` or `getParentId` and it renders the hierarchy.",
      "Children indent under their parent, a chevron opens and closes each branch, and arrow keys walk the tree the way a tree widget should. Expansion is part of the table's state, so it lives in the URL like everything else.",
      "Sorting and filtering apply within the tree rather than flattening it — a branch keeps its shape, and a matching child keeps its ancestors on screen.",
    ],
    card: "Rows that contain rows — nesting, chevrons, keyboard traversal.",
    snippet: `import { DataTable } from "{pkg}";

export function Org({ people, columns }) {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      getParentId={(row) => row.managerId}
      treeColumn="name"
      urlKey="org"
    />
  );
}`,
    notes: {
      mantine:
        "The branch toggle is a Mantine ActionIcon in the tree column, and the indent is drawn on the kit's own cell — so a nested row is still a Mantine table row.",
      mui: "The branch toggle is a small IconButton whose caret rotates as it opens; the indent itself is a logical inline padding from the engine, so a nested row is still an ordinary TableRow.",
      chakra:
        "The branch toggle is a ghost IconButton with a rotating caret, and the indent is the engine's logical padding — a nested row stays a Table.Row.",
      antd: "The branch toggle is a text Button with a rotating caret rather than antd's built-in expand icon, which the adapter draws itself so the label follows the table's locale instead of the provider's.",
      radix:
        "The branch toggle is an IconButton around the engine's chevron, which points by writing direction rather than by rotation — so it turns the correct way in a right-to-left layout.",
      "base-ui":
        "The branch toggle is a Base UI Button holding a caret that rotates on open, and the indent is the engine's logical padding on the cell.",
      shadcn:
        "The branch toggle carries exactly the class the group toggle carries — one table can hold both, and two disclosure controls that looked different would read as two mechanisms.",
      tailwind:
        "The tree parts carry no classes in this map, so the branch toggle is a browser-default button; the engine's indent still lands, which is what keeps the hierarchy legible until you style it.",
    },
    docs: ["tree-data"],
  },
  {
    slug: "mobile-cards",
    label: "Mobile cards",
    h1: "Mobile cards in {kit}",
    title: "{kit} table mobile cards — AdaptTable",
    description:
      "A {kit} data table that becomes cards on phones — automatic below the mobile breakpoint, same filters and URL state, infinite scroll instead of a pager.",
    intro: [
      "Below the mobile breakpoint every row becomes a {kit} card. Same columns, same row content, same query state — there is nothing to configure and no second layout to build.",
      '`paginationMode="auto"` resolves to infinite scroll on phones and a pager on desktop. Per column, `mobileLabel` and `hideOnMobile` tune what a card shows.',
      "`renderCard` replaces the card's body with your own layout while the shell keeps selection, row actions and expansion — so a custom card is a layout decision, not a rewrite.",
    ],
    card: "Every row becomes a card on phones. Automatically, with the same state.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      paginationMode="auto"
      mobileBreakpoint={768}
      renderCard={(row, card) => (
        <MyCard row={row} {...card} />
      )}
    />
  );
}`,
    notes: {
      mantine:
        "Each card is a Mantine Card, and compact density switches it to the tighter Mantine padding — the phone layout inherits your theme rather than approximating it.",
      mui: "Each card is an outlined Card with a CardContent body, its labels Typography captions; compact density tightens the content padding, and the desktop table drops to MUI's own small size.",
      chakra:
        "Each card is a Card.Root with a Card.Body, labels and values are Text at Chakra's own scale, and compact density tightens the body padding and the gap between fields.",
      antd: "Each card is a small Card using antd's own title and extra slots for the leading and trailing controls, with the fields in a Descriptions list — antd's card stays small at either density, so compact tightens the gap between cards rather than the cards themselves.",
      radix:
        "Each card is a Radix Card that changes size with density — size 2 comfortable, size 1 compact — so the phone layout tightens the way the rest of a Radix app does.",
      "base-ui":
        "A card here is the adapter's own bordered surface rather than a Base UI component, since Base UI ships no Card; density tightens the gaps around it rather than the card's own padding.",
      shadcn:
        "Each card is a list item over bg-card and border-border, and density is real: the preset carries compact variants keyed off the density attribute the table writes on its root.",
      tailwind:
        "Each card is a list item carrying the map's rounded border and dark-mode variants; the map declares no density variants, so the density control changes the attribute without changing this look.",
    },
    docs: ["mobile"],
  },
  {
    slug: "scale",
    label: "Scale",
    h1: "Large datasets in {kit}",
    title: "{kit} data table at scale — AdaptTable",
    description:
      "Render 100,000 rows and 40 columns in a {kit} data table — row and column virtualization, sticky headers, pinned columns, and sorting that stays interactive.",
    intro: [
      "Turn `virtualize` on and the table renders the rows in view plus a small overscan, whatever the dataset's size. `virtualizeColumns` does the same across, for column sets far wider than the window.",
      "The header stays pinned, pinned columns stay put, and the scroll box scrolls — never the page. Sorting, filtering and selection keep working on the whole dataset rather than on what is drawn.",
      "Nothing about the markup changes: it is the same {kit} table, with the rows outside the window absent rather than hidden.",
    ],
    card: "100k rows, 40 columns, virtualized rows and columns, sticky chrome.",
    snippet: `import { DataTable } from "{pkg}";

export function Ledger({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      virtualize
      virtualizeColumns
      maxHeight={600}
      defaultColumnLayout={{ pinned: { name: "start" } }}
    />
  );
}`,
    notes: {
      mantine:
        "Virtualization happens inside Mantine's own scroll box — the sticky header and pinned cells are the adapter's, so the 100,000th row is styled exactly like the first.",
      mui: "The scroll box is a plain Box rather than MUI's TableContainer, whose own horizontal overflow would trap the sticky header; the header sticks per TableCell against the paper background, and the rows outside the window are spacer TableRows.",
      chakra:
        "The scroll box is a Box rather than a Table.ScrollArea, so the sticky header keeps working; each header cell carries the sticky rule, and pinned cells take an explicit opaque background so scrolled content cannot show through.",
      antd: "This is antd's own virtual table, not a second virtualizer over it: antd owns the scroller, so the adapter feeds it an explicit scroll size, drives infinite paging off antd's internal scroll position, and pins columns through antd's native fixed API.",
      radix:
        "Radix's Table.Root brings its own ScrollArea, so the adapter restores overflow on the inner table and hands it the min-width — without that the table shrinks to the viewport and a pinned column has nothing to stick against. Columns virtualize here as well as rows.",
      "base-ui":
        "The scroll box is the adapter's own element with an injected rule that lets the inner table exceed it, the header sticks by inline rule, and pinned cells take their opaque background from the adapter's surface token.",
      shadcn:
        "Sticky and pinned cells stay opaque because the preset paints them bg-card — a transparent pinned cell would show the rows sliding under it — and a windowed-out row is a real table row with a height and nothing in it.",
      tailwind:
        "The map paints the header and pinned cells opaque per element rather than through a token, which is what stops scrolled rows showing through them, and the scroll box contains its own overscroll.",
    },
    docs: ["virtualization"],
  },
  {
    slug: "columns",
    label: "Columns",
    h1: "Column management in {kit}",
    title: "{kit} table column management — AdaptTable",
    description:
      "Show, hide, reorder, pin and resize columns in a {kit} data table from a built-in menu — and persist the layout to the URL, storage or your server.",
    intro: [
      "Everything a user expects to do to a column, without writing a column-settings panel: show and hide, reorder by drag, pin to either edge, resize by drag or keyboard, and switch row density.",
      "Pinning is logical rather than physical, so a column pinned to the start stays on the correct side in a right-to-left layout.",
      "The arrangement is state like any other: persist it to the URL, to localStorage, or to your own server through `columnLayout` and `onColumnLayoutChange`.",
    ],
    card: "Show, hide, reorder, pin and resize — from a menu you did not write.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns, layout, onLayout }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      enableColumnMenu
      resizableColumns
      columnLayout={layout}
      onColumnLayoutChange={onLayout}
    />
  );
}`,
    notes: {
      mantine:
        "The column menu is a Mantine Popover — a Popover rather than a Menu, because the panel holds drag handles and arrow keys have to reorder rather than move a highlight — and every control in it is an ActionIcon.",
      mui: "The menu is a Popover rather than a Menu, so the grip's arrow keys reorder columns instead of walking menu items; visibility is an eye IconButton reporting aria-pressed rather than a checkbox.",
      chakra:
        "The menu is a Chakra Popover portalled out of the table, visibility is an eye IconButton with aria-pressed, and a pinned column's button turns solid — the sortable header itself is Chakra's styled button factory rather than a Button.",
      antd: "The menu is a controlled antd Popover with its content padding stripped, flipped by writing direction, and closed by a keydown listener the adapter adds — antd's Popover has no Escape handling of its own.",
      radix:
        "The menu is a Radix Popover, so Escape and outside click come free, and the drag grip is a real IconButton carrying the keyboard reorder keys rather than a decorative handle.",
      "base-ui":
        "The menu is a Base UI Popover mounted through its own portal and positioner, with an eye button per column and a grip that reorders from the keyboard as well as by drag.",
      shadcn:
        "The menu is a native disclosure — a positioned panel that closes on outside pointer-down and Escape — over bg-card, with hidden columns struck through in text-muted-foreground rather than merely dimmed.",
      tailwind:
        "The button, panel, grip, pin and resize handle all carry the map's classes, with an indigo active state; the search box, bulk buttons and overflow submenu are not in the map, so those read as browser defaults.",
    },
    docs: ["column-management", "columns"],
  },
  {
    slug: "filtering",
    label: "Filtering",
    h1: "Filtering in {kit}",
    title: "{kit} table filtering — AdaptTable",
    description:
      "Filter a {kit} data table with kit-native controls — text and number operators, date ranges, a checklist of present values, an AND/OR tree, and removable chips.",
    intro: [
      "Declare what a column filters by and the table builds the control: text and number operators, date ranges with relative presets, and a checklist of the values actually present.",
      "For the cases one row of inputs cannot express there is an AND/OR tree, and every active filter shows as a chip that removes itself.",
      "The whole filter state lives in the URL, so a filtered view is a link someone can send — and the popover, drawer, inputs and chips are all {kit} components.",
    ],
    card: "Kit-native operators, date ranges, checklists, an AND/OR tree, chips.",
    snippet: `import { DataTable } from "{pkg}";

const columns = [
  { key: "name", filter: "text" },
  {
    key: "team",
    filter: { type: "select", options: "auto" },
  },
  { key: "budget", filter: "numberRange" },
  { key: "hiredAt", filter: "dateRange" },
];

export function People({ rows }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      filtersMode="popover"
      urlKey="f"
    />
  );
}`,
    notes: {
      mantine:
        "The popover is Mantine's Popover and the drawer its Drawer; inside them the controls are TextInput, NumberInput, Select, MultiSelect and Checkbox — the filter form is Mantine all the way down.",
      mui: "The popover is a Popper over an elevated Paper rather than MUI's Popover, which is modal and would dim the table behind it; the drawer is a real Drawer, the operators are TextField selects, and a multi-select filter is an Autocomplete.",
      chakra:
        "The popover is Chakra's Popover and the drawer its Drawer, backdrop and all; inside, the operators are NativeSelects, the bounds are Inputs, and a multi-select filter is a group of Chakra Checkboxes.",
      antd: "The popover lets antd portal its Selects and pickers to the body the way antd does everywhere, and teaches the outside-click handler to ignore those layers instead — numbers filter through an InputNumber, and each active filter is a closable Tag.",
      radix:
        "Radix Themes ships no Drawer, so the drawer is a Dialog pinned to the inline edge; the popover holds its ground by clamping its own height rather than flipping, and the chips are full-radius Badges.",
      "base-ui":
        "The popover shifts rather than flips — the form grows when an operator takes a second bound, and flipping threw it over the page header — and the drawer is Base UI's, with its swipe direction mirrored for right-to-left.",
      shadcn:
        "Plain DOM has no collision detection, so the popover clamps itself to the viewport in script; the drawer is a real modal dialog with its own focus trap, and a checkbox option hides its native box and turns the whole label into the swatch.",
      tailwind:
        "The backdrop, panel, popover and every filter input carry the map's classes with an indigo focus ring, and a checked option fills its label in indigo; the checklist and the AND/OR builder are not in the map, so they read as browser defaults.",
    },
    intros: {
      shadcn: [
        "Declare what a column filters by and the table builds the control: text and number operators, date ranges with relative presets, and a checklist of the values actually present.",
        "For the cases one row of inputs cannot express there is an AND/OR tree, and every active filter shows as a chip that removes itself.",
        "The whole filter state lives in the URL, so a filtered view is a link someone can send — and the popover, drawer, inputs and chips are semantic markup wearing shadcn's tokens rather than components you have to install.",
      ],
      tailwind: [
        "Declare what a column filters by and the table builds the control: text and number operators, date ranges with relative presets, and a checklist of the values actually present.",
        "For the cases one row of inputs cannot express there is an AND/OR tree, and every active filter shows as a chip that removes itself.",
        "The whole filter state lives in the URL, so a filtered view is a link someone can send — and the popover, drawer, inputs and chips are native elements, each one addressable by class so the filter form looks like the form you wrote.",
      ],
    },
    docs: ["filtering", "filter-tree", "url-state"],
  },
  {
    slug: "export",
    label: "Export & print",
    h1: "Export and print in {kit}",
    title: "{kit} table export to CSV, Excel and PDF — AdaptTable",
    description:
      "Export a {kit} data table to CSV, XLSX or PDF from one toolbar button — grouped sheets with outline levels, selected ranges only, and a real print layout.",
    intro: [
      "One `exportCsv` prop puts an export button in the toolbar, and one `scope` decides what leaves: the current page, every filtered row, or exactly the cells selected.",
      "Swap the writer and the same button produces a different file. `xlsxWriter` writes Excel outline levels for grouped rows and bolds the totals; `pdfWriter` lays out a paginated document, right-to-left scripts included when you hand it a font.",
      "`printTable` opens the browser's own print dialog against a layout built for paper rather than a screenshot of the page.",
    ],
    card: "CSV, XLSX and PDF from one seam — plus a real print layout.",
    snippet: `import { DataTable } from "{pkg}";
import { xlsxWriter } from "@adapttable/core/xlsx";

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      groupBy="team"
      exportCsv={{
        scope: "all",
        filename: "people.xlsx",
        writer: xlsxWriter({ sheetName: "People" }),
      }}
    />
  );
}`,
    notes: {
      mantine:
        "The export control is a Mantine Button in the kit's toolbar, and its busy state is Mantine's — the file is written off the main thread either way.",
      mui: "The export control is an outlined Button that grows a CircularProgress in its start-icon slot while the file is written — the Button's own loading prop arrived after the MUI version this adapter supports.",
      chakra:
        "The export control is a Chakra Button using the kit's own loading prop, so the spinner replaces the label and the button blocks a second press while the file is written.",
      antd: "The export control is an antd Button in its loading state, which takes the icon slot and disables the button for the duration — antd's own answer to a control that is working.",
      radix:
        "The export control wraps its label in Radix's Spinner rather than swapping it out, which keeps the button the same width so the toolbar does not reflow when an export starts.",
      "base-ui":
        "Base UI ships no loading button, so the busy affordance is the adapter's own spinner element — the same one the filter form uses — beside a disabled Button.",
      shadcn:
        "There is no kit button to borrow a loading state from, so the spinner is a bare element the preset styles: a spinning ring built from a transparent-topped border.",
      tailwind:
        "The button and its spinner are both plain elements the map styles — the same construction shadcn's preset uses, in this map's own neutrals.",
    },
    docs: ["export-pdf"],
  },
  {
    slug: "selection",
    label: "Selection",
    h1: "Row selection in {kit}",
    title: "{kit} table row selection — AdaptTable",
    description:
      "Select rows in a {kit} data table and act on them in bulk — a set of ids that survives paging, kit-native checkboxes, and bulk actions with confirmation.",
    intro: [
      "Tick rows one at a time or take the whole page from the header box. The selection is a set of ids rather than a slice of what is rendered, so a row chosen on page one is still chosen while page three is on screen.",
      "Bulk actions run against that set, can ask for confirmation first, and report back through your own handler — the table never performs the write.",
      "Selection is controllable: hand it `selectedIds` and `onSelectionChange` and it becomes state your app owns.",
    ],
    card: "A set of ids that survives paging, with bulk actions over it.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns, onArchive }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      bulkActions={[
        {
          key: "archive",
          label: "Archive",
          confirm: true,
          onAction: (ids) => onArchive(ids),
        },
      ]}
    />
  );
}`,
    notes: {
      mantine:
        "Every box is a Mantine Checkbox, indeterminate state included, and the bulk bar that appears above the table is built from Mantine Buttons.",
      mui: "Every box is a MUI Checkbox in a checkbox-padded TableCell, indeterminate included, and the bulk bar is a Stack of contained Buttons with a Tooltip explaining any action it has to disable.",
      chakra:
        "Every box is Chakra's Checkbox — v3 spells the mixed state as a checked value rather than a flag — and the bulk bar is an HStack of Buttons above the table.",
      antd: "The row boxes come from antd's own rowSelection API rather than a column the adapter draws, so the part name lands inside the cell here; the bulk bar is an antd Alert banner with its action slot, which is antd's own batch-operation pattern.",
      radix:
        "Every box is a Radix Checkbox with a real mixed state, and the bulk bar is a plain Flex of Buttons — Radix's Callout is saved for the error chrome rather than spent on a toolbar.",
      "base-ui":
        "Base UI's Checkbox draws a genuine mixed state — a dash rather than a tick — and where a box carries a visible label the part moves to the label wrapper, because that is the element Base UI names.",
      shadcn:
        "The boxes are native checkboxes tinted with accent-primary and set indeterminate through a ref, since HTML has no attribute for it; the bulk bar sits on bg-accent above the table.",
      tailwind:
        "The boxes are native checkboxes tinted indigo, a selected row takes an indigo wash that has its own dark variant, and the bulk bar is styled to match.",
    },
    docs: ["selection"],
  },
  {
    slug: "grouping",
    label: "Grouping",
    h1: "Row grouping in {kit}",
    title: "{kit} table row grouping — AdaptTable",
    description:
      "Group rows in a {kit} data table by one key or several — nested group headers with counts, per-group subtotals, group footers, and collapse state in the URL.",
    intro: [
      "Pass `groupBy` and rows fold into {kit} group headers with counts. Pass a list and each key nests inside the one before it, however deep the nesting goes.",
      "`groupAggregates` adds per-group subtotals from the same mapper `summaryRow` uses, so every header totals its whole subtree and `groupFooters` closes each group with the same numbers.",
      "Collapse state travels in the URL, and export writes the grouped sheet — outline levels and all — rather than the flat rows underneath it.",
    ],
    card: "Nested group headers with counts, subtotals, footers and collapse state.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      groupBy={["team", "status"]}
      groupFooters
      groupAggregates={(group) => ({
        budget: group.reduce(
          (sum, row) => sum + row.budget,
          0
        ),
      })}
    />
  );
}`,
    notes: {
      mantine:
        "A group header is a Mantine table row with the kit's own chevron ActionIcon, and on phones it becomes a Mantine Card header — the same grouping, both layouts.",
      mui: "A group header is a TableRow with a spanning TableCell holding an IconButton chevron, a Checkbox and Typography; the footer is the same component with the controls taken away, and the summary sits in a real TableFooter.",
      chakra:
        "A group header is a Table.Row with a spanning cell — IconButton chevron, Chakra Checkbox, Text label and count — and the footer is that same row with its controls removed.",
      antd: "Group headers and footers are records spliced into antd's own dataSource and spanned through its onCell hook, so grouping happens inside antd's Table rather than around it; the summary row is antd's Table.Summary.",
      radix:
        "A group header is a real Table.Row with a spanning cell, and its toggle wraps the engine's chevron — which points by writing direction rather than rotating, so it reads correctly right-to-left.",
      "base-ui":
        "A group header is a table row with a spanning cell carrying the indent, a Base UI Checkbox for the tri-state group selection, and the engine's chevron inside a Base UI Button.",
      shadcn:
        "A group row sits on bg-muted, and the footer flips the rule rather than the colour — same surface, a top border instead of a bottom one — so a group reads as opening and closing on the same note.",
      tailwind:
        "The group row, toggle, label, count and aggregate all carry the map's classes with a dark variant; group footers and the show-more row are not in the map, so those two read as browser defaults.",
    },
    docs: ["row-grouping"],
  },
  {
    slug: "column-groups",
    label: "Column groups",
    h1: "Column groups in {kit}",
    title: "{kit} collapsible column groups — AdaptTable",
    description:
      "Span {kit} table headers over related columns and collapse each group on its own — to an arrow stub, a kept child, or a cell you draw.",
    intro: [
      "A parent with `children` is a column group. This table has three, two children each, open by default. Collapse one to see its mode. Actions stays ungrouped at the end.",
      'Contact is Name + Role with no collapse options: fold is the chevron. Assignment is Team + Status with `collapsedKey: "team"`. Delivery is Timeline + Budget with `collapsedRender` ($25,300 for 35 days) and `align: "start"`.',
      "`collapsibleColumnGroups` arms the toggles. The headers and the chevrons are {kit}.",
    ],
    card: "Spanning headers that collapse to a stub, a kept child, or a custom cell.",
    snippet: `import { DataTable, type ColumnInput } from "{pkg}";

const columns: ColumnInput<Person>[] = [
  {
    header: "Contact",
    children: [
      { key: "name", header: "Name" },
      { key: "role", header: "Role" },
    ],
  },
  {
    header: "Assignment",
    collapsedKey: "team",
    children: [
      { key: "team", header: "Team" },
      { key: "status", header: "Status" },
    ],
  },
  {
    header: "Delivery",
    align: "start",
    collapsedRender: (row) => row.budget + " for 35 days",
    children: [
      { key: "timeline", header: "Timeline" },
      { key: "budget", header: "Budget" },
    ],
  },
];

export function People({ rows }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      collapsibleColumnGroups
    />
  );
}`,
    notes: {
      mantine:
        "A group header is a centred Mantine Table.Th spanning its children, with the kit's ActionIcon chevron; a collapsed stub hides the visible caption and the button name still says the group.",
      mui: "A group header is a centred TableCell spanning its children, with an IconButton chevron; a collapsed stub keeps the group name on aria-label rather than as visible text.",
      chakra:
        "A group header is a centred Table.ColumnHeader spanning its children, with a Chakra IconButton chevron; a collapsed stub keeps the name on the control, not as a lonely caption.",
      antd: "Grouped columns are antd's own parent columns with children, so the spanning header is antd's — the chevron is antd's Button, and a collapsed stub hides the caption while the accessible name still says Delivery.",
      radix:
        "A group header is a centred Radix ColumnHeaderCell spanning its children, with the kit Button around the chevron; a collapsed stub keeps the name on the accessible label.",
      "base-ui":
        "A group header is a centred Base UI ColumnHeaderCell spanning its children, with a Base UI Button chevron; a collapsed stub keeps the name on the control.",
      shadcn:
        "A group header sits on the thead with the preset's classes, spanning its children, and the toggle is a native button wearing the map; a collapsed stub hides the caption.",
      tailwind:
        "A group header is a spanning th carrying the map's classes; the toggle is a native button, and a collapsed stub hides the caption while the accessible name still names the group.",
    },
    docs: ["column-groups", "columns"],
  },
  {
    slug: "rtl",
    label: "RTL",
    h1: "Right-to-left {kit} data table",
    title: "{kit} RTL data table — AdaptTable",
    description:
      "A {kit} data table in Arabic that mirrors the whole layout — search, sort arrows, pinned columns, the pager and the filters popover, which anchors and flips from the correct edge.",
    intro: [
      "An Arabic table mirrors the entire layout — search, sort arrows, pinned columns and the pager. Not just translated strings: a genuinely flipped axis.",
      "The filters popover anchors and flips from the correct edge; that is the part only a real RTL page can show.",
      '`locale="ar"` sets the strings and the direction. The table and the popover are {kit}.',
    ],
    card: "Arabic strings, a flipped axis, and a popover that opens from the right edge.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      locale="ar"
      filtersMode="popover"
    />
  );
}`,
    notes: {
      mantine:
        '`locale="ar"` flips the Mantine table and its Popover — the Filters trigger is Arabic, and the popover anchors from the inline-end edge.',
      mui: '`locale="ar"` flips the MUI table; the filters card is the same Popper-over-Paper the English page uses, now opening from the inline-end edge.',
      chakra:
        '`locale="ar"` flips the Chakra table and its Popover, which anchors from the inline-end edge the way the rest of a Chakra RTL app does.',
      antd: '`locale="ar"` flips the antd table; the filters popover still lets antd portal its pickers, and it opens from the inline-end edge rather than hanging off the left.',
      radix:
        '`locale="ar"` flips the Radix table; the popover holds its ground by clamping height rather than flipping, and it hangs from the inline-end edge.',
      "base-ui":
        '`locale="ar"` flips the Base UI table; the popover still shifts rather than flips, and its swipe direction on the drawer is already mirrored for right-to-left.',
      shadcn:
        '`locale="ar"` flips the semantic table; the popover clamps itself to the viewport in script and hangs from the inline-end edge, same as the English page, only mirrored.',
      tailwind:
        '`locale="ar"` flips the native table; the popover, backdrop and inputs carry the map\'s classes, and they open from the inline-end edge.',
    },
    docs: ["i18n-rtl"],
  },
  {
    slug: "realtime",
    label: "Realtime",
    h1: "Live updates in {kit}",
    title: "{kit} live-updating data table — AdaptTable",
    description:
      "Patch rows into a {kit} data table as they arrive — websocket-style updates through the row-patch API, so sort, filters and selection survive, with a feed of every applied change.",
    intro: [
      "Rows patch in as they arrive, the way a websocket would. This page applies one budget change at a time so the movement is followable.",
      "Patches go through the row-patch API rather than replacing the array, so search, filters and sort re-run for the touched rows only — your scroll and selection survive.",
      "The feed lists every patch as it lands. The table is {kit}.",
    ],
    card: "Rows change while you read them. Sort and selection hold.",
    snippet: `import { DataTable } from "{pkg}";
import { applyRowPatches, updateRow } from "@adapttable/core";

export function People({ rows, columns, setRows }) {
  const patchBudget = (id, budget) =>
    setRows(
      applyRowPatches(
        rows,
        [updateRow(id, { budget })],
        (row) => row.id
      )
    );
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
    />
  );
}`,
    notes: {
      mantine:
        "The feed beside the table is the host's chrome; the rows themselves are Mantine table rows, and a patched budget is the same cell with a new value.",
      mui: "The feed is the host's chrome; a patched budget is a MUI TableCell that re-renders with the new number, inside the same TableRow that was already there.",
      chakra:
        "The feed is the host's chrome; a patched budget is a Chakra Table.Cell that re-renders with the new number, inside the same Table.Row.",
      antd: "The feed is the host's chrome; a patched budget re-renders through antd's own Table cell, so the row stays an antd record rather than being swapped for a new one.",
      radix:
        "The feed is the host's chrome; a patched budget is a Radix Table.Cell that re-renders with the new number.",
      "base-ui":
        "The feed is the host's chrome; a patched budget is a Base UI table cell that re-renders with the new number.",
      shadcn:
        "The feed is the host's chrome; a patched budget is an ordinary cell wearing the preset, with a new number inside it.",
      tailwind:
        "The feed is the host's chrome; a patched budget is an ordinary cell carrying the map's classes, with a new number inside it.",
    },
    docs: ["realtime", "cell-editing"],
  },
  {
    slug: "rows",
    label: "Rows",
    h1: "Rows in {kit}",
    title: "{kit} table rows — AdaptTable",
    description:
      "Pin, drag-reorder and merge cells in a {kit} data table — a 3-dot row-action menu, sticky top and bottom pins, Team written once down consecutive teammates, and add or delete through host callbacks.",
    intro: [
      "A row is more than a record. Pin it under the header or to the floor of the scroll box, drag it by the grip (Space lifts, arrows move, Space drops), and merge cells that share a team so the name is written once.",
      '`onRowReorder`, `onPinnedRowIdsChange`, `getCellSpan` and `rowActionsLayout="menu"` are the four props this page turns on. Add and delete are callbacks to the host — the table never owns the data.',
      "The grips, the pin actions, the menu and the merged cells are {kit}.",
    ],
    card: "Pin, drag-reorder, merge cells, and a 3-dot menu per row.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns, onReorder, setPinned, spanTeam }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowActionsLayout="menu"
      onRowReorder={onReorder}
      onPinnedRowIdsChange={setPinned}
      getCellSpan={spanTeam}
    />
  );
}`,
    notes: {
      mantine:
        "The grip is a Mantine ActionIcon, pin and delete live in a Mantine Menu, and a Team merge is one Table.Td with rowspan — the same row chrome as the rest of a Mantine table.",
      mui: "The grip is an IconButton, pin and delete live in a MUI Menu, and a Team merge is one TableCell with rowSpan inside the same TableRow the unmerged cells sit on.",
      chakra:
        "The grip is a Chakra IconButton, pin and delete live in a Chakra Menu, and a Team merge is one Table.Cell with rowSpan.",
      antd: "The grip is antd's own handle column, pin and delete live in an antd Dropdown, and a Team merge is rowspan through antd's onCell hook so the span happens inside antd's Table.",
      radix:
        "The grip is a Radix IconButton, pin and delete live in a Radix DropdownMenu, and a Team merge is one Table.Cell with rowSpan.",
      "base-ui":
        "The grip is a Base UI Button, pin and delete live in a Base UI Menu, and a Team merge is one table cell with rowSpan.",
      shadcn:
        "The grip and the 3-dot trigger wear the preset's button classes, the menu is the same surface as every other overlay, and a Team merge is one td with rowspan.",
      tailwind:
        "The grip, the menu trigger and the merged cell all carry the map's classes; rowspan is the browser's, so the fill is yours to dress.",
    },
    docs: ["row-pinning", "row-reordering", "row-spanning"],
  },
  {
    slug: "nested-tables",
    label: "Nested tables",
    h1: "Nested tables in {kit}",
    title: "{kit} nested data table — AdaptTable",
    description:
      "Open a row in a {kit} data table onto another {kit} table — nested orders with their own columns and row keys, the same engine inside the panel, not a blank detail slot to build by hand.",
    intro: [
      "Open a row and the panel holds another {kit} table — the same component, not a hand-built list. Each person has recent orders; the inner table has its own columns and row keys.",
      "`nestedTable` mounts the kit's DataTable with defaults that keep the two tables from fighting over the URL. Rows with no nested table can still use `renderRowDetail`.",
      "The expand chevron and both tables are {kit}.",
    ],
    card: "A real table under a row — same engine, own columns, own keys.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns, orderColumns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      nestedTable={(row) => ({
        label: \`Orders for \${row.name}\`,
        table: (defaults) => (
          <DataTable
            {...defaults}
            data={row.orders}
            columns={orderColumns}
            rowKey={(order) => order.id}
          />
        ),
      })}
    />
  );
}`,
    notes: {
      mantine:
        "The chevron is a Mantine ActionIcon; the inner table is another Mantine DataTable, so the nested orders sort and page with Mantine controls rather than a list in a blank panel.",
      mui: "The chevron is an IconButton; the inner table is another MUI DataTable — same Table rows, own columns — not a Box of markup in getDetailPanelContent.",
      chakra:
        "The chevron is a Chakra IconButton; the inner table is another Chakra DataTable, so the nested orders are Chakra Table rows rather than a stack in a detail slot.",
      antd: "The chevron maps onto antd's native expandable API; the inner table is another antd DataTable, so the nested orders are antd records rather than expandedRowRender markup.",
      radix:
        "The chevron is a Radix IconButton; the inner table is another Radix DataTable, so the nested orders are Radix Table rows.",
      "base-ui":
        "The chevron is a Base UI Button; the inner table is another Base UI DataTable, so the nested orders are Base UI table rows.",
      shadcn:
        "The chevron wears the preset; the inner table is another shadcn DataTable, so the nested orders sit on the same bg-card surface as the parent.",
      tailwind:
        "The chevron and both tables carry the map's classes; the nested orders are a second native table, not a div pretending to be one.",
    },
    docs: ["tree-data", "row-expansion"],
  },
  {
    slug: "accessibility",
    label: "Accessibility",
    h1: "Accessible {kit} data table",
    title: "{kit} accessible data table — AdaptTable",
    description:
      "Use a {kit} data table from the keyboard or a screen reader — arrow-key cell focus with a visible ring, live announcements, and a header checkbox that selects a column without a modifier key.",
    intro: [
      "Tab into the grid and the arrows move a visible focus, one cell at a time. Home and End jump to the row's edges.",
      "Every move, sort, filter and edit is announced through a live region — the part of a table a sighted reader cannot check, so this page repeats those announcements as text as they happen.",
      "`columnSelectionCheckbox` puts a named checkbox on each header so a column can be selected without a modifier key a touchscreen does not have. The grid and the checkboxes are {kit}.",
    ],
    card: "Arrow-key focus, a visible ring, and every announcement shown as text.",
    snippet: `import { DataTable } from "{pkg}";

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      cellNavigation
      columnSelectionCheckbox
    />
  );
}`,
    notes: {
      mantine:
        "The grid is a Mantine table with a visible focus ring on the active cell, and each header checkbox is Mantine's own Checkbox — named for the column it selects.",
      mui: "The grid is MUI Table rows; the header checkbox is MUI's Checkbox, and the focus ring is the kit's outline on the active cell.",
      chakra:
        "The grid is Chakra Table rows; the header checkbox is Chakra's Checkbox, and the focus ring is the kit's outline on the active cell.",
      antd: "The grid is antd's Table; the header checkbox is antd's Checkbox, and the focus ring is the kit's outline on the active cell.",
      radix:
        "The grid is Radix Table rows; the header checkbox is a Radix Checkbox, and the focus ring is the kit's outline on the active cell.",
      "base-ui":
        "The grid is Base UI Table rows; the header checkbox is a Base UI Checkbox, and the focus ring is the kit's outline on the active cell.",
      shadcn:
        "The grid is semantic markup wearing the preset; the header checkbox is a native input with the preset's classes, and the focus ring is the same outline the rest of the table uses.",
      tailwind:
        "The grid is semantic markup carrying the map's classes; the header checkbox is a native input, and the focus ring is yours to dress — nothing in the map singles the active cell out.",
    },
    docs: ["accessibility", "cell-navigation"],
  },
];

/**
 * @param {MatrixFeature[]} features
 * @returns {MatrixFeature[]}
 */
function inDemandOrder(features) {
  const bySlug = Object.fromEntries(
    features.map((feature) => [feature.slug, feature])
  );
  const missing = FEATURE_DEMAND_ORDER.filter((slug) => !bySlug[slug]);
  const extra = features
    .map((feature) => feature.slug)
    .filter((slug) => !FEATURE_DEMAND_ORDER.includes(slug));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `FEATURE_DEMAND_ORDER is stale (missing ${missing.join(", ") || "—"}, extra ${extra.join(", ") || "—"})`
    );
  }
  return FEATURE_DEMAND_ORDER.map((slug) => bySlug[slug]);
}

/** The eighteen features, in the order the landing grid and rails show them. */
export const MATRIX_FEATURES = inDemandOrder(MATRIX_FEATURES_DEFINED);

/**
 * The adapter landing page's own copy.
 *
 * What is kit-specific here is not a swapped name: it is `tagline`, `surface`,
 * `install` and `provider`, each written per adapter against that adapter's
 * real source. The connective sentences are shared because the claim they make
 * — one engine, your kit's components — is the same claim for all eight, and
 * writing eight paraphrases of it would be the filler, not the fix.
 */
export const LANDING = {
  h1: "AdaptTable for {kit}",
  title: "AdaptTable for {kit} — a data table built from {peer}",
  description:
    "A batteries-included React data table for {kit}: filtering, grouping, pivot, editing, saved views and export, rendered with {peer}'s own components. Install {pkg}.",
  intro: [
    "{tagline}",
    "The engine is headless and shared — sorting, filtering, grouping, the pivot, URL state, saved views and export live in @adapttable/core. Every control you can see and click is {surface}.",
    "That is the whole trade: one model to learn, and a table that belongs in a {kit} app rather than sitting inside one.",
  ],
  /** The heading over the eighteen feature pages. */
  gridTitle: "Eighteen features, each on its own {kit} page",
  gridLead:
    "Every one is the same engine and {kit}'s own components. Each page carries the code for that feature and a table you can drive.",
  /** The heading over the other seven kits. */
  kitsTitle: "The same table, in seven other kits",
  kitsLead:
    "Switching kit changes the components, never the model — the props on this page are the props there.",
};

/**
 * Fill `{kit}`, `{pkg}` and `{peer}` from an adapter.
 *
 * @param {string} text
 * @param {ShowcaseAdapter} adapter
 * @returns {string}
 */
export const fillTemplate = (text, adapter) =>
  text
    .replaceAll("{tagline}", adapter.tagline)
    .replaceAll("{surface}", adapter.surface)
    .replaceAll("{kit}", adapter.label)
    .replaceAll("{pkg}", adapter.pkg)
    .replaceAll("{peer}", adapter.peer);

/**
 * The paragraphs a feature page opens with, for the kit it is written for.
 *
 * @param {MatrixFeature} feature
 * @param {ShowcaseAdapter} adapter
 * @returns {string[]}
 */
export const introFor = (feature, adapter) =>
  feature.intros?.[adapter.key] ?? feature.intro;

/**
 * The landing page's `<title>` and meta description for this kit.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {{ title: string, description: string }}
 */
export const landingHead = (adapter) =>
  adapter.landing ?? { title: LANDING.title, description: LANDING.description };

/**
 * The adapters whose own pages are built. Every other kit is reachable, and
 * shown, through the live demo pinned to it.
 *
 * @returns {ShowcaseAdapter[]}
 */
export const builtAdapters = () =>
  SHOWCASE_ADAPTERS.filter((adapter) => adapter.built);

/**
 * One built page of the matrix: an adapter landing, or an adapter's feature.
 *
 * @typedef {object} MatrixPageSpec
 * @property {string} adapter The adapter key.
 * @property {string | null} feature The feature slug, or `null` for the landing.
 * @property {string} dir The directory under the showcase root.
 */

/**
 * Every matrix page, landing first for each built adapter.
 *
 * @returns {MatrixPageSpec[]}
 */
export const matrixPages = () =>
  builtAdapters().flatMap((adapter) => [
    { adapter: adapter.key, feature: null, dir: adapter.key },
    ...MATRIX_FEATURES.map((feature) => ({
      adapter: adapter.key,
      feature: feature.slug,
      dir: `${adapter.key}/${feature.slug}`,
    })),
  ]);

/**
 * The adapter with this key.
 *
 * @param {string} key
 * @returns {ShowcaseAdapter | undefined}
 */
export const adapterByKey = (key) =>
  SHOWCASE_ADAPTERS.find((adapter) => adapter.key === key);

/**
 * The feature with this slug.
 *
 * @param {string} slug
 * @returns {MatrixFeature | undefined}
 */
export const featureBySlug = (slug) =>
  MATRIX_FEATURES.find((feature) => feature.slug === slug);
