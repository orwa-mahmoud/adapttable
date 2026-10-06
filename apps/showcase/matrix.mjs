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
 * page is for, and `{framework}` and `{binding}` from the framework that
 * adapter's kit is built on — see `fillTemplate`. They are the only
 * substitution: a sentence that would need more than a name swapped is written
 * per adapter in `notes`, or it is not written at all.
 *
 * Every adapter names its framework, and the framework decides how its pages
 * boot: the entry module the served HTML loads, the name the copy uses and the
 * code a feature page shows. A kit from another framework is an adapter entry
 * plus its framework's entry in {@link SHOWCASE_FRAMEWORKS}.
 */

/**
 * A framework the showcase serves kits from.
 *
 * @typedef {object} ShowcaseFramework
 * @property {string} key The framework's key, as `scripts/kits.mjs` spells it
 *   — `react`.
 * @property {string} label The framework's own name, as the copy says it —
 *   `React`.
 * @property {string} binding The binding package that connects the engine to
 *   the framework — `@adapttable/react`.
 * @property {string} entry The module every matrix page of the framework's kits
 *   boots, addressed from the showcase root as the served HTML loads it.
 */

/**
 * The frameworks the showcase serves kits from.
 *
 * @type {ShowcaseFramework[]}
 */
export const SHOWCASE_FRAMEWORKS = [
  {
    key: "react",
    label: "React",
    binding: "@adapttable/react",
    entry: "/src/entry-matrix.tsx",
  },
  {
    key: "angular",
    label: "Angular",
    binding: "@adapttable/angular",
    entry: "/src/angular/entry-matrix.ts",
  },
];

/** The framework every feature's `snippet` is written for. */
const SNIPPET_FRAMEWORK = "react";

/**
 * One UI kit AdaptTable adapts to.
 *
 * @typedef {object} ShowcaseAdapter
 * @property {string} key URL segment and switcher id — `mantine`.
 * @property {string} framework The framework the kit is built on — a key of
 *   {@link SHOWCASE_FRAMEWORKS}. Its pages boot that framework's entry.
 * @property {string} label The kit's own name — `Mantine`.
 * @property {string} blurb One phrase on the kit's look, for the switcher card.
 * @property {string} accentLight The kit's accent on a light page.
 * @property {string} accentDark The kit's accent on a dark page.
 * @property {string} pkg The adapter package a consumer installs.
 * @property {string} peer The kit's own packages, which stay peers.
 * @property {string} install The full install line, kit packages included.
 *   Release-preparation kits include a shell comment stating that publication
 *   must complete before the command can be used.
 * @property {string} provider The kit's provider component, or "" when the kit
 *   needs none.
 * @property {string} tagline The landing page's promise, one sentence.
 * @property {string} surface What the kit renders the table's chrome with —
 *   named components, verifiable in the adapter's source.
 * @property {boolean} built Whether this adapter has its own landing and
 *   feature pages yet. Until it does, the nav sends readers to the live demo
 *   pinned to that kit, which is a page that exists and shows that kit.
 * @property {readonly string[]} [features] The slugs of the matrix features
 *   this kit has a page for, where that is not every one of them — a kit whose
 *   framework is still gaining features lists the ones it renders today.
 * @property {boolean} [indexable] `false` keeps the kit's pages out of the
 *   sitemap and out of search indexes. Indexability describes the demo route,
 *   not package publication; release-preparation install copy must say so.
 * @property {{ title: string, description: string }} [landing] The landing
 *   page's `<title>` and meta description, where the shared pair would not be
 *   true of this kit. The unstyled family is the case it exists for: shadcn and
 *   Tailwind render semantic markup wearing classes, so "rendered with its own
 *   components" is a claim about them that is simply false. Every other kit
 *   uses `LANDING`; `tagline` and `surface` carry what differs in the body.
 * @property {string[]} [landingIntro] The landing page's paragraphs, where the
 *   shared ones would not read true of this kit: "a table that belongs in a
 *   {kit} app" names an app built on a kit, and an unstyled kit is no such
 *   thing.
 */

/**
 * Every adapter: React's eight in the order the switcher and the nav show
 * them, then the Angular kits.
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
    framework: "react",
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
    framework: "react",
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
    framework: "react",
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
    framework: "react",
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
    framework: "react",
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
    framework: "react",
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
    framework: "react",
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
      title: "shadcn/ui React data table examples — AdaptTable",
      description:
        "Explore shadcn/ui React tables with your design tokens: filtering, editing, grouping, pivot and export. Optional features and MIT licensing.",
    },
    built: true,
  },
  {
    key: "tailwind",
    framework: "react",
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
      title: "Tailwind CSS React data table examples — AdaptTable",
      description:
        "Style an unstyled React data table with Tailwind CSS. Try filtering, editing, grouping and export with semantic HTML, class hooks and MIT licensing.",
    },
    built: true,
  },
  {
    key: "unstyled",
    framework: "angular",
    label: "Unstyled",
    blurb: "Native elements — your own CSS",
    accentLight: "oklch(0.55 0.2 18)",
    accentDark: "oklch(0.7 0.16 18)",
    pkg: "@adapttable/angular-unstyled",
    peer: "@angular/core",
    install:
      "pnpm add @adapttable/angular-unstyled @adapttable/angular @adapttable/core",
    provider: "",
    tagline:
      "Native elements and no opinions — every style is yours, addressed by part name.",
    surface:
      "native HTML elements, each carrying a `data-adapttable-part` name your CSS selects",
    landing: {
      title: "Unstyled Angular data table examples — AdaptTable",
      description:
        "Explore an unstyled Angular data table: native elements you style yourself, with filtering, editing, grouping, virtualization and export. MIT licensed.",
    },
    landingIntro: [
      "{tagline}",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. Add features through explicit imports. The visible controls are {surface}.",
      "That is the whole trade: one model to learn, and a table that looks like the rest of your app because your own stylesheet draws it.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "ng-zorro",
    framework: "angular",
    label: "NG-ZORRO",
    blurb: "Ant Design components for Angular",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/ng-zorro",
    peer: "@angular/core",
    install:
      "pnpm add @adapttable/ng-zorro @adapttable/angular @adapttable/core ng-zorro-antd @angular/forms @angular/router",
    provider: "",
    tagline:
      "Ant Design tables, forms and overlays, with the same optional features and host-owned data.",
    surface:
      "real NG-ZORRO controls, each carrying the same `data-adapttable-part` hooks",
    landing: {
      title: "NG-ZORRO Angular data table examples — AdaptTable",
      description:
        "Explore an NG-ZORRO Angular data table with Ant Design controls for filtering, editing, grouping, pivot, virtualization, export and AI. MIT licensed.",
    },
    landingIntro: [
      "{tagline}",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. Add features through explicit imports. The visible controls are {surface}.",
      "Load NG-ZORRO’s stylesheet in your application. The table and every optional feature use its components, including the assistant and approval dialogs.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "material",
    framework: "angular",
    label: "Angular Material",
    blurb: "Material surfaces, native controls",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/angular-material",
    peer: "@angular/material",
    install:
      "# Follow the kit setup guide for compatible peers\npnpm add @adapttable/angular-material @adapttable/angular @angular/material@22.2.1 @angular/cdk@22.2.1 @angular/forms@^22 rxjs@^7.8.0",
    provider: "",
    tagline:
      "Angular Material controls and overlays with optional features and host-owned data.",
    surface:
      "native Angular Material controls carrying the shared data-adapttable-part hooks",
    landing: {
      title: "Angular Material Angular data table examples — AdaptTable",
      description:
        "Explore the Angular Material adapter for Angular: filtering, editing, grouping, pivot, virtualization and export. First public 0.1.0 release in preparation.",
    },
    landingIntro: [
      "{tagline}",
      "This adapter is available on npm. Follow its Angular setup guide for compatible peers, providers, styles and assets. Upgrade the binding and adapter together using their declared dependency ranges.",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. The visible controls are {surface}.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "ng-bootstrap",
    framework: "angular",
    label: "ng-bootstrap",
    blurb: "Bootstrap styling, Angular overlays",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/ng-bootstrap",
    peer: "@ng-bootstrap/ng-bootstrap",
    install:
      "# Follow the kit setup guide for compatible peers\npnpm add @adapttable/ng-bootstrap @adapttable/angular @ng-bootstrap/ng-bootstrap@21.0.0 @popperjs/core@2.11.8 @angular/forms@^22 @angular/localize@^22 rxjs@^7.4.0",
    provider: "",
    tagline:
      "ng-bootstrap controls and overlays with optional features and host-owned data.",
    surface:
      "ng-bootstrap overlays and Bootstrap-styled native controls carrying the shared data-adapttable-part hooks",
    landing: {
      title: "ng-bootstrap Angular data table examples — AdaptTable",
      description:
        "Explore the ng-bootstrap adapter for Angular: filtering, editing, grouping, pivot, virtualization and export. First public 0.1.0 release in preparation.",
    },
    landingIntro: [
      "{tagline}",
      "This adapter is available on npm. Follow its Angular setup guide for compatible peers, providers, styles and assets. Upgrade the binding and adapter together using their declared dependency ranges.",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. The visible controls are {surface}.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "aria",
    framework: "angular",
    label: "Angular Aria",
    blurb: "Accessible behavior, precise styling",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/angular-aria",
    peer: "@angular/aria",
    install:
      "# Follow the kit setup guide for compatible peers\npnpm add @adapttable/angular-aria @adapttable/angular @angular/aria@22.2.1 @angular/cdk@22.2.1 @angular/forms@^22 rxjs@^7.8.2",
    provider: "",
    tagline:
      "Angular Aria controls and overlays with optional features and host-owned data.",
    surface:
      "Aria composite behavior and adapter-owned native controls carrying the shared data-adapttable-part hooks",
    landing: {
      title: "Angular Aria Angular data table examples — AdaptTable",
      description:
        "Explore the Angular Aria adapter for Angular: filtering, editing, grouping, pivot, virtualization and export. First public 0.1.0 release in preparation.",
    },
    landingIntro: [
      "{tagline}",
      "This adapter is available on npm. Follow its Angular setup guide for compatible peers, providers, styles and assets. Upgrade the binding and adapter together using their declared dependency ranges.",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. The visible controls are {surface}.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "ngx-bootstrap",
    framework: "angular",
    label: "ngx-bootstrap",
    blurb: "Bootstrap controls and overlays",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/ngx-bootstrap",
    peer: "ngx-bootstrap",
    install:
      "# Follow the kit setup guide for compatible peers\npnpm add @adapttable/ngx-bootstrap @adapttable/angular ngx-bootstrap@22.0.0 @angular/forms@^22 rxjs@^7.4.0",
    provider: "",
    tagline:
      "ngx-bootstrap controls and overlays with optional features and host-owned data.",
    surface:
      "ngx-bootstrap overlays and Bootstrap-styled native controls carrying the shared data-adapttable-part hooks",
    landing: {
      title: "ngx-bootstrap Angular data table examples — AdaptTable",
      description:
        "Explore the ngx-bootstrap adapter for Angular: filtering, editing, grouping, pivot, virtualization and export. First public 0.1.0 release in preparation.",
    },
    landingIntro: [
      "{tagline}",
      "This adapter is available on npm. Follow its Angular setup guide for compatible peers, providers, styles and assets. Upgrade the binding and adapter together using their declared dependency ranges.",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. The visible controls are {surface}.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "angular-cdk",
    framework: "angular",
    label: "Angular CDK",
    blurb: "CDK behavior, a neutral theme",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/angular-cdk",
    peer: "@angular/cdk",
    install:
      "# Follow the kit setup guide for compatible peers\npnpm add @adapttable/angular-cdk @adapttable/angular @angular/cdk@22.2.1 @angular/forms@^22 rxjs@^7.8.2",
    provider: "",
    tagline:
      "Angular CDK controls and overlays with optional features and host-owned data.",
    surface:
      "adapter-owned native controls enhanced with CDK accessibility, overlays and shared data-adapttable-part hooks",
    landing: {
      title: "Angular CDK Angular data table examples — AdaptTable",
      description:
        "Explore the Angular CDK adapter for Angular: filtering, editing, grouping, pivot, virtualization and export. First public 0.1.0 release in preparation.",
    },
    landingIntro: [
      "{tagline}",
      "This adapter is available on npm. Follow its Angular setup guide for compatible peers, providers, styles and assets. Upgrade the binding and adapter together using their declared dependency ranges.",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. The visible controls are {surface}.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "spartan",
    framework: "angular",
    label: "Spartan",
    blurb: "Sharp borders, subtle elevation",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/spartan",
    peer: "@spartan-ng/brain",
    install:
      "# Follow the kit setup guide for compatible peers\npnpm add @adapttable/spartan @adapttable/angular @spartan-ng/brain@1.5.0 @angular/cdk@^22 @angular/forms@^22 rxjs@^7.8.0 tailwindcss@^4 clsx@^2.1.1 tw-animate-css@^1",
    provider: "",
    tagline:
      "Spartan controls and overlays with optional features and host-owned data.",
    surface:
      "Spartan Brain controls with the adapter-owned Helm layer and shared data-adapttable-part hooks",
    landing: {
      title: "Spartan Angular data table examples — AdaptTable",
      description:
        "Explore the Spartan adapter for Angular: filtering, editing, grouping, pivot, virtualization and export. First public 0.1.0 release in preparation.",
    },
    landingIntro: [
      "{tagline}",
      "This adapter is available on npm. Follow its Angular setup guide for compatible peers, providers, styles and assets. Upgrade the binding and adapter together using their declared dependency ranges.",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. The visible controls are {surface}.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
  },
  {
    key: "taiga-ui",
    framework: "angular",
    label: "Taiga UI",
    blurb: "Soft surfaces, expressive controls",
    accentLight: "oklch(0.55 0.21 255)",
    accentDark: "oklch(0.73 0.14 255)",
    pkg: "@adapttable/taiga-ui",
    peer: "@taiga-ui/core",
    install:
      "# Follow the kit setup guide for compatible peers\npnpm add @adapttable/taiga-ui @adapttable/angular @taiga-ui/core@5.26.0 @taiga-ui/kit@5.26.0 @taiga-ui/cdk@5.26.0 @taiga-ui/i18n@5.26.0 @taiga-ui/styles@5.26.0 @taiga-ui/icons@5.26.0 @taiga-ui/event-plugins@^5 @taiga-ui/design-tokens@~0.320.0 @angular/cdk@^22 @angular/forms@^22 @angular/router@^22 rxjs@^7.8.2",
    provider: "AdaptTaigaRoot",
    tagline:
      "Taiga UI controls and overlays with optional features and host-owned data.",
    surface:
      "native Taiga UI controls carrying the shared data-adapttable-part hooks",
    landing: {
      title: "Taiga UI Angular data table examples — AdaptTable",
      description:
        "Explore the Taiga UI adapter for Angular: filtering, editing, grouping, pivot, virtualization and export. First public 0.1.0 release in preparation.",
    },
    landingIntro: [
      "{tagline}",
      "This adapter is available on npm. Follow its Angular setup guide for compatible peers, providers, styles and assets. Upgrade the binding and adapter together using their declared dependency ranges.",
      "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. The visible controls are {surface}.",
    ],
    built: true,
    features: [
      "filtering",
      "selection",
      "row-reordering",
      "editing",
      "grouping",
      "export",
      "scale",
      "mobile-cards",
      "saved-views",
      "tree",
      "nested-tables",
      "rows",
      "column-groups",
      "columns",
      "aggregation",
      "pivot",
      "formulas",
      "rtl",
      "realtime",
      "accessibility",
      "ai",
    ],
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
 * @property {string} snippet The code, with the adapter's real import path,
 *   for a kit built on React. Templated.
 * @property {Record<string, string>} [snippets] The code for a kit built on
 *   another framework, keyed by framework. A page is never served with code
 *   written for a different framework — see `snippetFor`.
 * @property {Record<string, string>} notes What is true about this feature in
 *   THIS kit, keyed by adapter — the sentence that cannot be templated. A kit
 *   with nothing honest to add has no entry, and the page shows none.
 * @property {Record<string, string[]>} [intros] The intro this feature needs in
 *   THIS kit, keyed by adapter, where a shared paragraph would state something
 *   untrue of it. Two features say outright that every control "comes from" the
 *   kit's package, which is the one claim the unstyled family cannot make: it
 *   renders semantic markup and takes classes. Those get an intro of their own
 *   here rather than a sentence bent far enough to cover both.
 * @property {Record<string, FeatureHead>} [heads] The label, heading, title,
 *   description or card this feature needs in THIS kit, keyed by adapter, where
 *   the shared one claims something the kit does not do yet.
 * @property {string[]} docs Documentation slugs this feature is written up in.
 */

/**
 * A kit's own wording for a feature's page, field by field; a field left out
 * is the shared one.
 *
 * @typedef {object} FeatureHead
 * @property {string} [label]
 * @property {string} [h1]
 * @property {string} [title]
 * @property {string} [description]
 * @property {string} [card]
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
  "row-reordering",
  "editing",
  "grouping",
  "aggregation",
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
  "ai",
];

/**
 * The matrix features that get a page per adapter.
 *
 * Curated rather than exhaustive: these are the ones people search for by name
 * and evaluate a table on. Pagination is not among them — every table pages,
 * and the docs already own that search. Column groups, RTL, realtime, rows,
 * nested tables and accessibility used to answer once for all eight kits (or
 * live only in the Lab / docs); they are features of a kit page now, the same
 * as filtering or grouping. AI is last in demand order — optional, and the
 * first tile to give up if a stronger search destination needs the slot.
 *
 * @type {MatrixFeature[]}
 */
const MATRIX_FEATURES_DEFINED = [
  {
    slug: "saved-views",
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { filters } from "{pkg}/filters";
import { savedViews } from "{pkg}/saved-views";

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "team" },
  { key: "budget", sortable: true },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      urlKey="people"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    filters([]),
    savedViews({ storageKey: "people-views", urlKey: "people" }),
  ];
}`,
    },
    label: "Saved views",
    h1: "Saved views in {kit}",
    title: "{kit} table saved views — AdaptTable",
    description:
      "Save and restore {kit} table filters, sorting and column layouts. Try named views, default views and shareable URLs in this interactive example.",
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
import { savedViews } from "{pkg}/saved-views";

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
        features={[savedViews({ storageKey: "people-views" })]}
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
    heads: {
      angular: {
        description:
          "Save and restore {kit} {framework} table filters, sorting and column layouts as named views from the views menu.",
        card: "Name an arrangement and restore it from the menu.",
      },
      "ng-zorro": {
        description:
          "Save and restore {kit} {framework} table filters, sorting and column layouts as named views from the views menu.",
        card: "Name an arrangement and restore it from the menu.",
      },
    },
    intros: {
      angular: [
        "A view is the table's state — search, sort, filters and the column layout — saved under a name.",
        "Save one from the views menu and pick it again later to put the table back the way it was. The list lives in this browser's storage, or in any store you hand `savedViews`.",
      ],
      "ng-zorro": [
        "A view is the table's state — search, sort, filters and the column layout — saved under a name.",
        "Save one from the views menu and pick it again later to put the table back the way it was. The list lives in this browser's storage, or in any store you hand `savedViews`.",
      ],
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
    snippets: {
      angular: `import { Component, computed, input } from "@angular/core";
import { AdaptDataTable } from "{pkg}";
import {
  AdaptPivotPanel, injectPivotUrlState, pivot, pivotTableModel,
  type PivotField,
} from "{pkg}/pivot";

@Component({
  selector: "app-spend",
  imports: [AdaptDataTable, AdaptPivotPanel],
  template: \`
    <adapt-pivot-panel
      [fields]="fields" [config]="state.config()"
      [onChange]="state.onConfigChange"
    />
    <adapt-data-table
      [data]="model().rows" [columns]="model().columns"
      [rowKey]="model().rowKey" [summaryRow]="model().summaryRow"
    />
  \`,
})
export class Spend {
  readonly rows = input.required<readonly Person[]>();
  readonly fields: readonly PivotField[] = [
    { key: "team", label: "Team" }, { key: "status", label: "Status" },
    { key: "budget", label: "Budget" },
  ];
  readonly state = injectPivotUrlState({
    urlKey: "p",
    defaultConfig: {
      rows: ["team"], columns: ["status"],
      measures: [{ key: "budget", agg: "sum" }],
    },
  });
  readonly model = computed(() => pivotTableModel(
    pivot(this.rows(), this.state.config(), { collapsed: this.state.collapsed() }),
    { fields: this.fields },
  ));
}`,
    },
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
import {
  pivot,
  pivotTableModel,
  usePivotUrlState,
} from "@adapttable/react/pivot";

export function Spend({ rows, fields }) {
  const { config, onConfigChange, collapsed } = usePivotUrlState({
    urlKey: "p",
    defaultConfig: {
      rows: ["team"],
      columns: ["status"],
      measures: [{ key: "budget", agg: "sum" }],
    },
  });
  const model = pivotTableModel(pivot(rows, config, { collapsed }), {
    fields,
  });
  return (
    <>
      <PivotPanel fields={fields} config={config} onChange={onConfigChange} />
      <DataTable
        data={model.rows}
        columns={model.columns}
        rowKey={model.rowKey}
        summaryRow={model.summaryRow}
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
    snippets: {
      angular: `import { Component, computed, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { buildFormulaColumns, injectFormulaUrlState } from "@adapttable/angular/formula";
import { AdaptDataTable } from "{pkg}";

@Component({
  selector: "app-computed-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()" [columns]="columns()" [rowKey]="rowKey"
    />
  \`,
})
export class ComputedPeople {
  readonly rows = input.required<readonly Person[]>();
  readonly baseColumns = input.required<readonly ColumnDef<Person>[]>();
  readonly rowKey = (row: Person) => row.id;
  readonly state = injectFormulaUrlState({
    urlKey: "fx",
    defaultFormulas: [
      { key: "margin", header: "Margin", formula: "=ROUND(budget * 0.15, 0)" },
    ],
  });
  readonly columns = computed(() => [
    ...this.baseColumns(),
    ...buildFormulaColumns<Person>(this.state.formulas()).columns,
  ]);
}`,
    },
    label: "Formulas",
    h1: "Spreadsheet formulas in {kit}",
    title: "{kit} table formulas — AdaptTable",
    description:
      "Try spreadsheet formulas in a {kit} table: ROUND, POWER, SQRT and IF, computed columns and explicit cell errors. Includes {framework} integration code.",
    intro: [
      "A formula column is a column nobody wrote code for: type `=ROUND(budget * 0.15, 0)` and the table computes it per row, sorts it, filters it and exports it like any other column.",
      "The engine covers arithmetic including POWER and SQRT, comparison, string joins, IF, and the aggregate functions a footer needs. A bad reference reports in the cell that caused it rather than blanking the table, and a circular reference reports `#CYCLE!` instead of recursing.",
      "Formula columns serialize to the URL with everything else, so a derived column travels in the same link as the filters it sits beside.",
    ],
    card: "ROUND, POWER, SQRT, IF — computed columns, errors in the cell.",
    snippet: `import { DataTable } from "{pkg}";
import { buildFormulaColumns } from "@adapttable/react/formula";

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
      columns={[...columns, ...derived.columns]}
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { cellNavigation } from "{pkg}/cell-navigation";
import { editing } from "{pkg}/editing";

const columns: ColumnDef<Person>[] = [
  {
    key: "name",
    editable: true,
    editor: "text",
    validate: (value) => (String(value).trim() ? undefined : "Required"),
  },
  { key: "budget", editable: true, editor: "number" },
  {
    key: "status",
    editable: true,
    editor: { type: "select", options: ["Active", "Planned", "Blocked"] },
  },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly save =
    input.required<(row: Person, key: string, value: unknown) => void>();
  readonly features = [
    editing<Person>((row, key, value) => this.save()(row, key, value)),
    cellNavigation(),
  ];
}`,
    },
    heads: {
      angular: {
        description:
          "Try inline editing in a {kit} {framework} table with text, number, date and select editors. Your application validates and saves each change.",
        card: "Native editors in the cell; every write goes through your handler.",
      },
      "ng-zorro": {
        description:
          "Try inline editing in a {kit} {framework} table with text, number, date and select editors. Your application validates and saves each change.",
        card: "Native editors in the cell; every write goes through your handler.",
      },
    },
    intros: {
      angular: [
        "Mark a column `editable`, compose `editing(onCellEdit)`, and double-click opens a {kit} editor in the cell — text, number, date or select. Enter commits, Escape cancels.",
        "The table never mutates your rows. It hands your handler the row, the column key and the new value, and a column's `validate` refuses a value before it reaches you: clear a name and try to commit it.",
        "With `cellNavigation()` composed, the arrow keys move a visible focus from cell to cell.",
      ],
      "ng-zorro": [
        "Mark a column `editable`, compose `editing(onCellEdit)`, and double-click opens an NG-ZORRO editor in the cell — text, number, date or select. Enter commits, Escape cancels.",
        "The table never mutates your rows. It hands your handler the row, the column key and the new value, and a column's `validate` refuses a value before it reaches you: clear a name and try to commit it.",
        "With `cellNavigation()` composed, the arrow keys move a visible focus from cell to cell.",
      ],
    },
    label: "Editing",
    h1: "Inline cell editing in {kit}",
    title: "{kit} editable data table — AdaptTable",
    description:
      "Try inline editing in a {kit} {framework} table with text, number and select inputs, paste and undo. Your application validates and saves each change.",
    intro: [
      "Mark a column `editable`, compose `editing(onCellEdit)`, and double-click opens a {kit} editor in the cell. Enter commits, Escape cancels, Tab moves to the next editable cell.",
      "The table never mutates your rows. It hands your handler the row, the column and the new value, and shows whatever you hand back — which is what makes optimistic updates, validation and rollback yours to decide.",
      "With `cellNavigation` on, the same handler receives whole blocks: paste a spreadsheet range with Ctrl+V, drag the fill handle, and undo the entire paste with one Ctrl+Z.",
    ],
    card: "Kit-native editors in the cell; every write goes through your handler.",
    snippet: `import { DataTable, type ColumnDef } from "{pkg}";
import { cellNavigation } from "{pkg}/cell-navigation";
import { editHistory, editing } from "{pkg}/editing";

const columns: ColumnDef<Person>[] = [
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
      features={[
        cellNavigation(),
        editHistory(),
        editing((row: Person, key, value) =>
          onSave({ ...row, [key]: value })
        ),
      ]}
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
      "Explore a {kit} {framework} tree table with parent-child rows, expandable branches, keyboard navigation and URL expansion state. Includes integration code.",
    intro: [
      "A tree grid is a different shape from a grouped table: the rows themselves nest, rather than being collected under synthetic headers. Compose `tree()` with `getChildren` or `getParentId` and it renders the hierarchy.",
      "Children indent under their parent, a chevron opens and closes each branch, and arrow keys walk the tree the way a tree widget should. Expansion is part of the table's state, so it lives in the URL like everything else.",
      "Sorting and filtering apply within the tree rather than flattening it. Moving a child under a new parent is a host callback on the row-reordering page — the table never rewrites your tree.",
    ],
    card: "Nesting, chevrons, URL expansion, and host-owned tree moves.",
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { tree } from "{pkg}/tree";

interface Employee {
  id: string;
  name: string;
  team: string;
  managerId?: string;
}

const columns: ColumnDef<Employee>[] = [{ key: "name" }, { key: "team" }];

@Component({
  selector: "app-org",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="people()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class Org {
  readonly people = input.required<readonly Employee[]>();
  readonly columns = columns;
  readonly rowKey = (row: Employee) => row.id;
  readonly features = [
    tree<Employee>({ getParentId: (row) => row.managerId, treeColumn: "name" }),
  ];
}`,
    },
    heads: {
      angular: {
        description:
          "Explore a {kit} {framework} tree table with parent-child rows, expandable branches, lazy children and phone cards. Includes integration code.",
        card: "Nesting, chevrons, lazy children, and a tree on phones.",
      },
      "ng-zorro": {
        description:
          "Explore a {kit} {framework} tree table with parent-child rows, expandable branches, lazy children and phone cards. Includes integration code.",
        card: "Nesting, chevrons, lazy children, and a tree on phones.",
      },
    },
    intros: {
      angular: [
        "A tree grid is a different shape from a grouped table: the rows themselves nest, rather than being collected under synthetic headers. Compose `tree()` with `getChildren` or `getParentId` and it renders the hierarchy.",
        "Children indent under their parent and a {kit} chevron control in the tree column opens and closes each branch. Give `hasChildren` and `onLoadChildren` and a branch fetches its children as it opens, showing that it is loading; a failed fetch closes it again, so the next click retries.",
        "On a phone each card leads with the same chevron and indents by depth. Sorting reorders each branch in place, and a search shows the rows it matches.",
      ],
      "ng-zorro": [
        "A tree grid is a different shape from a grouped table: the rows themselves nest, rather than being collected under synthetic headers. Compose `tree()` with `getChildren` or `getParentId` and it renders the hierarchy.",
        "Children indent under their parent and an NG-ZORRO button in the tree column opens and closes each branch. Give `hasChildren` and `onLoadChildren` and a branch fetches its children as it opens, showing that it is loading; a failed fetch closes it again, so the next click retries.",
        "On a phone each card leads with the same chevron and indents by depth. Sorting reorders each branch in place, and a search shows the rows it matches.",
      ],
    },
    snippet: `import { DataTable } from "{pkg}";
import { tree } from "{pkg}/tree";

export function Org({ people, columns }) {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        tree({ getParentId: (row) => row.managerId, treeColumn: "name" }),
      ]}
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";

const columns: ColumnDef<Person>[] = [
  { key: "name", mobileLabel: "" },
  { key: "team", mobileLabel: "Team" },
  { key: "email", hideOnMobile: true },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly features = [];
}`,
    },
    heads: {
      angular: {
        description:
          "A {kit} {framework} data table that becomes cards on phones — automatic below the mobile breakpoint, with the same columns and state and infinite scroll in place of the pager.",
      },
      "ng-zorro": {
        description:
          "A {kit} {framework} data table that becomes cards on phones — automatic below the mobile breakpoint, with the same columns and state and infinite scroll in place of the pager.",
      },
    },
    intros: {
      angular: [
        "Below the mobile breakpoint every row becomes a card — same columns, same row content, same query state. This page forces the card layout inside a phone-width frame.",
        "Per column, `mobileLabel` and `hideOnMobile` tune what a card shows, and on a phone the pager gives way to infinite scroll: the next rows load as the list reaches its end. There is no second layout to build.",
      ],
      "ng-zorro": [
        "Below the mobile breakpoint every row becomes a card — same columns, same row content, same query state. This page forces the card layout inside a phone-width frame.",
        "Per column, `mobileLabel` and `hideOnMobile` tune what a card shows, and on a phone the pager gives way to infinite scroll: the next rows load as the list reaches its end. There is no second layout to build.",
      ],
    },
    label: "Mobile cards",
    h1: "Mobile cards in {kit}",
    title: "{kit} responsive table and mobile cards — AdaptTable",
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { virtualize } from "{pkg}/virtualize";

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "team" },
  { key: "budget", sortable: true },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      paginationMode="infinite"
      [maxHeight]="480"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly features = [virtualize()];
}`,
    },
    heads: {
      angular: {
        description:
          "Scroll a large {kit} {framework} table with row virtualization inside a scroll box. Sorting and filtering keep working on every row.",
        card: "40,000 rows in a scroll box, only the visible ones rendered.",
      },
      "ng-zorro": {
        description:
          "Scroll a large {kit} {framework} table with row virtualization inside a scroll box. Sorting and filtering keep working on every row.",
        card: "40,000 rows in a scroll box, only the visible ones rendered.",
      },
    },
    intros: {
      angular: [
        "Compose `virtualize()` and the table renders the rows in view plus a small overscan, whatever the dataset's size — forty thousand rows on this page, a few dozen of them in the page at once.",
        "The scroll box scrolls rather than the page, and sorting and filtering keep working on the whole dataset rather than on what is drawn. `virtualize({ virtualizeColumns: true })` does the same across, for column sets wider than the box.",
      ],
      "ng-zorro": [
        "Compose `virtualize()` and the table renders the rows in view plus a small overscan, whatever the dataset's size — forty thousand rows on this page, a few dozen of them in the page at once.",
        "The scroll box scrolls rather than the page, and sorting and filtering keep working on the whole dataset rather than on what is drawn. `virtualize({ virtualizeColumns: true })` does the same across, for column sets wider than the box.",
      ],
    },
    label: "Scale",
    h1: "Row and column virtualization in {kit}",
    title: "{kit} virtualized {framework} table — AdaptTable",
    description:
      "Scroll a large {kit} {framework} table with row and column virtualization, sticky headers and pinned columns. Try sorting and inspect the integration code.",
    intro: [
      "Compose `virtualize()` and the table renders the rows in view plus a small overscan, whatever the dataset's size. `virtualize({ virtualizeColumns: true })` does the same across, for column sets far wider than the window.",
      "The header stays pinned, pinned columns stay put, and the scroll box scrolls — never the page. Sorting, filtering and selection keep working on the whole dataset rather than on what is drawn.",
      "Nothing about the markup changes: it is the same {kit} table, with the rows outside the window absent rather than hidden.",
    ],
    card: "100k rows, 40 columns, virtualized rows and columns, sticky chrome.",
    snippet: `import { DataTable } from "{pkg}";
import { virtualize } from "{pkg}/virtualize";

export function Ledger({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[virtualize({ virtualizeColumns: true })]}
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
    snippets: {
      angular: `import { Component, input, signal } from "@angular/core";
import type { ColumnDef, ColumnLayoutState } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { columnMenu } from "{pkg}/column-menu";
import { resizableColumns } from "{pkg}/resizable-columns";

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()" [columns]="columns()" [rowKey]="rowKey"
      [features]="features" [columnLayout]="layout()"
      (columnLayoutChange)="layout.set($event)"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = input.required<readonly ColumnDef<Person>[]>();
  readonly rowKey = (row: Person) => row.id;
  readonly layout = signal<ColumnLayoutState>({
    hidden: [], order: [], widths: {}, pinned: { name: "start" },
  });
  readonly features = [columnMenu(), resizableColumns()];
}`,
    },
    label: "Columns",
    h1: "Column management in {kit}",
    title: "{kit} table column pinning and resizing — AdaptTable",
    description:
      "Pin, resize, reorder, rename and hide {kit} table columns. Try the column menu and persist layouts to URLs, storage or your application.",
    intro: [
      "Everything a user expects to do to a column, without writing a column-settings panel: rename, show and hide, reorder by drag, pin to either edge, resize by drag or keyboard, and switch row density.",
      "Pinning is logical rather than physical, so a column pinned to the start stays on the correct side in a right-to-left layout.",
      "The arrangement is state like any other: persist it to the URL, to localStorage, or to your own server through `columnLayout` and `onColumnLayoutChange`.",
    ],
    card: "Show, hide, reorder, pin and resize — from a menu you did not write.",
    snippet: `import { DataTable } from "{pkg}";
import { columnMenu } from "{pkg}/column-menu";
import { resizableColumns } from "{pkg}/resizable-columns";

export function People({ rows, columns, layout, onLayout }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[columnMenu(), resizableColumns()]}
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { filters } from "{pkg}/filters";
import { headerFilters } from "{pkg}/header-filters";

const columns: ColumnDef<Person>[] = [
  { key: "name", filter: "text" },
  { key: "team", filter: { type: "multiSelect", options: "auto" } },
  { key: "budget", filter: "numberRange" },
  { key: "hiredAt", filter: "dateRange" },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      urlKey="f"
      filtersMode="popover"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly features = [filters([]), headerFilters()];
}`,
    },
    heads: {
      angular: {
        description:
          "Try {kit} {framework} table filters: text, ranges, multi-selects, a yes/no choice and an AND/OR tree, in a popover, a drawer or header funnels, shared through the URL.",
        card: "Ranges, selects, an AND/OR tree and chips — all in the URL.",
      },
      "ng-zorro": {
        description:
          "Try {kit} {framework} table filters: text, ranges, multi-selects, a yes/no choice and an AND/OR tree, in a popover, a drawer or header funnels, shared through the URL.",
        card: "Ranges, selects, an AND/OR tree and chips — all in the URL.",
      },
    },
    label: "Filtering",
    h1: "Filtering in {kit}",
    title: "{kit} table filtering — AdaptTable",
    description:
      "Try {kit} table filters: text, number and date operators, checklists and nested AND/OR groups. Share filters and find-query state through the URL.",
    intro: [
      "Declare what a column filters by and the table builds the control: text and number operators, date ranges with relative presets, and a checklist of the values actually present.",
      "For the cases one row of inputs cannot express there is an AND/OR tree, and every active filter shows as a chip that removes itself. Quick find is a different control — it highlights matching cells and writes `find=` into the same URL namespace; it does not replace the filter tree.",
      "Filter state and the find query both live in the versioned URL, so a filtered-and-found view is a link someone can send — and the popover, drawer, inputs, chips and find field are all {kit} components.",
    ],
    card: "Operators, an AND/OR tree, chips, and find in the same URL.",
    snippet: `import { DataTable, type ColumnDef } from "{pkg}";
import { filters } from "{pkg}/filters";

const columns: ColumnDef<Person>[] = [
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
      features={[filters([])]}
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
      angular: [
        "Declare what a column filters by and the table builds the form: text with its operators, number and date ranges, multi-select checkboxes and a yes/no choice, each using {kit} controls.",
        "Filters opens as an anchored popover or as a drawer, with an AND/OR tree at the top for what one row of inputs cannot say. Header funnels filter one column in place, and every active filter shows as a chip that removes itself.",
        "Filter state lives in the versioned URL, so a filtered view is a link someone can send.",
      ],
      "ng-zorro": [
        "Declare what a column filters by and the table builds the form: text with its operators, number and date ranges, multi-select checkboxes and a yes/no choice, each an NG-ZORRO control.",
        "Filters opens as an anchored popover or as a drawer, with an AND/OR tree at the top for what one row of inputs cannot say. Header funnels filter one column in place, and every active filter shows as a chip that removes itself.",
        "Filter state lives in the versioned URL, so a filtered view is a link someone can send.",
      ],
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { exportCsv } from "{pkg}/export";

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "team" },
  { key: "budget", sortable: true },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly features = [exportCsv()];
}`,
    },
    heads: {
      angular: {
        label: "CSV export",
        h1: "CSV export in {kit}",
        title: "{kit} {framework} table export to CSV — AdaptTable",
        description:
          "Export a {kit} {framework} data table to CSV from one toolbar button — the rows as they are sorted and filtered on screen.",
        card: "One toolbar button, a CSV of the table as it stands.",
      },
      "ng-zorro": {
        label: "CSV export",
        h1: "CSV export in {kit}",
        title: "{kit} {framework} table export to CSV — AdaptTable",
        description:
          "Export a {kit} {framework} data table to CSV from one toolbar button — the rows as they are sorted and filtered on screen.",
        card: "One toolbar button, a CSV of the table as it stands.",
      },
    },
    intros: {
      angular: [
        "Compose `exportCsv()` and an export button joins the toolbar. It writes the page on screen as it stands — sorted, filtered and searched — to a CSV file the browser downloads.",
        "A column's `exportValue` decides what the file gets, so a cell that shows a formatted date range exports the plain start date a spreadsheet sorts.",
      ],
      "ng-zorro": [
        "Compose `exportCsv()` and an export button joins the toolbar. It writes the page on screen as it stands — sorted, filtered and searched — to a CSV file the browser downloads.",
        "A column's `exportValue` decides what the file gets, so a cell that shows a formatted date range exports the plain start date a spreadsheet sorts.",
      ],
    },
    label: "Export & print",
    h1: "Export and print in {kit}",
    title: "{kit} table export to CSV, Excel and PDF — AdaptTable",
    description:
      "Export a {kit} data table to CSV, XLSX or PDF from one toolbar button — browser files or cancellable server jobs with live progress.",
    intro: [
      "One `exportCsv()` feature puts an export button in the toolbar, and one `scope` decides what leaves: the current page, every filtered row, or exactly the cells selected.",
      "Swap the writer and the same button produces a different file. `xlsxWriter` writes Excel outline levels for grouped rows and bolds the totals; `pdfWriter` lays out a paginated document, right-to-left scripts included when you hand it a font.",
      "Past the 50,000-row browser cap, `onExportAll` sends the page-free current view to your backend while the kit shows determinate or indeterminate progress, Cancel, Retry, and the finished download.",
      "`printTable` opens the browser's own print dialog against a layout built for paper rather than a screenshot of the page.",
    ],
    card: "Browser files or cancellable server jobs — CSV, XLSX and PDF.",
    snippet: `import { DataTable } from "{pkg}";
import { exportCsv } from "{pkg}/export";

export function People({ source, columns, api }) {
  return (
    <DataTable
      source={source}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        exportCsv({
          scope: "all",
          onExportAll: async (query, controls) =>
            api.buildExport(query, {
              signal: controls.signal,
              onProgress: controls.setProgress,
              onMessage: controls.setMessage,
            }),
        }),
      ]}
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
    docs: ["exporting", "export-pdf"],
  },
  {
    slug: "selection",
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { bulkActions } from "{pkg}/bulk-actions";

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "team" },
  { key: "budget", sortable: true },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [selectable]="true"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly archive = input.required<(ids: string[]) => void>();
  readonly features = [
    bulkActions([
      { key: "archive", label: "Archive", onClick: (ids) => this.archive()(ids) },
    ]),
  ];
}`,
    },
    heads: {
      angular: {
        description:
          "Select {kit} {framework} table rows with native checkboxes and run bulk actions through your own handler. The selection is a set of row ids that survives paging.",
      },
      "ng-zorro": {
        description:
          "Select {kit} {framework} table rows with NG-ZORRO checkboxes and run bulk actions through your own handler. The selection is a set of row ids that survives paging.",
      },
    },
    intros: {
      angular: [
        "Tick rows one at a time or take the whole page from the header box, then every matching row from the banner that offers it. The selection is a set of ids rather than a slice of what is rendered, so a row chosen on page one is still chosen while page two is on screen.",
        "Bulk actions run against that set and report back through your own handler — the table never performs the write. This page writes what each action received under the table.",
      ],
      "ng-zorro": [
        "Tick rows one at a time or take the whole page from the header box, then every matching row from the banner that offers it. The selection is a set of ids rather than a slice of what is rendered, so a row chosen on page one is still chosen while page two is on screen.",
        "Bulk actions run against that set and report back through your own handler — the table never performs the write. This page writes what each action received under the table.",
      ],
    },
    label: "Selection",
    h1: "Row selection in {kit}",
    title: "{kit} table row selection — AdaptTable",
    description:
      "Select {kit} table rows with native checkboxes and run confirmed bulk actions. Keep selection across pages using stable row IDs.",
    intro: [
      "Tick rows one at a time or take the whole page from the header box. The selection is a set of ids rather than a slice of what is rendered, so a row chosen on page one is still chosen while page three is on screen.",
      "Bulk actions run against that set, can ask for confirmation first, and report back through your own handler — the table never performs the write.",
      "Selection is controllable: hand it `selectedIds` and `onSelectionChange` and it becomes state your app owns.",
    ],
    card: "A set of ids that survives paging, with bulk actions over it.",
    snippet: `import { DataTable } from "{pkg}";
import { bulkActions } from "{pkg}/bulk-actions";

export function People({ rows, columns, onArchive }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        bulkActions([
          {
            key: "archive",
            label: "Archive",
            confirm: {
              title: "Archive people",
              message: (count) => \`Archive \${count} people?\`,
              confirmLabel: "Archive",
            },
            onClick: (ids) => onArchive(ids),
          },
        ]),
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { groupingPanel } from "{pkg}/grouping-panel";

const columns: ColumnDef<Person>[] = [
  { key: "name" },
  { key: "team" },
  { key: "status" },
  { key: "budget", aggregatable: { operations: ["sum", "avg"] } },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      urlKey="g"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly features = [groupingPanel(["team", "status"])];
}`,
    },
    heads: {
      angular: {
        description:
          "Group rows in a {kit} {framework} data table by dragging headers or from a select, reorder levels by keyboard, fold each group and read its totals in the header.",
        card: "Drag, select or keyboard grouping, with totals in the headers.",
      },
      "ng-zorro": {
        description:
          "Group rows in a {kit} {framework} data table by dragging headers or from a select, reorder levels by keyboard, fold each group and read its totals in the header.",
        card: "Drag, select or keyboard grouping, with totals in the headers.",
      },
    },
    intros: {
      angular: [
        "Compose `groupingPanel(groupBy)` and rows start nested by Team then Status. Drag a column header into the strip or add a level from its select, and reorder the levels by dragging a chip or with the arrow keys on its handle; every move is announced.",
        "Each group header folds its rows and shows its row count and the totals its columns declare as `aggregatable` — Budget sums here, and the panel changes the operation. The grouping travels in the URL.",
      ],
      "ng-zorro": [
        "Compose `groupingPanel(groupBy)` and rows start nested by Team then Status. Drag a column header into the strip or add a level from its select, and reorder the levels by dragging a chip or with the arrow keys on its handle; every move is announced.",
        "Each group header folds its rows and shows its row count and the totals its columns declare as `aggregatable` — Budget sums here, and the panel changes the operation. The grouping travels in the URL.",
      ],
    },
    label: "Grouping",
    h1: "Row grouping in {kit}",
    title: "{kit} table row grouping — AdaptTable",
    description:
      "Group rows interactively in a {kit} data table — drag headers, reorder grouping chips from the keyboard, use mobile selects, and override aggregations.",
    intro: [
      "Compose `groupingPanel(groupBy, extras)` and rows start nested by Team then Status. On desktop, drag any column header into the strip or drag its chips to reorder the levels.",
      "Every chip handle is keyboard movable with the arrow keys. On phones the same {kit} panel swaps drag targets for kit-native selects, without changing the grouping model.",
      "A column's `aggregatable` declaration seeds the grouping strip — every active column is its own item, with its own operation and remove. Group footers close each group. Independent pinned summary rows and the table footer total live on the aggregation page; moving rows inside a group lives on the row-reordering page.",
      "Collapse state travels in the URL, and export writes the grouped sheet — outline levels and all — rather than the flat rows underneath it.",
    ],
    card: "Drag, keyboard and mobile grouping controls with live aggregation overrides.",
    snippet: `import { DataTable } from "{pkg}";
import { groupingPanel } from "{pkg}/grouping-panel";

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        groupingPanel(["team", "status"], {
          groupFooters: true,
        }),
      ]}
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
    docs: ["row-grouping", "pinned-summary-rows", "row-reordering"],
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnInput } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { collapsibleColumnGroups } from "{pkg}/column-groups";

interface Member {
  id: string;
  name: string;
  team: string;
  status: string;
  budget: number;
}

const columns: ColumnInput<Member>[] = [
  { key: "name", header: "Name" },
  {
    header: "Assignment",
    collapsedKey: "team",
    children: [
      { key: "team", header: "Team" },
      { key: "status", header: "Status" },
    ],
  },
  {
    header: "Budget",
    collapsedRender: (row) => \`$\${row.budget}\`,
    children: [{ key: "budget", header: "Amount" }],
  },
];

@Component({
  selector: "app-members",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class Members {
  readonly rows = input.required<readonly Member[]>();
  readonly columns = columns;
  readonly rowKey = (row: Member) => row.id;
  readonly features = [collapsibleColumnGroups()];
}`,
    },
    intros: {
      angular: [
        "A parent with `children` is a column group: its caption spans its columns in a header row of its own. This table has three, open by default; collapse one to see how it folds.",
        'Assignment is Team + Status with `collapsedKey: "team"`, so it keeps Team. Delivery is Timeline + Budget with `collapsedRender`, so it draws the budget in one cell. Workload has neither, so it folds to a narrow stub.',
        "`collapsibleColumnGroups` arms the toggles. The group headers use {kit} buttons.",
      ],
      "ng-zorro": [
        "A parent with `children` is a column group: its caption spans its columns in a header row of its own. This table has three, open by default; collapse one to see how it folds.",
        'Assignment is Team + Status with `collapsedKey: "team"`, so it keeps Team. Delivery is Timeline + Budget with `collapsedRender`, so it draws the budget in one cell. Workload has neither, so it folds to a narrow stub.',
        "`collapsibleColumnGroups` arms the toggles. The group headers and their buttons use NG-ZORRO’s table and button components.",
      ],
    },
    snippet: `import { DataTable, type ColumnInput } from "{pkg}";
import { collapsibleColumnGroups } from "{pkg}/column-groups";

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
      features={[collapsibleColumnGroups()]}
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
    intros: {
      angular: [
        "Arabic labels and cell values mirror the table, its pager and the filter popover. Pinning uses logical edges, so start is the right edge.",
        'Pass `getLabels("ar")` to `labels` and `getDirection("ar")` to `dir`. Every table, including nested tables, receives the same presentation settings.',
        "Append `?locale=ar&dir=rtl` to any Angular feature page to exercise its real table in Arabic and right-to-left layout.",
      ],
      "ng-zorro": [
        "Arabic labels and cell values mirror the table, its pager and the filter popover. Pinning uses logical edges, so start is the right edge.",
        'Pass `getLabels("ar")` to `labels` and `getDirection("ar")` to `dir`. Every table, including nested tables, receives the same presentation settings.',
        "Append `?locale=ar&dir=rtl` to any Angular feature page to exercise its real table in Arabic and right-to-left layout.",
      ],
    },
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { getDirection, getLabels } from "@adapttable/i18n";
import { AdaptDataTable } from "{pkg}";
import { filters } from "{pkg}/filters";

@Component({
  selector: "app-arabic-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()" [columns]="columns()" [rowKey]="rowKey"
      [dir]="dir" [labels]="labels" [features]="features"
      filtersMode="popover"
    />
  \`,
})
export class ArabicPeople {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = input.required<readonly ColumnDef<Person>[]>();
  readonly rowKey = (row: Person) => row.id;
  readonly dir = getDirection("ar");
  readonly labels = getLabels("ar");
  readonly features = [filters([{ key: "name", type: "text", label: "الاسم" }])];
}`,
    },
    label: "RTL",
    h1: "Right-to-left {kit} data table",
    title: "{kit} RTL data table — AdaptTable",
    description:
      "Try an Arabic RTL data table in {kit}: mirrored layout, logical column pinning, translated controls and filter popovers that open on the correct side.",
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
    snippets: {
      angular: `import { Component, input, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { applyRowPatches, updateRow } from "@adapttable/core";
import { AdaptDataTable } from "{pkg}";

@Component({
  selector: "app-live-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()" [columns]="columns()" [rowKey]="rowKey"
    />
  \`,
})
export class LivePeople {
  readonly rows = signal<readonly Person[]>([]);
  readonly columns = input.required<readonly ColumnDef<Person>[]>();
  readonly rowKey = (row: Person) => row.id;

  patchBudget(id: string, budget: number): void {
    this.rows.update((rows) => applyRowPatches(
      rows, [updateRow<Person>(id, { budget })], this.rowKey,
    ));
  }
}`,
    },
    label: "Realtime",
    h1: "Live updates in {kit}",
    title: "{kit} live-updating data table — AdaptTable",
    description:
      "See live row updates in a {kit} {framework} table. Apply incremental patches while preserving sort, filters and selection, with an on-page update feed.",
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
        [updateRow<Person>(id, { budget })],
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
    title: "{kit} table row pinning and cell spanning — AdaptTable",
    description:
      "Try {kit} table row pinning, merged cells and row-action menus. Keep rows at the top or bottom and handle add/delete operations in your application.",
    intro: [
      "A row is more than a record. Pin it under the header or to the floor of the scroll box, merge cells that share a team so the name is written once, and add or delete through the 3-dot menu.",
      '`rowPinning()`, `cellSpan()` and `rowActionsLayout="menu"` are what this page turns on. Add and delete are callbacks to the host — the table never owns the data. Movement across flat, grouped and tree rows lives on the dedicated row-reordering page.',
      "The pin actions, the menu and the merged cells are {kit}. Independent pinned summary rows — totals that are not data rows — live on the aggregation page.",
    ],
    card: "Pin rows, merge cells, and a 3-dot menu for add and delete.",
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { cellSpan } from "{pkg}/cell-span";
import { rowActions } from "{pkg}/row-actions";
import { rowPinning } from "{pkg}/row-pinning";

const columns: ColumnDef<Person>[] = [{ key: "name" }, { key: "team" }];

function spanTeam({
  column,
  sectionRows,
  sectionRowIndex,
}: {
  column: { key: string };
  sectionRows: readonly Person[];
  sectionRowIndex: number;
}) {
  if (column.key !== "team") return undefined;
  const team = sectionRows[sectionRowIndex]?.team;
  if (sectionRows[sectionRowIndex - 1]?.team === team) return undefined;
  let rowSpan = 1;
  while (sectionRows[sectionRowIndex + rowSpan]?.team === team) rowSpan += 1;
  return rowSpan > 1 ? { rowSpan } : undefined;
}

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly features = [
    rowPinning(),
    cellSpan(spanTeam),
    rowActions<Person>([], { layout: "menu" }),
  ];
}`,
    },
    heads: {
      angular: {
        title: "{kit} table row pinning and cell spanning — AdaptTable",
        description:
          "Try {kit} {framework} table row pinning and merged cells: keep rows at the top or bottom from each row's menu, and write a team that runs down the page once.",
        card: "Pin rows from a 3-dot menu, and merge a team that runs down the page.",
      },
      "ng-zorro": {
        title: "{kit} table row pinning and cell spanning — AdaptTable",
        description:
          "Try {kit} {framework} table row pinning and merged cells: keep rows at the top or bottom from each row's menu, and write a team that runs down the page once.",
        card: "Pin rows from a 3-dot menu, and merge a team that runs down the page.",
      },
    },
    intros: {
      angular: [
        "A row is more than a record. Pin it to the top or the bottom from its 3-dot menu, and merge a team that runs down consecutive rows so the name is written once.",
        '`rowPinning()`, `cellSpan()` and a `"menu"` row-actions layout are what this page turns on. The table holds the pinned rows and keeps them in the URL, so a reload or a shared link keeps them where they were; pass `pinnedRowIds` to hold them yourself.',
        "Grouping and trees refuse pinning: a nested list is not a flat pin stack. The pin keeps a team merge together — the person moves, the team stays one cell.",
      ],
      "ng-zorro": [
        "A row is more than a record. Pin it to the top or the bottom from its 3-dot menu, and merge a team that runs down consecutive rows so the name is written once.",
        '`rowPinning()`, `cellSpan()` and a `"menu"` row-actions layout are what this page turns on. The table holds the pinned rows and keeps them in the URL, so a reload or a shared link keeps them where they were; pass `pinnedRowIds` to hold them yourself.',
        "Grouping and trees refuse pinning: a nested list is not a flat pin stack. The pin keeps a team merge together — the person moves, the team stays one cell.",
      ],
    },
    snippet: `import { DataTable } from "{pkg}";
import { cellSpan } from "{pkg}/cell-span";
import { rowPinning } from "{pkg}/row-pinning";

export function People({ rows, columns, setPinned, spanTeam }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      rowActionsLayout="menu"
      features={[
        rowPinning({ onPinnedRowIdsChange: setPinned }),
        cellSpan(spanTeam),
      ]}
    />
  );
}`,
    notes: {
      mantine:
        "Pin and delete live in a Mantine Menu, and a Team merge is one Table.Td with rowspan — the same row chrome as the rest of a Mantine table. The drag grip lives on the row-reordering page.",
      mui: "Pin and delete live in a MUI Menu, and a Team merge is one TableCell with rowSpan inside the same TableRow the unmerged cells sit on. The drag grip lives on the row-reordering page.",
      chakra:
        "Pin and delete live in a Chakra Menu, and a Team merge is one Table.Cell with rowSpan. The drag grip lives on the row-reordering page.",
      antd: "Pin and delete live in an antd Dropdown, and a Team merge is rowspan through antd's onCell hook so the span happens inside antd's Table. The drag grip lives on the row-reordering page.",
      radix:
        "Pin and delete live in a Radix DropdownMenu, and a Team merge is one Table.Cell with rowSpan. The drag grip lives on the row-reordering page.",
      "base-ui":
        "Pin and delete live in a Base UI Menu, and a Team merge is one table cell with rowSpan. The drag grip lives on the row-reordering page.",
      shadcn:
        "The 3-dot trigger wears the preset's button classes, the menu is the same surface as every other overlay, and a Team merge is one td with rowspan. The drag grip lives on the row-reordering page.",
      tailwind:
        "The menu trigger and the merged cell carry the map's classes; rowspan is the browser's, so the fill is yours to dress. The drag grip lives on the row-reordering page.",
    },
    docs: ["row-pinning", "row-reordering", "row-spanning"],
  },
  {
    slug: "nested-tables",
    label: "Nested tables",
    h1: "Nested tables in {kit}",
    title: "{kit} nested tables and expandable rows — AdaptTable",
    description:
      "Expand a {kit} table row to a nested detail table. Each child has its own columns, row IDs and controls; explore the working {framework} example.",
    intro: [
      "Open a row and the panel holds another {kit} table — the same component, not a hand-built list. Each person has recent orders; the inner table has its own columns and row keys.",
      "`nestedTable()` mounts the kit's DataTable with defaults that keep the two tables from fighting over the URL. Rows with no nested table can still use `rowDetail()`.",
      "The expand chevron and both tables are {kit}.",
    ],
    card: "A real table under a row — same engine, own columns, own keys.",
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef, NestedTableDefaults } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { nestedTable } from "{pkg}/nested-table";

interface Order {
  id: string;
  item: string;
}

interface Customer {
  id: string;
  name: string;
  orders: Order[];
}

@Component({
  selector: "app-orders",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="row().orders"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="defaults().urlSync"
      [searchable]="defaults().searchable"
      [tableLabel]="defaults().tableLabel"
    />
  \`,
})
export class Orders {
  readonly row = input.required<Customer>();
  readonly defaults = input.required<NestedTableDefaults>();
  readonly columns: ColumnDef<Order>[] = [{ key: "item" }];
  readonly rowKey = (order: Order) => order.id;
}

@Component({
  selector: "app-customers",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class Customers {
  readonly rows = input.required<readonly Customer[]>();
  readonly columns: ColumnDef<Customer>[] = [{ key: "name" }];
  readonly rowKey = (row: Customer) => row.id;
  readonly features = [
    nestedTable<Customer>((row) => ({
      label: \`Orders for \${row.name}\`,
      table: Orders,
    })),
  ];
}`,
    },
    snippet: `import { DataTable } from "{pkg}";
import { nestedTable } from "{pkg}/nested-table";

export function People({ rows, columns, orderColumns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        nestedTable((row: Person) => ({
          label: \`Orders for \${row.name}\`,
          table: (defaults) => (
            <DataTable
              {...defaults}
              data={row.orders}
              columns={orderColumns}
              rowKey={(order) => order.id}
            />
          ),
        })),
      ]}
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
    snippets: {
      angular: `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { cellNavigation } from "{pkg}/cell-navigation";
import { columnSelectionCheckbox } from "{pkg}/column-selection";

@Component({
  selector: "app-keyboard-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      tableLabel="People keyboard grid"
      [data]="rows()" [columns]="columns()" [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class KeyboardPeople {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = input.required<readonly ColumnDef<Person>[]>();
  readonly rowKey = (row: Person) => row.id;
  readonly features = [cellNavigation(), columnSelectionCheckbox()];
}`,
    },
    label: "Accessibility",
    h1: "Accessible {kit} data table",
    title: "{kit} accessible data table — AdaptTable",
    description:
      "Explore keyboard navigation and screen-reader announcements in a {kit} data grid, with visible focus, column selection and forced-colors support.",
    intro: [
      "Tab into the grid and the arrows move a visible focus, one cell at a time. Home and End jump to the row's edges.",
      "Every move, sort, filter and edit is announced through a live region — the part of a table a sighted reader cannot check, so this page repeats those announcements as text as they happen.",
      "`columnSelectionCheckbox` puts a named checkbox on each header so a column can be selected without a modifier key a touchscreen does not have. Focus, selection, status and disabled controls stay legible in high contrast and forced-colors — nothing is color-only. The grid and the checkboxes are {kit}.",
    ],
    card: "Arrow-key focus, a visible ring, forced-colors, and live announcements.",
    snippet: `import { DataTable } from "{pkg}";
import { cellNavigation } from "{pkg}/cell-navigation";
import { columnSelectionCheckbox } from "{pkg}/column-selection";

export function People({ rows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[cellNavigation(), columnSelectionCheckbox()]}
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
  {
    slug: "row-reordering",
    snippets: {
      angular: `import { Component, input, signal } from "@angular/core";
import { applyRowReorder } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { rowReorder } from "{pkg}/row-reorder";

const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "team" },
  { key: "budget", sortable: true },
];

@Component({
  selector: "app-people",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="order() ?? rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
  \`,
})
export class People {
  readonly rows = input.required<readonly Person[]>();
  readonly columns = columns;
  readonly rowKey = (row: Person) => row.id;
  readonly order = signal<readonly Person[] | null>(null);
  readonly features = [
    rowReorder<Person>((from, to) =>
      this.order.set(applyRowReorder(this.order() ?? this.rows(), from, to))
    ),
  ];
}`,
    },
    heads: {
      angular: {
        description:
          "Move rows in a {kit} {framework} data table by pointer or keyboard, with every step announced, stable row identity and host-owned persistence.",
        card: "Drag or keyboard moves, announced — the host writes.",
      },
      "ng-zorro": {
        description:
          "Move rows in a {kit} {framework} data table by pointer or keyboard, with every step announced, stable row identity and host-owned persistence.",
        card: "Drag or keyboard moves, announced — the host writes.",
      },
    },
    intros: {
      angular: [
        "Compose `rowReorder` from `{pkg}/row-reorder` and a grip appears on every row. Drag it, or press Space to lift a row, the arrows to move it and Space to drop it; a live region announces each step.",
        "The table never mutates your array: `onRowReorder` asks the host with the row's old and new positions and the row itself, and the host writes. This page applies each move with core's `applyRowReorder` and says what it did.",
      ],
      "ng-zorro": [
        "Compose `rowReorder` from `{pkg}/row-reorder` and a grip appears on every row. Drag it, or press Space to lift a row, the arrows to move it and Space to drop it; a live region announces each step.",
        "The table never mutates your array: `onRowReorder` asks the host with the row's old and new positions and the row itself, and the host writes. This page applies each move with core's `applyRowReorder` and says what it did.",
      ],
    },
    label: "Row reordering",
    h1: "Row reordering in {kit}",
    title: "{kit} row reordering — AdaptTable",
    description:
      "Move rows in a {kit} data table — flat, grouped and tree data, pointer and keyboard, a confirm policy, stable row identity, and host-owned persistence.",
    intro: [
      "Compose `rowReorder` from `{pkg}/row-reorder` and a grip appears. Space lifts a row, arrows move it, Space drops it. The table never mutates your array: `onRowReorder` asks the host, and the host writes.",
      '`movePolicy: "confirm"` opens the kit\'s own move menu before a drop lands. Grouped moves stay inside a group unless `onGroupMove` says otherwise; tree moves stay under the same parent unless `onTreeMove` accepts a new one. A second move cannot start while a host confirmation is still pending.',
      "Row identity is the row key, not the visual index — a virtual window or a later page does not lie about where the row sat. The grip, the move buttons and the confirmation menu are {kit}.",
    ],
    card: "Flat, grouped and tree moves — keyboard, confirm, host writes.",
    snippet: `import { DataTable } from "{pkg}";
import { applyRowReorder } from "@adapttable/react";
import { rowReorder } from "{pkg}/row-reorder";

export function Tasks({ rows, setRows, columns }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      features={[
        rowReorder((from, to) => {
          setRows((current) => applyRowReorder(current, from, to));
        }, { movePolicy: "confirm" }),
      ]}
    />
  );
}`,
    notes: {
      mantine:
        "The grip is a Mantine ActionIcon and the confirmation is a Mantine Menu — Space, arrows and Escape stay on the same control the rest of a Mantine table already uses.",
      mui: "The grip is an IconButton and the confirmation is a MUI Menu of MenuItems, so a keyboard drop lands in the same overlay pattern as the row-action menu.",
      chakra:
        "The grip is a Chakra IconButton and the confirmation is a Chakra Menu; pending host confirmation disables the handle rather than leaving a second drag live.",
      antd: "The grip is antd's own handle column and the confirmation is an antd Dropdown, so a drop that needs approval uses the same overlay antd already uses for row actions.",
      radix:
        "The grip is a Radix IconButton and the confirmation is a Radix DropdownMenu — focus returns to the handle after a confirm or a cancel.",
      "base-ui":
        "The grip is a Base UI Button and the confirmation is a Base UI Menu; the announcer sits beside them so a keyboard move is heard once.",
      shadcn:
        "The grip wears the preset's button classes and the confirmation is the same overlay surface as every other menu on the table.",
      tailwind:
        "The grip and the confirmation menu carry the map's classes; the announcer is a live region, so a keyboard move is heard even when the handle is only a native button.",
    },
    docs: ["row-reordering"],
  },
  {
    slug: "aggregation",
    intros: {
      angular: [
        "`aggregate()` computes the table footer and each team's `groupAggregates`; `groupFooters` closes each team with its subtotal.",
        "Search the table and group totals and the footer recompute from matching rows. The host-owned portfolio total uses `pinnedSummaryRows` and remains above the scrolling body, independent of filtering and sorting.",
        "All three surfaces render through the same {kit} controls on desktop and in phone cards.",
      ],
      "ng-zorro": [
        "`aggregate()` computes the table footer and each team's `groupAggregates`; `groupFooters` closes each team with its subtotal.",
        "Search the table and group totals and the footer recompute from matching rows. The host-owned portfolio total uses `pinnedSummaryRows` and remains above the scrolling body, independent of filtering and sorting.",
        "All three surfaces render through the same NG-ZORRO kit on desktop and in phone cards.",
      ],
    },
    snippets: {
      angular: `import { Component, computed, input } from "@angular/core";
import { aggregate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { groupingPanel } from "{pkg}/grouping-panel";
import { pinnedSummaryRows } from "{pkg}/pinned-summary-rows";

@Component({
  selector: "app-totals",
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows()" [columns]="columns" [rowKey]="rowKey"
      [summaryRow]="budgetSum" [features]="features()"
    />
  \`,
})
export class Totals {
  readonly rows = input.required<readonly Person[]>();
  readonly totals = input.required<readonly Person[]>();
  readonly columns: ColumnDef<Person>[] = [
    { key: "name" }, { key: "team" }, { key: "budget" },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly budgetSum = aggregate<Person>({ budget: "sum" });
  readonly features = computed(() => [
    groupingPanel<Person>("team", {
      groupAggregates: this.budgetSum, groupFooters: true,
    }),
    pinnedSummaryRows<Person>({ top: this.totals() }),
  ]);
}`,
    },
    label: "Aggregation",
    h1: "Aggregation in {kit}",
    title: "{kit} table aggregation — AdaptTable",
    description:
      "Try {kit} table aggregation with group subtotals, footer totals and independent pinned summary rows. Keep summaries outside sorting and pagination.",
    intro: [
      "A summary row is not a pinned data row and not a group footer. `summaryRow` writes a grand total in the table footer. `pinnedSummaryRows` sticks host-owned totals above or below the scroll box. `groupAggregates` plus `groupFooters` close each group.",
      "Filter the table and every total recomputes from the rows that remain — client `aggregate()` and a source that already computed the same numbers share one mapper shape. Extra full-width rows stay attached to a person, not to a total.",
      "The footer, the pinned summaries and the group totals render through {kit}'s own table rows. Building and reordering group levels stays on the grouping page.",
    ],
    card: "Footer totals, pinned summaries, group aggregates — not data rows.",
    snippet: `import { aggregate } from "@adapttable/react";
import { DataTable } from "{pkg}";
import { groupingPanel } from "{pkg}/grouping-panel";
import { pinnedSummaryRows } from "{pkg}/pinned-summary-rows";

export function Sales({ rows, columns, teamTotal, grandTotal }) {
  const budgetSum = aggregate({ budget: "sum" }, { columns });
  return (
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      summaryRow={budgetSum}
      features={[
        groupingPanel(["team"], {
          groupAggregates: budgetSum,
          groupFooters: true,
        }),
        pinnedSummaryRows({ top: [teamTotal], bottom: [grandTotal] }),
      ]}
    />
  );
}`,
    notes: {
      mantine:
        "The footer is a Mantine Table.Tfoot, group totals close a Mantine table row, and pinned summaries are extra rows the same Table already knows how to stick.",
      mui: "The footer is a real TableFooter, group totals sit in TableRows, and pinned summaries use the same sticky TableRow path as a pinned data row — the label tells them apart.",
      chakra:
        "Group totals and the footer are Table.Row cells; pinned summaries are additional rows with the kit's sticky positioning, not a second table.",
      antd: "Group totals splice into antd's dataSource the same way group headers do; the footer is antd's Table.Summary, and pinned summaries are extra records the adapter marks.",
      radix:
        "The footer, group totals and pinned summaries are real Table.Row elements, so a screen reader hears them as rows of the same table.",
      "base-ui":
        "Totals render as Base UI table rows; the pinned pair uses the adapter's sticky classes rather than a portal, so they stay in the scroll box.",
      shadcn:
        "Footer and group totals sit on the same bg-card surface; pinned summaries keep the preset's sticky row classes so they do not look like another table.",
      tailwind:
        "The footer, group totals and pinned summaries carry the map's row and cell classes; the numbers are tabular, the distinction is the label and the part name.",
    },
    docs: ["row-grouping", "pinned-summary-rows", "full-width-rows"],
  },
  {
    slug: "ai",
    label: "AI",
    h1: "AI table assistant in {kit}",
    title: "{kit} AI table assistant demo — AdaptTable",
    description:
      "Try a {kit} {framework} table assistant: filter, group, pin and propose edits with approval. Use scripted prompts or connect your own AI backend.",
    heads: {
      angular: {
        h1: "AI table assistant in {kit} {framework}",
        title: "{kit} {framework} AI table assistant demo — AdaptTable",
        description:
          "Try a local {kit} {framework} table assistant: sort salaries, answer a filtering question and approve or reject a proposed edit. No model or API key required.",
        card: "Local sort, questions and approved edits with real table outcomes.",
      },
      "ng-zorro": {
        h1: "AI table assistant in {kit} {framework}",
        title: "{kit} {framework} AI table assistant demo — AdaptTable",
        description:
          "Try a local {kit} {framework} table assistant: sort salaries, answer a filtering question and approve or reject a proposed edit. No model or API key required.",
        card: "Local sort, questions and approved edits with real table outcomes.",
      },
    },
    intros: {
      angular: [
        "This deterministic local demo mounts a real {kit} {framework} table and its {kit} assistant. Ask to sort salaries, choose a person, or propose Grace's salary as 150. No language model or API key is needed.",
        "A question filters the table only after you answer. A proposed edit waits for your approval in the assistant, the table or a dialog; an approved write updates the host's data and its status line. Rejecting leaves the data unchanged, and the conversation records the execution result.",
        "`tableAgent` and `injectTableAssistant` from `@adapttable/ai-angular` share the mounted table's session. The snippet below shows a minimal local sorting transport; the demo also includes questions and governed edits. JSON, OpenAI, HTTP, MCP, MCP Apps, WebMCP, AG-UI and AI SDK helpers can use the same session in your application.",
      ],
      "ng-zorro": [
        "This deterministic local demo mounts a real {kit} {framework} table and its NG-ZORRO assistant. Ask to sort salaries, choose a person, or propose Grace's salary as 150. No language model or API key is needed.",
        "A question filters the table only after you answer. A proposed edit waits for your approval in the assistant, the table or a dialog; an approved write updates the host's data and its status line. Rejecting leaves the data unchanged, and the conversation records the execution result.",
        "`tableAgent` and `injectTableAssistant` from `@adapttable/ai-angular` share the mounted table's session. The snippet below shows a minimal local sorting transport; the demo also includes questions and governed edits. JSON, OpenAI, HTTP, MCP, MCP Apps, WebMCP, AG-UI and AI SDK helpers can use the same session in your application.",
      ],
    },
    intro: [
      "`@adapttable/ai` is optional and provider-neutral. This {kit} demo combines a conversational assistant with a real table. Try filtering, grouping, column pinning and a proposed edit; available actions depend on the mounted features and the host's permissions. Row pinning requires an ungrouped view in this demo.",
      "Start in Simulated mode: suggested prompts run deterministic local scenarios, not a language model. The conversation shows action receipts; a proposed write still follows approval and save policy. Connect backend sends your prompt and permitted table context to an endpoint you run. The assistant keeps the same table session and {kit} controls in both modes.",
      "Three integration levels share that session: a custom bridge that maps any agent format onto `session.execute`, an `AgentEnvelope` on your transport, and optional JSON, OpenAI, MCP or HTTP helpers from your own runtime. Execution never requires another model call.",
    ],
    card: "Native assistant, feature-aware prompts and governed action receipts.",
    snippet: `import type { AgentSession } from "@adapttable/ai";
import { useTableAssistant } from "@adapttable/ai-react";
import { assistantHttpTransport } from "@adapttable/ai/http";
import { tableAgent } from "@adapttable/ai-react";
import { DataTable, agentApproval } from "{pkg}";
import { TableAssistant } from "{pkg}/assistant";
import { editing } from "{pkg}/editing";
import { filters } from "{pkg}/filters";
import { useMemo, useState } from "react";

const suggestions = [
  {
    id: "core-team",
    title: "Show only the Core team",
    prompt: "Show only the Core team.",
    requires: ["view.setFilters"],
  },
];

export function Orders({ rows, columns, onEdit }) {
  const [session, setSession] = useState<AgentSession>();
  const transport = useMemo(
    () => assistantHttpTransport({ endpoint: "/api/table-agent" }),
    []
  );
  const assistant = useTableAssistant({ session, transport, suggestions });

  return (
    <>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        features={[
          filters([{ key: "team", type: "multiSelect", getValue: (row) => row.team }]),
          agentApproval(),
          editing(onEdit),
          tableAgent({
            tableId: "orders",
            writePolicy: "allow",
            approval: "writes",
            commit: "stage",
            columns: { salary: { type: "number", writable: true } },
            bridge: { attach: setSession },
          }),
        ]}
      />
      <TableAssistant
        assistant={assistant}
        open={assistant.open}
        onOpenChange={assistant.setOpen}
      />
    </>
  );
}`,
    snippets: {
      angular: `import type { AgentSession, AssistantTransport } from "@adapttable/ai";
import { injectTableAssistant, tableAgent } from "@adapttable/ai-angular";
import type { ColumnDef, TableAssistantProps } from "@adapttable/angular";
import { AdaptDataTable } from "{pkg}";
import { AdaptTableAssistant } from "{pkg}/assistant";
import { Component, computed, signal } from "@angular/core";

interface AgentPerson { id: string; name: string; salary: number }

// A minimal local transport: no model, endpoint or API key.
const transport: AssistantTransport = {
  send: async ({ session, text, signal }) => {
    if (!text.toLowerCase().includes("sort")) {
      return { text: "Try: sort salaries highest first." };
    }
    const key = "view.setSort";
    const result = await session.execute(
      key,
      { key: "salary", dir: "desc" },
      session.manifest().viewRevision,
      crypto.randomUUID(),
      signal
    );
    return {
      text: result.ok ? "Highest salary first." : "The sort was not applied.",
      keys: [key],
      results: [result],
    };
  },
};

@Component({
  selector: "app-people-assistant",
  imports: [AdaptDataTable, AdaptTableAssistant],
  template: \`
    <adapt-data-table
      [data]="rows" [columns]="columns" [rowKey]="rowKey"
      [features]="features" [urlSync]="false"
    />
    <adapt-table-assistant [props]="props()" />
  \`,
})
export class PeopleAssistant {
  readonly rows: readonly AgentPerson[] = [
    { id: "ada", name: "Ada Lovelace", salary: 120 },
    { id: "grace", name: "Grace Hopper", salary: 140 },
  ];
  readonly columns: readonly ColumnDef<AgentPerson>[] = [
    { key: "name", header: "Person" },
    { key: "salary", header: "Salary", sortable: true },
  ];
  readonly rowKey = (row: AgentPerson) => row.id;
  readonly session = signal<AgentSession | undefined>(undefined);
  readonly open = signal(false);
  readonly assistant = injectTableAssistant(computed(() => ({
    session: this.session(), transport,
  })));
  readonly props = computed((): TableAssistantProps => ({
    assistant: this.assistant(),
    open: this.open(),
    onOpenChange: (open) => this.open.set(open),
    presentation: "floating",
  }));
  readonly features = [tableAgent({
    tableId: "people", approval: "never",
    columns: { salary: { type: "number", sortable: true } },
    bridge: { attach: (session) => this.session.set(session) },
  })];
}`,
    },
    notes: {
      unstyled:
        "The assistant, question choices and approval controls are native HTML. This page runs a local script only; the host status line records approved writes, and the approval-surface selector chooses assistant, table or dialog review.",
      mantine:
        "The optional assistant, filters and approval controls use Mantine. Import the assistant separately, or build your own conversation UI on the headless controller.",
      mui: "The optional assistant uses MUI controls alongside the Material table and approval strip. Its separate import keeps chat UI out of tables that do not need it.",
      chakra:
        "Chakra supplies the assistant's controls as well as filters and approval. Use the ready panel or render the same headless conversation state in your own UI.",
      antd: "Ant Design supplies the optional assistant, filters and approval controls. Suggested prompts demonstrate table actions; receipts distinguish proposals from completed writes.",
      radix:
        "Radix Themes supplies the optional assistant's controls. The underlying catalog, schemas and executor remain available without the panel.",
      "base-ui":
        "The optional Base UI assistant shares the table's kit primitives. Its conversation controller can also drive a custom interface without importing the ready panel.",
      shadcn:
        "The optional shadcn assistant matches the table's preset. Keep its ready controls or use the headless controller with your own components and transport.",
      tailwind:
        "The unstyled assistant provides native controls for a Tailwind-styled interface. It is optional: applications can render the same conversation state themselves.",
    },
    docs: ["ai-http", "ai-integrations", "ai", "agent-capabilities"],
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

/** The matrix features, in the order the landing grid and rails show them. */
export const MATRIX_FEATURES = inDemandOrder(MATRIX_FEATURES_DEFINED);

/**
 * The kit the header "AI demo" link opens.
 *
 * One destination, not eight competing primary links. Chosen after a real
 * look at every published adapter page: Mantine is the site default and the
 * strongest pairing of instrument panel plus kit table.
 */
export const CANONICAL_AI_ADAPTER = "mantine";

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
  title: "{kit} {framework} data table examples — AdaptTable",
  description:
    "Explore {kit} {framework} table examples for filtering, editing, grouping, pivot and export. Native controls, optional feature imports and MIT licensing.",
  intro: [
    "{tagline}",
    "A framework-neutral @adapttable/core provides the data engine; {binding} connects it to {framework}. Add features through explicit imports. The visible controls are {surface}.",
    "That is the whole trade: one model to learn, and a table that belongs in a {kit} app rather than sitting inside one.",
  ],
  /** The heading over the feature pages — `{featureCount}` is the kit's own. */
  gridTitle: "{featureCount} features, each on its own {kit} page",
  gridLead:
    "Every one is the same engine and {kit}'s own components. Each page carries the code for that feature and a table you can drive.",
  /** The heading over the other kits of the same framework. */
  kitsTitle: "The same table, in {otherKits}",
  kitsLead:
    "Switching kit changes the components, never the model — the props on this page are the props there.",
};

/**
 * The framework a kit is built on.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {ShowcaseFramework}
 */
export const frameworkOf = (adapter) => {
  const framework = SHOWCASE_FRAMEWORKS.find(
    (candidate) => candidate.key === adapter.framework
  );
  if (!framework) {
    throw new Error(
      `${adapter.label} is built on "${adapter.framework}", which SHOWCASE_FRAMEWORKS does not serve`
    );
  }
  return framework;
};

/** Counts as the copy spells them. */
const NUMBER_WORDS = [
  "no",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/**
 * "seven other kits" — how many other built kits share this adapter's
 * framework, as a phrase.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {string}
 */
const otherKitsPhrase = (adapter) => {
  const count = otherKitsOf(adapter).length;
  const word = NUMBER_WORDS[count] ?? String(count);
  return `${word} other ${count === 1 ? "kit" : "kits"}`;
};

/**
 * Fill `{kit}`, `{pkg}` and `{peer}` from an adapter, `{featureCount}` with how
 * many feature pages it has and `{otherKits}` with how many other kits share its
 * framework, and `{framework}` and `{binding}` from the framework its kit is
 * built on.
 *
 * @param {string} text
 * @param {ShowcaseAdapter} adapter
 * @param {ShowcaseFramework} [framework] the adapter's framework
 * @returns {string}
 */
export const fillTemplate = (text, adapter, framework = frameworkOf(adapter)) =>
  text
    .replaceAll("{tagline}", adapter.tagline)
    .replaceAll("{surface}", adapter.surface)
    .replaceAll("{kit}", adapter.label)
    .replaceAll("{pkg}", adapter.pkg)
    .replaceAll("{peer}", adapter.peer)
    .replaceAll("{featureCount}", String(featuresOf(adapter).length))
    .replaceAll("{otherKits}", otherKitsPhrase(adapter))
    .replaceAll("{framework}", framework.label)
    .replaceAll("{binding}", framework.binding);

/**
 * The code a feature page shows, written for the framework the kit is built
 * on. A framework the feature has no code for fails here rather than serving
 * a page whose code the reader cannot run.
 *
 * @param {MatrixFeature} feature
 * @param {ShowcaseAdapter} adapter
 * @param {ShowcaseFramework} [framework] the adapter's framework
 * @returns {string}
 */
export const snippetFor = (
  feature,
  adapter,
  framework = frameworkOf(adapter)
) => {
  const code =
    framework.key === SNIPPET_FRAMEWORK
      ? feature.snippet
      : feature.snippets?.[framework.key];
  if (code === undefined) {
    throw new Error(
      `"${feature.slug}" has no ${framework.label} code for ${adapter.label}`
    );
  }
  return code;
};

/**
 * A feature's label, heading, title, description and card, as the kit it is
 * written for states them.
 *
 * @param {MatrixFeature} feature
 * @param {ShowcaseAdapter} adapter
 * @returns {Required<FeatureHead>}
 */
export const headFor = (feature, adapter) => ({
  label: feature.label,
  h1: feature.h1,
  title: feature.title,
  description: feature.description,
  card: feature.card,
  ...feature.heads?.[adapter.framework],
  ...feature.heads?.[adapter.key],
});

/**
 * The paragraphs a feature page opens with, for the kit it is written for.
 *
 * @param {MatrixFeature} feature
 * @param {ShowcaseAdapter} adapter
 * @returns {string[]}
 */
export const introFor = (feature, adapter) =>
  feature.intros?.[adapter.key] ??
  feature.intros?.[adapter.framework] ??
  feature.intro;

/**
 * The landing page's `<title>` and meta description for this kit.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {{ title: string, description: string }}
 */
export const landingHead = (adapter) =>
  adapter.landing ?? { title: LANDING.title, description: LANDING.description };

/**
 * The paragraphs this kit's landing page opens with.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {string[]}
 */
export const landingIntro = (adapter) => adapter.landingIntro ?? LANDING.intro;

/**
 * The adapters built on one framework.
 *
 * @param {string} framework A key of {@link SHOWCASE_FRAMEWORKS}.
 * @returns {ShowcaseAdapter[]}
 */
export const adaptersOf = (framework) =>
  SHOWCASE_ADAPTERS.filter((adapter) => adapter.framework === framework);

/**
 * The adapters of one framework whose own pages are built — React's unless
 * another framework is named, since the kit switcher, the nav and the live
 * demo are React's. Every other kit is reachable, and shown, through the live
 * demo pinned to it.
 *
 * @param {string} [framework] A key of {@link SHOWCASE_FRAMEWORKS}.
 * @returns {ShowcaseAdapter[]}
 */
export const builtAdapters = (framework = SNIPPET_FRAMEWORK) =>
  adaptersOf(framework).filter((adapter) => adapter.built);

/**
 * The other built kits on this adapter's framework, in matrix order.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {ShowcaseAdapter[]}
 */
export const otherKitsOf = (adapter) =>
  builtAdapters(adapter.framework).filter((other) => other.key !== adapter.key);

/**
 * The matrix features this kit has a page for, in demand order.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {MatrixFeature[]}
 */
export const featuresOf = (adapter) =>
  adapter.features
    ? MATRIX_FEATURES.filter((feature) =>
        adapter.features?.includes(feature.slug)
      )
    : MATRIX_FEATURES;

/**
 * Whether this kit's pages belong in the sitemap and in search indexes.
 *
 * @param {ShowcaseAdapter} adapter
 * @returns {boolean}
 */
export const isIndexable = (adapter) => adapter.indexable !== false;

/**
 * One built page of the matrix: an adapter landing, or an adapter's feature.
 *
 * @typedef {object} MatrixPageSpec
 * @property {string} adapter The adapter key.
 * @property {string} framework The framework the adapter's kit is built on,
 *   whose entry the page boots.
 * @property {string | null} feature The feature slug, or `null` for the landing.
 * @property {string} dir The directory under the showcase root.
 * @property {boolean} indexable Whether the page belongs in the sitemap.
 */

/**
 * Every matrix page, landing first for each built adapter.
 *
 * @returns {MatrixPageSpec[]}
 */
export const matrixPages = () =>
  SHOWCASE_FRAMEWORKS.flatMap((framework) =>
    builtAdapters(framework.key).flatMap((adapter) => [
      {
        adapter: adapter.key,
        framework: framework.key,
        feature: null,
        dir: adapter.key,
        indexable: isIndexable(adapter),
      },
      ...featuresOf(adapter).map((feature) => ({
        adapter: adapter.key,
        framework: framework.key,
        feature: feature.slug,
        dir: `${adapter.key}/${feature.slug}`,
        indexable: isIndexable(adapter),
      })),
    ])
  );

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

/** The basic native Vue development preview, outside the parity matrix. */
export const VUE_NATIVE_BASELINE = Object.freeze({
  key: "vue-unstyled",
  dir: "vue/unstyled",
  path: "unstyled",
  title: "Vue Unstyled table preview — AdaptTable",
  description:
    "Explore native Vue table search, sorting, pagination, selection and responsive cards.",
  notice:
    "This development preview is not a published package or a complete feature-parity release.",
  entry: "/src/vue/entry-native.ts",
});

/** Native Vue showcase pages for implemented table surfaces. */
export const VUE_NATIVE_PAGES = Object.freeze([
  VUE_NATIVE_BASELINE,
  {
    key: "vue-unstyled-workspace",
    dir: "vue/unstyled/workspace",
    path: "unstyled/workspace",
    title: "Order workspace — Vue Unstyled — AdaptTable",
    description:
      "Review orders, plan deliveries and compare revenue with native Vue tables, mobile cards, Arabic RTL and an optional local assistant.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/workspace/entry-workspace.ts",
  },
  {
    key: "vue-unstyled-assistant",
    dir: "vue/unstyled/assistant",
    path: "unstyled/assistant",
    title: "Assistant and approvals — Vue Unstyled — AdaptTable",
    description:
      "Native conversation, governed actions and controlled-state receipts.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-assistant.ts",
  },
  {
    key: "vue-unstyled-table-surfaces",
    dir: "vue/unstyled/table-surfaces",
    path: "unstyled/table-surfaces",
    title: "Native table controls — Vue Unstyled — AdaptTable",
    description:
      "Filter chips, header actions, native row menus, loading skeletons and expanded rows across desktop, mobile and RTL layouts.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-table-surfaces.ts",
  },
  {
    key: "vue-unstyled-table-footers",
    dir: "vue/unstyled/table-footers",
    path: "unstyled/table-footers",
    title: "Summary rows and footers — Vue Unstyled — AdaptTable",
    description:
      "Page totals, column footers and review notes across desktop, mobile and RTL layouts.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-table-footers.ts",
  },
  {
    key: "vue-unstyled-filter-editing",
    dir: "vue/unstyled/filter-editing",
    path: "unstyled/filter-editing",
    title: "Filters and editing — Vue Unstyled — AdaptTable",
    description: "Native filters, validation and host-controlled saves.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-filter-editing.ts",
  },
  {
    key: "vue-unstyled-composition",
    dir: "vue/unstyled/composition",
    path: "unstyled/composition",
    title: "Composed table lifecycles — Vue Unstyled — AdaptTable",
    description: "Tree selection, editing and native overlay lifecycles.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-composition.ts",
  },
  {
    key: "vue-unstyled-hierarchy",
    dir: "vue/unstyled/hierarchy",
    path: "unstyled/hierarchy",
    title: "Grouping and trees — Vue Unstyled — AdaptTable",
    description: "Native grouping, tree expansion and row details.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-hierarchy.ts",
  },
  {
    key: "vue-unstyled-rows",
    dir: "vue/unstyled/rows",
    path: "unstyled/rows",
    title: "Rows and columns — Vue Unstyled — AdaptTable",
    description: "Controlled pinning, row actions, spans and column resize.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-rows.ts",
  },
  {
    key: "vue-unstyled-selection-contract",
    dir: "vue/unstyled/selection-contract",
    path: "unstyled/selection-contract",
    title: "Selection controls — Vue Unstyled — AdaptTable",
    description: "Native selection, keyboard input and controlled updates.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-selection-contract.ts",
  },
  {
    key: "vue-unstyled-view-controls",
    dir: "vue/unstyled/view-controls",
    path: "unstyled/view-controls",
    title: "View controls — Vue Unstyled — AdaptTable",
    description: "Density, fullscreen and saved views with native controls.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/entry-view-controls.ts",
  },
  {
    key: "vue-unstyled-column-menu",
    dir: "vue/unstyled/column-menu",
    path: "unstyled/column-menu",
    title: "Column menu — Vue Unstyled — AdaptTable",
    description:
      "Column visibility, pinning, order and rename with host-controlled state.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/column-menu/entry-column-menu.ts",
  },
  {
    key: "vue-unstyled-navigation",
    dir: "vue/unstyled/navigation",
    path: "unstyled/navigation",
    title: "Navigation and find — Vue Unstyled — AdaptTable",
    description:
      "Keyboard ranges, find, clipboard and host-owned fill with native Vue controls.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/navigation/entry-navigation.ts",
  },
  {
    key: "vue-unstyled-actions",
    dir: "vue/unstyled/actions",
    path: "unstyled/actions",
    title: "Actions and export — Vue Unstyled — AdaptTable",
    description:
      "Native bulk actions, command palette, context menu, side panel and export controls.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/actions/entry-actions.ts",
  },
  {
    key: "vue-unstyled-specialized",
    dir: "vue/unstyled/specialized",
    path: "unstyled/specialized",
    title: "Specialized data views — Vue Unstyled — AdaptTable",
    description:
      "Virtual rows and columns, host-owned row moves, grouping, pivot and sparklines.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/specialized/entry-specialized.ts",
  },
  {
    key: "vue-unstyled-feature-union",
    dir: "vue/unstyled/feature-union",
    path: "unstyled/feature-union",
    title: "Combined features — Vue Unstyled — AdaptTable",
    description:
      "Virtual tree rows, keyboard navigation, find, range export and host-owned editing and moves.",
    notice: VUE_NATIVE_BASELINE.notice,
    entry: "/src/vue/feature-union/entry-feature-union.ts",
  },
]);
