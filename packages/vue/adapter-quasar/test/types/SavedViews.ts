import {
  type SavedView,
  savedViews,
  SavedViewsPanel,
  type SavedViewsPanelProps,
  type SavedViewsStore,
  type UseSavedViewsOptions,
} from "@adapttable/quasar/saved-views";
import type { TableFeature } from "@adapttable/vue";
interface Row {
  id: string;
}
export const requests: string[] = [];
const view: SavedView = { name: "Mine", search: "", isDefault: true };
const store: SavedViewsStore = {
  list: () => Promise.resolve([view]),
  save: () => {
    requests.push("save");
    return Promise.resolve();
  },
  remove: () => {
    requests.push("remove");
    return Promise.resolve();
  },
};
const options: UseSavedViewsOptions = {
  storageKey: "consumer",
  storage: null,
  store,
};
export const features: TableFeature<Row>[] = [savedViews(() => options)];
export const props: SavedViewsPanelProps = {
  views: [view],
  onApply: (name) => {
    requests.push(name.toUpperCase());
  },
  onRename: (name, next) => {
    requests.push(name.toUpperCase(), next.toUpperCase());
  },
  onMove: (name, delta) => {
    requests.push(name.toUpperCase(), String(delta));
  },
  onSetDefault: () => {
    requests.push("default");
  },
  onRemove: () => {
    requests.push("remove");
  },
  classNames: { viewsPanel: "panel" },
};
export { SavedViewsPanel };
