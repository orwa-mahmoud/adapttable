import { savedViews as antdSavedViews } from "@adapttable/antd/saved-views";
import { savedViews as baseUiSavedViews } from "@adapttable/base-ui/saved-views";
import { savedViews as chakraSavedViews } from "@adapttable/chakra/saved-views";
import { getLabels } from "@adapttable/i18n";
import { savedViews as mantineSavedViews } from "@adapttable/mantine/saved-views";
import { savedViews as muiSavedViews } from "@adapttable/mui/saved-views";
import { savedViews as radixSavedViews } from "@adapttable/radix/saved-views";
import { useSavedViews, type UseSavedViewsOptions } from "@adapttable/react";
import type { TableFeature } from "@adapttable/react/features";
import { savedViews as shadcnSavedViews } from "@adapttable/shadcn/saved-views";
import { savedViews as unstyledSavedViews } from "@adapttable/unstyled/saved-views";
import { Suspense, useMemo, useState } from "react";

import { layoutFor, rosterFor } from "./casts";
import { BASE_COLUMNS, type Person } from "./data";
import { initialDemoDirection, initialDemoLocale } from "./demoPresentation";
import {
  kitClassNames,
  KitProvider,
  kitSavedViewsPanel,
  kitTable,
} from "./kitProviders";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import {
  createSeededViewStorage,
  createViewSession,
  reportingMigration,
  SAVED_VIEWS_STORAGE_KEY,
  SAVED_VIEWS_URL_KEY,
  upgradedFooter,
} from "./shared/savedViewsScenario";

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
  const storage = useMemo(() => createSeededViewStorage(), []);
  const [migrated, setMigrated] = useState<string[]>([]);
  // The list and the table both apply a view by writing params into a store
  // kept for this visit only: refresh starts clean, the URL never changes.
  const session = useMemo(() => createViewSession(), []);
  // One line per view, however many times the load runs: under StrictMode it
  // runs twice, and a note naming the same view twice reads as two views.
  const migrate = useMemo(
    () =>
      reportingMigration((upgraded) => {
        setMigrated((seen) =>
          seen.includes(upgraded) ? seen : [...seen, upgraded]
        );
      }),
    []
  );
  const views = useSavedViews({
    storageKey: SAVED_VIEWS_STORAGE_KEY,
    storage,
    urlKey: SAVED_VIEWS_URL_KEY,
    urlAdapter: session,
    migrate,
  });
  const SavedViewsPanel = kitSavedViewsPanel(adapter);
  const Table = kitTable<Person>(adapter);
  const savedViewsOptions = {
    storageKey: SAVED_VIEWS_STORAGE_KEY,
    storage,
    urlAdapter: session,
    urlKey: SAVED_VIEWS_URL_KEY,
  };
  const footer = upgradedFooter(migrated);
  // The panel and the table take the same map: this page mounts both directly,
  // so the Tailwind tab's look has to come from here.
  const classNames = kitClassNames(adapter);

  return (
    <div className="mx-demo" dir={initialDemoDirection()}>
      <KitProvider kit={adapter} dark={dark} dir={initialDemoDirection()}>
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
                labels={getLabels(initialDemoLocale())}
                classNames={classNames}
                footer={
                  footer === undefined ? undefined : (
                    <span data-testid="migrated">{footer}</span>
                  )
                }
              />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={null}>
              <Table
                dir={initialDemoDirection()}
                data={rosterFor("saved-views")}
                columns={BASE_COLUMNS}
                rowKey={(row) => row.id}
                urlKey={SAVED_VIEWS_URL_KEY}
                urlAdapter={session}
                defaultColumnLayout={layoutFor("saved-views")}
                // The feature owns both the views menu and its runtime state.
                features={[kitSavedViewsFeature(adapter, savedViewsOptions)]}
                labels={getLabels(initialDemoLocale())}
                classNames={classNames}
              />
            </Suspense>
          </div>
        </div>
      </KitProvider>
    </div>
  );
}
