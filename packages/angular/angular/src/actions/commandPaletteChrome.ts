/**
 * The command palette: every table action, findable by typing.
 *
 * Focus, the Tab trap and the highlighted option live here. The kit draws
 * the input, each row and the empty line.
 */
import {
  type Command,
  commandListKeyAction,
  commandListView,
  createCommandList,
  type Direction,
  resolveLabels,
  runCommand,
  type TableLabels,
  tabTrapTarget,
} from "@adapttable/core";
import type { CommandPaletteSurfaceProps as NeutralCommandPaletteSurfaceProps } from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  Injector,
  input,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptAttrs } from "../attrs";
import { AdaptControl } from "../control";
import { onBrowser } from "../hooks/platform";
import { fromStore } from "../store";

/** The kit owns its dialog and outlets the binding's structured content. @public */
export type CommandPaletteSurfaceProps = NeutralCommandPaletteSurfaceProps<
  TemplateRef<unknown> | undefined
> & {
  /** The table's current writing direction, including portaled surfaces. */
  readonly dir?: Direction;
};

let nextListId = 0;

/**
 * The kit's controls for {@link AdaptCommandPaletteChrome}. Each is a
 * standalone component with one `props` input.
 *
 * @public
 */
export interface CommandPaletteSlots {
  /** The kit's own modal surface, including its dismiss channel. */
  readonly Surface: Type<unknown>;
  /** The search box. */
  readonly Input: Type<unknown>;
  /** One command. */
  readonly Item: Type<unknown>;
  /** Shown when nothing matches. */
  readonly Empty: Type<unknown>;
}

/** Every element inside that can hold focus, for the Tab trap. */
function focusablesIn(root: HTMLElement | undefined): HTMLElement[] {
  if (!root) return [];
  return [
    ...root.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ),
  ];
}

/**
 * Renders the command palette, or nothing when it is closed.
 *
 * @public
 */
@Component({
  selector: "adapt-command-palette-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptAttrs, AdaptControl],
  host: { style: "display: contents" },
  templateUrl: "./commandPaletteChrome.html",
})
export class AdaptCommandPaletteChrome {
  /** Every command available right now. */
  readonly commands = input.required<readonly Command[]>();
  /** Whether it is showing. */
  readonly open = input.required<boolean>();
  /** Close it. */
  readonly onClose = input.required<() => void>();
  /** Labels; gaps fall back to English. */
  readonly labels = input<TableLabels | undefined>(undefined);
  /** Direction for the overlay; omission preserves the kit's native direction. */
  readonly dir = input<Direction | undefined>(undefined);
  protected readonly copy = computed(() => resolveLabels(this.labels()));
  /** A kit's own class for the surface. */
  readonly className = input<string | undefined>(undefined);
  /** The kit's input, row and empty line. */
  readonly slots = input.required<CommandPaletteSlots>();

  private readonly browser = onBrowser(inject(Injector));
  private readonly list = createCommandList();
  private readonly snapshot = fromStore(this.list);
  private readonly surface = viewChild<ElementRef<HTMLElement>>("surface");
  private readonly body = viewChild<TemplateRef<unknown>>("body");
  /** The surface can render through a portal without duplicating this structure. */
  protected readonly surfaceProps = computed((): CommandPaletteSurfaceProps => {
    const dir = this.dir();
    return {
      label: this.dialogLabel(),
      ...(dir === undefined ? {} : { dir }),
      onClose: this.onClose(),
      children: this.body(),
      className: this.className(),
    };
  });
  private opener: HTMLElement | null = null;
  /** The listbox id the input points at. */
  readonly listId = `command-list-${String(++nextListId)}`;

  /** The dialog's accessible name. */
  protected readonly dialogLabel = computed(() => this.copy().commandPalette);
  /** Semantics of the custom listbox whose options are supplied by the kit. */
  protected readonly listProps = computed(() => ({
    id: this.listId,
    role: "listbox" as const,
    "aria-label": this.dialogLabel(),
    "data-adapttable-part": "command-list",
  }));
  private readonly view = computed(() =>
    commandListView(this.commands(), this.snapshot())
  );
  /** Props for each visible row. */
  protected readonly rows = computed(() => {
    const shown = this.view();
    return shown.matches.map((command, index) => ({
      command,
      active: index === shown.active,
      itemProps: {
        id: `${this.listId}-${command.key}`,
        role: "option" as const,
        "aria-selected": index === shown.active,
        "aria-disabled": command.disabled,
        "data-adapttable-part": "command-item" as const,
        onClick: () => {
          this.run(command);
        },
        onMouseEnter: () => {
          this.list.setActive(index);
        },
      },
    }));
  });
  /** Props for the search box. */
  protected readonly inputProps = computed(() => {
    const shown = this.view();
    const active = shown.matches[shown.active];
    const search = this.copy().commandSearch;
    return {
      inputProps: {
        value: this.snapshot().query,
        onChange: (next: string) => {
          this.list.setQuery(next);
        },
        onKeyDown: (event: KeyboardEvent) => {
          this.onKeyDown(event);
        },
        ref: (element: HTMLInputElement | null) => {
          this.focusInput(element);
        },
        role: "combobox" as const,
        "aria-expanded": true as const,
        "aria-controls": this.listId,
        "aria-activedescendant": active
          ? `${this.listId}-${active.key}`
          : undefined,
        "aria-label": search,
        placeholder: search,
        "data-adapttable-part": "command-input" as const,
      },
    };
  });
  /** Props for the empty line. */
  protected readonly emptyProps = computed(() => ({
    message: this.copy().commandEmpty,
  }));

  constructor() {
    effect((onCleanup) => {
      if (!this.browser || !this.open()) return;
      this.list.reset();
      const onDown = (event: PointerEvent) => {
        const node = this.surfaceBounds();
        if (node && !node.contains(event.target as Node)) this.onClose()();
      };
      document.addEventListener("pointerdown", onDown);
      onCleanup(() => {
        document.removeEventListener("pointerdown", onDown);
        const back = this.opener;
        this.opener = null;
        back?.focus();
      });
    });
  }

  /** The kit's actual surface also contains padding outside the inner layout. */
  private surfaceBounds(): HTMLElement | undefined {
    const content = this.surface()?.nativeElement;
    return (
      content?.closest<HTMLElement>(
        '[data-adapttable-part="command-palette"]'
      ) ?? content
    );
  }

  /** Run a command, closing first. */
  private run(command: Command | undefined): void {
    runCommand(command, () => {
      this.onClose()();
    });
  }

  /** Only the search box drives the highlighted command. */
  private onKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    const action = commandListKeyAction(event.key, this.view());
    if (!action || action.kind === "close") return;
    event.preventDefault();
    if (action.kind === "run") this.run(action.command);
    else this.list.setActive(action.to);
  }

  /** Escape and the Tab trap also work from a focused command button. */
  protected onSurfaceKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.onClose()();
      return;
    }
    if (event.key !== "Tab" || !this.browser) return;
    const target = tabTrapTarget(
      focusablesIn(this.surfaceBounds()),
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
      event.shiftKey
    );
    if (!target) return;
    event.preventDefault();
    target.focus();
  }

  /** Focus the input when it arrives, and remember who opened the palette. */
  private focusInput(element: HTMLInputElement | null): void {
    if (!this.browser || !element) return;
    this.opener ??=
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element.focus();
  }
}
