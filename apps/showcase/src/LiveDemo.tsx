import { startTransition, Suspense, useState } from "react";

import { cssVars } from "./cssVars";
import type { Locale } from "./data";
import { type DataMode, type Density, type FiltersUi } from "./Demo";
import {
  ADAPTERS,
  Control,
  DemoFallback,
  KitSwitcher,
  readKitFromUrl,
  Segmented,
} from "./kitDemos";
import { SectionHead, TrialCta } from "./sections";
import { ADAPTER_TOKENS } from "./themeTokens";

export function LiveDemo({ dark }: Readonly<{ dark: boolean }>) {
  const [adapter, setAdapter] = useState(readKitFromUrl);
  const [mode, setMode] = useState<DataMode>("frontend");
  const [locale, setLocale] = useState<Locale>("en");
  const [density, setDensity] = useState<Density>("comfortable");
  const [filtersUi, setFiltersUi] = useState<FiltersUi>("popover");
  const [motion, setMotion] = useState<"on" | "off">("on");
  const [grouping, setGrouping] = useState<"on" | "off">("off");
  const [editing, setEditing] = useState<"on" | "off">("on");
  const token =
    ADAPTER_TOKENS.find((a) => a.key === adapter) ?? ADAPTER_TOKENS[0];
  const accent = dark ? token.accentDark : token.accentLight;
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  const frontendOnlyReason =
    mode === "backend"
      ? "Grouping and editing need the complete frontend row set."
      : undefined;

  const changeMode = (next: DataMode) => {
    startTransition(() => {
      setMode(next);
      if (next === "backend") {
        setGrouping("off");
        setEditing("off");
      }
    });
  };

  return (
    <section className="sec shell" id="demo">
      <SectionHead title="Same features. Any kit. Watch it switch.">
        One dataset, one feature set — re-rendered by each real adapter. Flip
        the data source and the locale; nothing about the table changes but its
        skin.
      </SectionHead>

      <KitSwitcher
        adapter={adapter}
        dark={dark}
        onChange={setAdapter}
        urlSync
      />

      <TrialCta />

      <div className="controls">
        <Control label="Data">
          <Segmented
            label="data source"
            value={mode}
            onChange={changeMode}
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
        <div className="controls__break" aria-hidden="true" />
        <Control label="Grouping">
          <Segmented
            label="grouping"
            value={grouping}
            onChange={(v) => {
              startTransition(() => setGrouping(v));
            }}
            options={[
              { value: "off", label: "Off" },
              {
                value: "on",
                label: "On",
                disabled: Boolean(frontendOnlyReason),
                title: frontendOnlyReason,
              },
            ]}
          />
        </Control>
        <Control label="Editing">
          <Segmented
            label="editing"
            value={editing}
            onChange={(v) => {
              startTransition(() => setEditing(v));
            }}
            options={[
              { value: "off", label: "Off" },
              {
                value: "on",
                label: "On",
                disabled: Boolean(frontendOnlyReason),
                title: frontendOnlyReason,
              },
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
              grouping={grouping === "on"}
              editing={editing === "on"}
              urlKey="live"
            />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
