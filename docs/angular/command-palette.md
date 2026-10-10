# Angular command palette and context menus

`commandPalette()` adds searchable actions and the Cmd/Ctrl+K shortcut.
`button: true` adds a toolbar trigger for discovery and touch use. Built-in
commands reflect the operations the table can actually perform; your own
commands are appended through the same command contract as context-menu items.

## Add a host-owned command

```ts
import { Component, signal } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { commandPalette } from "@adapttable/angular-unstyled/command-palette";
import { contextMenu } from "@adapttable/angular-unstyled/context-menu";

interface Project {
  id: string;
  name: string;
}

@Component({
  selector: "app-project-commands",
  imports: [AdaptDataTable],
  template: `
    <button type="button" (click)="paletteOpen.set(true)">
      Project commands
    </button>
    <adapt-data-table
      tableLabel="Projects"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
    />
    <p role="status">{{ message() }}</p>
  `,
})
export class ProjectCommands {
  readonly rows: readonly Project[] = [{ id: "p1", name: "Website" }];
  readonly columns: readonly ColumnDef<Project>[] = [
    { key: "name", header: "Project", sortable: true },
  ];
  readonly rowKey = (row: Project) => row.id;
  readonly message = signal("");
  readonly paletteOpen = signal(false);
  readonly features = [
    commandPalette({
      button: true,
      open: this.paletteOpen,
      onOpenChange: (open) => this.paletteOpen.set(open),
      commands: [
        {
          key: "help",
          label: "Show project help",
          onSelect: () =>
            this.message.set("Choose a project to see its details."),
        },
      ],
    }),
    contextMenu<Project>({
      items: (target) =>
        target.kind === "header"
          ? []
          : [
              {
                key: "describe-project",
                label: "Show project name",
                onSelect: () => this.message.set(target.row.name),
              },
            ],
    }),
  ];
}
```

Use the root and feature entries under `@adapttable/ng-zorro` for its controls.
See [getting started](./getting-started.md) for installation
and first-release status. A command is
`{ key, label, onSelect }`, with optional `disabled`, `danger` and
`separatorBefore`. `onSelect` is a function, not an Angular event output. Labels
for custom commands are already-localized text supplied by the application.

## Writing direction

The palette follows the table's current `dir`, including kit-owned overlays
rendered through portals. Switching between RTL and LTR while it is open keeps
the mounted palette and search text intact. Custom adapters can forward `dir`
through `CommandPaletteInjectOptions` and `AdaptCommandPaletteChrome`; omitting
it preserves the kit's inherited or native direction.

## Shortcuts and focus

The default shortcut list contains `{ chord: "mod+k", command:
"command-palette" }`; `mod` means Cmd on macOS and Ctrl elsewhere. Pass
`shortcuts` to replace that list, or `[]` to bind none. Reserve chords that do
not conflict with your surrounding app. The palette supports search, active
item keyboard movement, Enter activation and Escape dismissal. Disabled
commands remain identifiable but cannot run.

`CommandPaletteOptions.open` accepts `boolean | Signal<boolean>`. Both kit
shells follow the signal passed to the feature after mounting. In the example,
the toolbar trigger, shortcut, Escape and selection request open-state changes
through `onOpenChange`; the host accepts them with `this.paletteOpen.set(open)`.
The host can also call `this.paletteOpen.set(true)` or `.set(false)` itself.
Pass the signal, not its current boolean value, and keep the feature declaration
stable. A fixed boolean is controlled too; the palette does not change it.

Omit `open` to let the palette keep its own state; `onOpenChange` can still
observe it. For a custom surface, `injectCommandPalette` takes a signal of
`CommandPaletteInjectOptions` and returns the live palette model, including
`show` and `close`. Open state is transient and is not a URL or saved-view slice.
Keep `button: true` on phones, where a desktop keyboard shortcut is not a useful
entry point.

## Context matters

`contextMenu({ items })` receives a discriminated target: `header`, `row` or
`cell`. Headers identify a column; row and cell targets carry the row and stable
row ID. Narrow the target before reading row fields. The built-in menu offers
applicable sort, filter, visibility, copy and pin operations. Cut requires the
host's `onCellCut` callback; a context-menu operation cannot manufacture write
permission.

The menu closes before `onSelect` runs. For an asynchronous command, manage
busy/error feedback in the host and catch rejections there; the command callback
itself has a `void` contract. Destructive actions must use your existing
confirmation and backend authorization path. Hiding or disabling a command is
presentation, not a replacement for permission checks.

See [Toolbar](./toolbar-and-view-controls.md),
[Cell navigation](./cell-navigation.md), [Row actions](./row-actions.md) and
[Accessibility](./accessibility.md). The [Angular factory options](../../packages/angular/angular/src/features/factories.ts)
and [kit palette](../../packages/angular/adapter-angular-unstyled/command-palette/palette.ts)
define the options and rendered surface.
