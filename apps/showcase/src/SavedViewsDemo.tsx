import { savedViews as antdSavedViews } from "@adapttable/antd/saved-views";
import { savedViews as baseUiSavedViews } from "@adapttable/base-ui/saved-views";
import { savedViews as chakraSavedViews } from "@adapttable/chakra/saved-views";
import type { SavedView, UseSavedViewsOptions } from "@adapttable/core";
import { createMemoryAdapter, useSavedViews } from "@adapttable/core";
import type { TableFeature } from "@adapttable/core/features";
import { getLabels } from "@adapttable/i18n";
import { savedViews as mantineSavedViews } from "@adapttable/mantine/saved-views";
import { savedViews as muiSavedViews } from "@adapttable/mui/saved-views";
import { savedViews as radixSavedViews } from "@adapttable/radix/saved-views";
import { savedViews as shadcnSavedViews } from "@adapttable/shadcn/saved-views";
import { savedViews as unstyledSavedViews } from "@adapttable/unstyled/saved-views";
import { Suspense, useMemo, useState } from "react";

import { layoutFor, rosterFor } from "./casts";
import { BASE_COLUMNS, type Person } from "./data";
import {
  kitClassNames,
  KitProvider,
  kitSavedViewsPanel,
  kitTable,
} from "./kitProviders";
import type { FeatureBodyProps } from "./matrix/featureBodies";

/**
 * A view this reader did not create, to show what a shared one looks like.
 * Its controls are disabled and it says why — the case a demo usually skips
 * and the one that matters most.
 */
const SHARED: SavedView = {
  name: "Team: platform",
  search: "sv.q=Platform",
  visibility: "team",
  readOnly: true,
  version: 2,
};

/** Views saved by an older table, so the migration path is on screen too. */
const SEED = JSON.stringify([
  SHARED,
  { name: "Legacy view", search: "sv.q=a" },
]);

/** In-memory storage seeded for the demo, so a visitor sees a populated list. */
function useDemoStorage() {
  return useMemo(() => {
    const store = new Map<string, string>([["showcase-views", SEED]]);
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
  }, []);
}

/**
 * `kit`'s saved-views feature, by kit key.
 *
 * The views menu is drawn by the adapter, and the feature is also what owns
 * user column layout — so without this import the page shows neither the menu
 * nor the layout its `defaultColumnLayout` asks for. Imported here rather than
 * in the shared kit registry so the eight modules load with this page alone.
 */
const SAVED_VIEWS_FEATURES: Record<
  string,
  (options: UseSavedViewsOptions) => TableFeature<never>
> = {
  mantine: mantineSavedViews,
  mui: muiSavedViews,
  chakra: chakraSavedViews,
  antd: antdSavedViews,
  radix: radixSavedViews,
  "base-ui": baseUiSavedViews,
  shadcn: shadcnSavedViews,
  tailwind: unstyledSavedViews,
};

/** `kit`'s saved-views feature, falling back to Mantine's. */
function kitSavedViewsFeature(
  kit: string,
  options: UseSavedViewsOptions
): TableFeature<Person> {
  const make = SAVED_VIEWS_FEATURES[kit] ?? mantineSavedViews;
  return make(options) as TableFeature<Person>;
}

/**
 * The saved-views page: a table, the views menu, and the management panel — in
 * whichever kit the reader picks, because a management panel is as much a kit's
 * own component as the table beside it. Only view controls: the point of the
 * page is what a view is worth, not the rest of the table.
 */
export function SavedViewsDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const storage = useDemoStorage();
  const [migrated, setMigrated] = useState<string[]>([]);
  // The list and the table both apply a view by writing params into a store.
  // The address bar used to be that store. This one is the same pipe for this
  // visit only — refresh starts clean, the URL never changes.
  const session = useMemo(() => createMemoryAdapter(), []);
  const views = useSavedViews({
    storageKey: "showcase-views",
    storage,
    urlKey: "sv",
    urlAdapter: session,
    migrate: (view, from) => {
      // One line per view, however many times the load runs — under
      // StrictMode it runs twice, and a note that names the same view twice
      // reads as two upgraded views. The guard compares what is stored, not
      // the bare name it is built from.
      const upgraded = `${view.name} (v${from})`;
      setMigrated((seen) =>
        seen.includes(upgraded) ? seen : [...seen, upgraded]
      );
      return view;
    },
  });
  const SavedViewsPanel = kitSavedViewsPanel(adapter);
  const Table = kitTable<Person>(adapter);
  const savedViewsOptions = {
    storageKey: "showcase-views",
    storage,
    urlAdapter: session,
    urlKey: "sv",
  };
  // The panel and the table take the same map: this page mounts both directly,
  // so the Tailwind tab's look has to come from here.
  const classNames = kitClassNames(adapter);

  return (
    <div className="mx-demo">
      <KitProvider kit={adapter} dark={dark}>
        {/* The panel column hugs its card rather than reserving a third of the
            width for it: a management list is as wide as its longest view
            name, and the table is what the rest of the row is for. */}
        <div
          className="mx-demo__body panel-layout"
          data-adapter={adapter}
          key={adapter}
        >
          <div>
            <Suspense fallback={null}>
              <SavedViewsPanel
                views={views.views}
                onApply={views.apply}
                onRename={views.rename}
                onMove={views.move}
                onSetDefault={views.setDefault}
                onRemove={views.remove}
                labels={getLabels("en")}
                classNames={classNames}
                footer={
                  migrated.length > 0 ? (
                    <span data-testid="migrated">
                      Upgraded on load: {migrated.join(", ")}
                    </span>
                  ) : undefined
                }
              />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={null}>
              <Table
                data={rosterFor("saved-views")}
                columns={BASE_COLUMNS}
                rowKey={(row) => row.id}
                urlKey="sv"
                urlAdapter={session}
                defaultColumnLayout={layoutFor("saved-views")}
                // The views menu and the column layout both come with this
                // import: the props alone draw neither.
                features={[kitSavedViewsFeature(adapter, savedViewsOptions)]}
                savedViews={savedViewsOptions}
                labels={getLabels("en")}
                classNames={classNames}
              />
            </Suspense>
          </div>
        </div>
      </KitProvider>
    </div>
  );
}
