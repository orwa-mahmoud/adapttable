import {
  type ComponentType,
  lazy,
  type ReactNode,
  startTransition,
  Suspense,
  useState,
} from "react";

import { MantineDemo } from "./adapters/MantineDemo";
import { cssVars } from "./cssVars";
import type { Locale } from "./data";
import { type DataMode, type Density, type FiltersUi } from "./Demo";
import { SectionHead, TrialCta } from "./sections";
import { ADAPTER_TOKENS } from "./themeTokens";

type DemoComponent = ComponentType<
  Readonly<{
    mode: DataMode;
    locale: Locale;
    dark?: boolean;
    filtersUi?: FiltersUi;
    urlKey?: string;
    density?: Density;
    animate?: boolean;
  }>
>;

/** Default kit stays eager so first paint doesn't wait on a chunk. */
const ADAPTERS: Record<string, DemoComponent> = {
  mantine: MantineDemo,
  mui: lazy(() =>
    import("./adapters/MuiDemo").then((m) => ({ default: m.MuiDemo }))
  ),
  chakra: lazy(() =>
    import("./adapters/ChakraDemo").then((m) => ({ default: m.ChakraDemo }))
  ),
  antd: lazy(() =>
    import("./adapters/AntdDemo").then((m) => ({ default: m.AntdDemo }))
  ),
  radix: lazy(() =>
    import("./adapters/RadixDemo").then((m) => ({ default: m.RadixDemo }))
  ),
  "base-ui": lazy(() =>
    import("./adapters/BaseUiDemo").then((m) => ({ default: m.BaseUiDemo }))
  ),
  shadcn: lazy(() =>
    import("./adapters/ShadcnDemo").then((m) => ({ default: m.ShadcnDemo }))
  ),
  tailwind: lazy(() =>
    import("./adapters/UnstyledDemo").then((m) => ({
      default: m.UnstyledDemo,
    }))
  ),
};

function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: Readonly<{
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? "seg__btn is-on" : "seg__btn"}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Control({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="ctrl">
      <span className="ctrl__label">{label}</span>
      {children}
    </div>
  );
}

function DemoFallback() {
  return (
    <div className="demo-surface__fallback" aria-busy="true" aria-live="polite">
      Loading adapter…
    </div>
  );
}

export function LiveDemo({ dark }: Readonly<{ dark: boolean }>) {
  const [adapter, setAdapter] = useState("mantine");
  const [mode, setMode] = useState<DataMode>("frontend");
  const [locale, setLocale] = useState<Locale>("en");
  const [density, setDensity] = useState<Density>("comfortable");
  const [filtersUi, setFiltersUi] = useState<FiltersUi>("popover");
  const [motion, setMotion] = useState<"on" | "off">("on");
  const token =
    ADAPTER_TOKENS.find((a) => a.key === adapter) ?? ADAPTER_TOKENS[0];
  const accent = dark ? token.accentDark : token.accentLight;
  const Demo = ADAPTERS[adapter] ?? MantineDemo;

  return (
    <section className="sec shell" id="demo">
      <SectionHead title="Same features. Any kit. Watch it switch.">
        One dataset, one feature set — re-rendered by each real adapter. Flip
        the data source and the locale; nothing about the table changes but its
        skin.
      </SectionHead>

      <div className="adapterbar">
        {ADAPTER_TOKENS.map((a) => (
          <button
            key={a.key}
            type="button"
            data-testid={`adapter-${a.key}`}
            className={adapter === a.key ? "adtab is-on" : "adtab"}
            style={cssVars({ "--c": dark ? a.accentDark : a.accentLight })}
            onClick={() => {
              startTransition(() => setAdapter(a.key));
            }}
          >
            <span className="adtab__dot" />
            <span className="adtab__l">
              <strong>{a.label}</strong>
              <small>{a.blurb}</small>
            </span>
          </button>
        ))}
      </div>

      <TrialCta />

      <div className="controls">
        <Control label="Data">
          <Segmented
            label="data source"
            value={mode}
            onChange={(v) => {
              startTransition(() => setMode(v));
            }}
            options={[
              { value: "frontend", label: "Frontend" },
              { value: "backend", label: "Backend" },
            ]}
          />
        </Control>
        <Control label="Locale">
          <Segmented
            label="locale"
            value={locale}
            onChange={(v) => {
              startTransition(() => setLocale(v));
            }}
            options={[
              { value: "en", label: "EN" },
              { value: "ar", label: "العربية" },
            ]}
          />
        </Control>
        <Control label="Filters">
          <Segmented
            label="filters container"
            value={filtersUi}
            onChange={(v) => {
              startTransition(() => setFiltersUi(v));
            }}
            options={[
              { value: "popover", label: "Popover" },
              { value: "drawer", label: "Drawer" },
            ]}
          />
        </Control>
        <Control label="Density">
          <Segmented
            label="density"
            value={density}
            onChange={(v) => {
              startTransition(() => setDensity(v));
            }}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </Control>
        <Control label="Motion">
          <Segmented
            label="motion"
            value={motion}
            onChange={(v) => {
              startTransition(() => setMotion(v));
            }}
            options={[
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
          />
        </Control>
      </div>

      <div className="demo-surface" style={cssVars({ "--c": accent })}>
        {/* Remount only on kit change — density/locale/filters/motion/dark
            update as props so lighter toggles don't tear the table down. */}
        <div
          className="demo-surface__body"
          key={adapter}
          data-adapter={adapter}
        >
          <Suspense fallback={<DemoFallback />}>
            <Demo
              mode={mode}
              locale={locale}
              dark={dark}
              density={density}
              filtersUi={filtersUi}
              animate={motion === "on"}
              urlKey="live"
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
