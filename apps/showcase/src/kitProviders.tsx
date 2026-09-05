import {
  DataTable,
  type DataTableProps,
  PivotPanel,
  SavedViewsPanel,
} from "@adapttable/mantine";
import type {
  PivotPanelChromeProps,
  SavedViewsPanelChromeProps,
} from "@adapttable/react/adapter";
import type { DataTableClassNames } from "@adapttable/unstyled";
import { MantineProvider } from "@mantine/core";
import { type ComponentType, lazy, type ReactNode, Suspense } from "react";

import { tailwindClassNames } from "./adapters/tailwindClassNames";

/**
 * Each kit's theme provider and `DataTable`, for pages that mount a table
 * directly instead of going through an adapter demo.
 *
 * The adapter demos in `./adapters` each wrap `DemoBody` in their own kit's
 * provider, which is right for a feature demo — but a page like `/scale/`
 * builds its own data and columns and needs the table without that
 * scaffolding. Before this, such a page could only be single-kit, because the
 * provider was the one thing it could not supply generically.
 *
 * **Mantine stays eager, and that is load-bearing here** — the same rule
 * `kitDemos.tsx` follows for first paint, but for a second reason. `pnpm bench`
 * drives `/scale/` and times a burst of row patches; behind `React.lazy` the
 * patch effect starts while the table is still suspended, so the burst times
 * updates against a table that has not mounted and reads ~3x faster for doing
 * less. The default kit mounting synchronously keeps the measured path
 * identical to a direct import.
 */

/** What a kit's provider needs to theme its subtree. */
export interface KitProviderProps {
  dark: boolean;
  dir: "ltr" | "rtl";
  children: ReactNode;
}

type Provider = ComponentType<KitProviderProps>;

/** Kits whose components theme themselves — the provider is a pass-through. */
function PlainProvider({ children }: Readonly<KitProviderProps>) {
  return <>{children}</>;
}

function MantineKitProvider({ dark, children }: Readonly<KitProviderProps>) {
  return (
    <MantineProvider forceColorScheme={dark ? "dark" : "light"}>
      {children}
    </MantineProvider>
  );
}

const PROVIDERS: Record<string, Provider> = {
  mantine: MantineKitProvider,
  mui: lazy(async () => {
    const { createTheme, ThemeProvider } = await import("@mui/material/styles");
    return {
      default: ({ dark, children }: KitProviderProps) => (
        <ThemeProvider
          theme={createTheme({ palette: { mode: dark ? "dark" : "light" } })}
        >
          {children}
        </ThemeProvider>
      ),
    };
  }),
  chakra: lazy(async () => {
    const { ChakraProvider, defaultSystem } = await import("@chakra-ui/react");
    return {
      default: ({ children }: KitProviderProps) => (
        <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
      ),
    };
  }),
  antd: lazy(async () => {
    const { ConfigProvider, theme: antdTheme } = await import("antd");
    return {
      default: ({ dark, dir, children }: KitProviderProps) => (
        <ConfigProvider
          direction={dir}
          theme={{
            algorithm: dark
              ? antdTheme.darkAlgorithm
              : antdTheme.defaultAlgorithm,
          }}
        >
          {children}
        </ConfigProvider>
      ),
    };
  }),
  radix: lazy(async () => {
    await import("@radix-ui/themes/styles.css");
    const { Theme } = await import("@radix-ui/themes");
    return {
      default: ({ dark, children }: KitProviderProps) => (
        <Theme
          appearance={dark ? "dark" : "light"}
          accentColor="iris"
          grayColor="slate"
          radius="medium"
          hasBackground={false}
          // Radix's <Theme> fills a page by default; embedded in a demo card
          // it should size to its content.
          style={{ minHeight: 0 }}
        >
          {children}
        </Theme>
      ),
    };
  }),
};

/** Theme a subtree the way `kit` themes one. Unknown kits render plainly. */
export function KitProvider({
  kit,
  dark,
  dir = "ltr",
  children,
}: Readonly<{
  kit: string;
  dark: boolean;
  dir?: "ltr" | "rtl";
  children: ReactNode;
}>) {
  const Provider = PROVIDERS[kit] ?? PlainProvider;
  return (
    <Suspense fallback={null}>
      <Provider dark={dark} dir={dir}>
        {children}
      </Provider>
    </Suspense>
  );
}

/**
 * Each kit's `DataTable`. Every prop AdaptTable's tables take is a core prop,
 * so one call site can drive any of them — only the provider ever differed.
 */
const TABLES: Record<string, ComponentType<never>> = {
  mantine: DataTable as ComponentType<never>,
  mui: lazy(async () => ({
    default: (await import("@adapttable/mui")).DataTable,
  })),
  chakra: lazy(async () => ({
    default: (await import("@adapttable/chakra")).DataTable,
  })),
  antd: lazy(async () => ({
    default: (await import("@adapttable/antd")).DataTable,
  })),
  radix: lazy(async () => ({
    default: (await import("@adapttable/radix")).DataTable,
  })),
  "base-ui": lazy(async () => ({
    default: (await import("@adapttable/base-ui")).DataTable,
  })),
  shadcn: lazy(async () => ({
    default: (await import("@adapttable/shadcn")).DataTable,
  })),
  tailwind: lazy(async () => ({
    default: (await import("@adapttable/unstyled")).DataTable,
  })),
};

/**
 * `kit`'s DataTable, falling back to Mantine's for an unknown key.
 *
 * Typed by the caller's row type rather than carried through the registry:
 * every kit's `DataTable` is generic in `TRow`, and `React.lazy` erases a
 * generic signature — there is no way to store one and get it back. The
 * registry holds them opaquely and this restores the shape at the boundary,
 * which is where the props are actually checked.
 */
export function kitTable<TRow>(
  kit: string
): ComponentType<DataTableProps<TRow>> {
  const table = TABLES[kit] ?? TABLES.mantine;
  return table as unknown as ComponentType<DataTableProps<TRow>>;
}

/**
 * The class map `kit` needs to look like itself, or `undefined` when the kit
 * styles its own components.
 *
 * Only the utility-class kits answer with a map. `@adapttable/unstyled` renders
 * native controls by contract, so the Tailwind tab's appearance IS this map;
 * every other kit brings components that are already styled, and shadcn's own
 * `DataTable` merges `shadcnClassNames` for itself.
 *
 * The counterpart to `kitTable`: a page that mounts a kit's table directly has
 * to pass both, or the Tailwind tab shows raw HTML on that page while the
 * adapter demos — which pass the map themselves — look right.
 */
export function kitClassNames(kit: string): DataTableClassNames | undefined {
  return kit === "tailwind" ? tailwindClassNames : undefined;
}

/**
 * A panel every kit pre-wires: chrome from core, controls from the kit.
 *
 * The unstyled family's panels take the class map for the same reason its
 * table does — native markup carries no look of its own — and a kit that
 * ignores the prop simply never reads it.
 */
type PivotPanelComponent = ComponentType<
  Omit<PivotPanelChromeProps, "slots"> & { classNames?: DataTableClassNames }
>;
type SavedViewsPanelComponent = ComponentType<
  Omit<SavedViewsPanelChromeProps, "slots"> & {
    classNames?: DataTableClassNames;
  }
>;

/**
 * Each kit's pivot configuration panel.
 *
 * A page that switches kits has to switch these with the table: a Mantine
 * table beside an antd panel is exactly the mismatch the slots law exists to
 * prevent, and it is the kind of mismatch a demo gets away with because
 * nothing type-checks the pairing.
 */
const PIVOT_PANELS: Record<string, PivotPanelComponent> = {
  mantine: PivotPanel,
  mui: lazy(async () => ({
    default: (await import("@adapttable/mui")).PivotPanel,
  })),
  chakra: lazy(async () => ({
    default: (await import("@adapttable/chakra")).PivotPanel,
  })),
  antd: lazy(async () => ({
    default: (await import("@adapttable/antd")).PivotPanel,
  })),
  radix: lazy(async () => ({
    default: (await import("@adapttable/radix")).PivotPanel,
  })),
  "base-ui": lazy(async () => ({
    default: (await import("@adapttable/base-ui")).PivotPanel,
  })),
  shadcn: lazy(async () => ({
    default: (await import("@adapttable/shadcn")).PivotPanel,
  })),
  tailwind: lazy(async () => ({
    default: (await import("@adapttable/unstyled")).PivotPanel,
  })),
};

/** Each kit's saved-views management panel. */
const SAVED_VIEWS_PANELS: Record<string, SavedViewsPanelComponent> = {
  mantine: SavedViewsPanel,
  mui: lazy(async () => ({
    default: (await import("@adapttable/mui")).SavedViewsPanel,
  })),
  chakra: lazy(async () => ({
    default: (await import("@adapttable/chakra")).SavedViewsPanel,
  })),
  antd: lazy(async () => ({
    default: (await import("@adapttable/antd")).SavedViewsPanel,
  })),
  radix: lazy(async () => ({
    default: (await import("@adapttable/radix")).SavedViewsPanel,
  })),
  "base-ui": lazy(async () => ({
    default: (await import("@adapttable/base-ui")).SavedViewsPanel,
  })),
  shadcn: lazy(async () => ({
    default: (await import("@adapttable/shadcn")).SavedViewsPanel,
  })),
  tailwind: lazy(async () => ({
    default: (await import("@adapttable/unstyled")).SavedViewsPanel,
  })),
};

/** `kit`'s pivot panel, falling back to Mantine's for an unknown key. */
export function kitPivotPanel(kit: string): PivotPanelComponent {
  return PIVOT_PANELS[kit] ?? PivotPanel;
}

/** `kit`'s saved-views panel, falling back to Mantine's for an unknown key. */
export function kitSavedViewsPanel(kit: string): SavedViewsPanelComponent {
  return SAVED_VIEWS_PANELS[kit] ?? SavedViewsPanel;
}
