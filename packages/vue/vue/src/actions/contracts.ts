/** Lightweight control channels. Importing the shell does not install actions. */
import type {
  BulkAction,
  BulkBarModel,
  Command,
  ContextMenuItem,
  ContextMenuPoint,
  Direction,
  Shortcut,
  TableLabels,
} from "@adapttable/core";
import {
  type ExportHandlerState,
  featureSlotKey,
  featureStateKey,
  type ToolbarExtrasSlotProps,
} from "@adapttable/core/binding";
import type { MaybeRefOrGetter, VNodeChild } from "vue";

import type { Attrs } from "../attrs";
export interface ActionPresentation {
  readonly labels: Required<TableLabels>;
  readonly dir: Direction;
  readonly classNames?: Readonly<Record<string, string | undefined>>;
  readonly container?: HTMLElement;
}
export interface ActionButton {
  readonly icon?: VNodeChild;
  readonly label: string;
  readonly attrs: Attrs;
}
export interface BulkActionsModel {
  readonly count: number;
  readonly pending: string | null;
  readonly error: string | null;
  readonly banner: BulkBarModel;
  readonly actions: readonly BulkAction[];
  readonly disabledReason: (action: BulkAction) => string | undefined;
  readonly run: (action: BulkAction) => void;
  readonly clear: () => void;
  readonly selectAllMatching: () => void;
}
export interface CommandPaletteOptions {
  readonly commands?: readonly Command[];
  readonly shortcuts?: readonly Shortcut[];
  readonly open?: MaybeRefOrGetter<boolean>;
  readonly onOpenChange?: (open: boolean) => void;
  readonly button?: boolean;
}
export interface CommandPaletteModel {
  readonly open: boolean;
  readonly button: boolean;
  readonly commands: readonly Command[];
  readonly show: () => void;
  readonly close: () => void;
}
export interface ContextMenuModel {
  readonly at: ContextMenuPoint | null;
  readonly items: readonly ContextMenuItem[];
  readonly close: () => void;
}
export interface SidePanelPanel {
  readonly key: string;
  readonly label: string;
  readonly content: VNodeChild | (() => VNodeChild);
}
export interface SidePanelOptions {
  readonly panels: readonly SidePanelPanel[];
  readonly open: MaybeRefOrGetter<string | null>;
  readonly onOpenChange: (key: string | null) => void;
  readonly side?: "start" | "end";
}
export interface SidePanelControlModel extends Omit<SidePanelOptions, "open"> {
  readonly open: string | null;
}
export const BULK_ACTIONS_MODEL = featureStateKey<BulkActionsModel>(
  "vue-bulk-actions-model"
);
export const COMMAND_PALETTE_MODEL = featureStateKey<CommandPaletteModel>(
  "vue-command-palette-model"
);
export const CONTEXT_MENU_MODEL = featureStateKey<ContextMenuModel>(
  "vue-context-menu-model"
);
export const SIDE_PANEL_MODEL = featureStateKey<SidePanelControlModel>(
  "vue-side-panel-model"
);
export const EXPORT_MODEL =
  featureStateKey<ExportHandlerState>("vue-export-model");
export const PRINT_MODEL = featureStateKey<(() => void) | undefined>(
  "vue-print-model"
);
export const BULK_ACTIONS_CONTROL = featureSlotKey<
  ActionPresentation & { readonly model: BulkActionsModel }
>("vue-bulk-actions-control");
export const COMMAND_PALETTE_CONTROL = featureSlotKey<
  ActionPresentation & { readonly model: CommandPaletteModel }
>("vue-command-palette-control");
export const CONTEXT_MENU_CONTROL = featureSlotKey<
  ActionPresentation & { readonly model: ContextMenuModel }
>("vue-context-menu-control");
export const SIDE_PANEL_CONTROL = featureSlotKey<
  ActionPresentation & { readonly model: SidePanelControlModel }
>("vue-side-panel-control");
export const EXPORT_CONTROL = featureSlotKey<
  ActionPresentation & { readonly model: ExportHandlerState }
>("vue-export-control");
export const PRINT_CONTROL = featureSlotKey<
  ActionPresentation & { readonly onPrint: () => void }
>("vue-print-control");

export const UNDO_REDO_CONTROL = featureSlotKey<ToolbarExtrasSlotProps>(
  "vue-undo-redo-control"
);
