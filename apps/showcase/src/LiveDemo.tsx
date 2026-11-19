import { startTransition, Suspense, useState } from "react";

import {
  DEMO_KIT_KEY,
  DEMO_OPTION,
  SITE_SURFACE,
  trackDemoChoice,
} from "../../../scripts/site-events.mjs";
import { cssVars } from "./cssVars";
import { type DataMode, type FiltersUi } from "./Demo";
import {
  initialDemoDensity,
  initialDemoLocale,
  useDemoPreference,
} from "./demoPresentation";
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

/**
 * Whether the link being opened already groups the table.
 *
 * The table restores its own grouping from the URL, but only once the feature
 * is mounted — and this demo mounts it from a toggle. Landing on a grouped
 * link with the toggle off dropped the grouping the link was carrying.
 */
function groupedByUrl(): "on" | "off" {
  if (typeof window === "undefined") return "off";
  const groupBy = new URLSearchParams(window.location.search).get(
    "live.groupBy"
  );
  return groupBy && groupBy.length > 0 ? "on" : "off";
}

/**
 * An option setter that also reports the choice as `demo_option`.
 *
 * @param option - The option's `DEMO_OPTION` name.
 * @param set - Applies the chosen value.
 */
function reported<T extends string>(option: string, set: (value: T) => void) {
  return (value: T) => {
    trackDemoChoice(option, value);
    set(value);
  };
}

export function LiveDemo({ dark }: Readonly<{ dark: boolean }>) {
  const [adapter, setAdapter] = useState(readKitFromUrl);
  const [mode, setMode] = useState<DataMode>("frontend");
  const [locale, setLocale] = useDemoPreference("locale", initialDemoLocale);
  const [density, setDensity] = useDemoPreference(
    "density",
    initialDemoDensity
  );
  const [filtersUi, setFiltersUi] = useState<FiltersUi>("popover");
  const [motion, setMotion] = useState<"on" | "off">("on");
  const [grouping, setGrouping] = useState<"on" | "off">(groupedByUrl);
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
        onChange={reported(DEMO_KIT_KEY, setAdapter)}
        urlSync
      />

      <TrialCta surface={SITE_SURFACE.demoMain} />

      <div className="controls">
        <Control label="Data">
          <Segmented
            label="data source"
            value={mode}
            onChange={reported(DEMO_OPTION.data, changeMode)}
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
            onChange={reported(DEMO_OPTION.locale, (v) => {
              startTransition(() => setLocale(v));
            })}
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
            onChange={reported(DEMO_OPTION.filters, (v) => {
              startTransition(() => setFiltersUi(v));
            })}
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
            onChange={reported(DEMO_OPTION.density, (v) => {
              startTransition(() => setDensity(v));
            })}
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
            onChange={reported(DEMO_OPTION.grouping, (v) => {
              startTransition(() => setGrouping(v));
            })}
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
            onChange={reported(DEMO_OPTION.editing, (v) => {
              startTransition(() => setEditing(v));
            })}
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
            onChange={reported(DEMO_OPTION.motion, (v) => {
              startTransition(() => setMotion(v));
            })}
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
