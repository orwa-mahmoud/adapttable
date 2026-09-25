import { createElement, type ReactNode, useContext } from "react";

import type { CommandPaletteChromeProps } from "../actions/CommandPaletteChrome";
import {
  CommandPaletteOpenContext,
  type CommandPaletteOptions,
  useCommandPalette,
  type UseCommandPaletteOptions,
  usePaletteOpenState,
} from "../actions/useCommandPalette";
import { commandPalette as coreCommandPalette } from "../features/factories";
import {
  extendFeature,
  type FeatureProviderProps,
  slotRender,
} from "../features/providers";
import {
  COMMAND_PALETTE_LIVE,
  TOOLBAR_EXTRAS,
  type ToolbarExtrasSlotProps,
} from "../features/slotKeys";
import type { StaticTableFeature } from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

/**
 * Props shared assembly passes to a kit-owned command palette.
 *
 * @public
 */
export type AdapterCommandPaletteProps = Omit<
  CommandPaletteChromeProps,
  "slots"
>;

/**
 * Props a kit's toolbar control for the palette receives: the toolbar's own
 * props, plus the open action and whether the palette is showing.
 *
 * @public
 */
export interface AdapterCommandPaletteTriggerProps extends ToolbarExtrasSlotProps {
  /** Open the palette. */
  readonly onOpenPalette: () => void;
  /** Whether the palette is showing, for `aria-expanded`. */
  readonly paletteOpen: boolean;
}

/**
 * A command-palette factory bound to one kit's dialog and list.
 *
 * @public
 */
export type AdapterCommandPaletteFeature = (
  options?: boolean | CommandPaletteOptions
) => StaticTableFeature;

/**
 * The options each composed palette feature was built with. The provider is
 * one stable component for every call of the factory, so it finds its
 * feature's options here rather than closing over them.
 */
const paletteOptions = new WeakMap<object, CommandPaletteOptions>();

/** One open state for the palette and its toolbar control. */
function CommandPaletteOpenProvider({
  feature,
  children,
}: FeatureProviderProps): ReactNode {
  const state = usePaletteOpenState(paletteOptions.get(feature));
  return createElement(
    CommandPaletteOpenContext.Provider,
    { value: state },
    children
  );
}

/**
 * Bind the command-palette hook to one kit's visible dialog, and optionally
 * to the kit's toolbar control that opens it (`commandPalette({ button: true })`).
 *
 * @public
 */
export function createAdapterCommandPaletteFeature(
  CommandPalette: AdapterFeatureComponent<AdapterCommandPaletteProps>,
  Trigger?: AdapterFeatureComponent<AdapterCommandPaletteTriggerProps>
): AdapterCommandPaletteFeature {
  function LiveCommandPalette(props: Readonly<UseCommandPaletteOptions>) {
    const palette = useCommandPalette(props);
    return createElement(CommandPalette, {
      commands: palette.commands,
      open: palette.open,
      onClose: palette.close,
      labels: props.labels,
    });
  }

  function LiveTrigger(props: Readonly<ToolbarExtrasSlotProps>) {
    const state = useContext(CommandPaletteOpenContext);
    if (!Trigger || !state) return null;
    return createElement(Trigger, {
      ...props,
      onOpenPalette: () => {
        state.setOpen(true);
      },
      paletteOpen: state.open,
    });
  }

  const renders = [
    slotRender(COMMAND_PALETTE_LIVE, (props) =>
      createElement(LiveCommandPalette, props)
    ),
  ];
  const withTrigger = [
    ...renders,
    slotRender(TOOLBAR_EXTRAS, (props) => createElement(LiveTrigger, props)),
  ];
  const provider = { Provider: CommandPaletteOpenProvider };

  return (options: boolean | CommandPaletteOptions = true) => {
    const config = typeof options === "object" ? options : undefined;
    const feature: StaticTableFeature = {
      ...extendFeature(
        coreCommandPalette(options),
        config?.button === true && Trigger ? withTrigger : renders
      ),
      provider,
    };
    if (config) paletteOptions.set(feature, config);
    return feature;
  };
}
