/**
 * A table's view state held in its store alone: page, sort, search, grouping
 * and filters, with no URL to read or write. A table that never shares its
 * view through the address bar uses this and carries no URL code.
 *
 * @packageDocumentation
 */
import type { FilterValue, SortDirection } from "../contracts/columns";
import type { TableViewStore } from "../url/viewStateStore";
import {
  type ActionDefinition,
  createTableStore,
  type TableStore,
} from "./tableStore";
import {
  clearAll,
  clearExtras,
  configureView,
  initializeGroupBy,
  sameViewConfig,
  setExtra,
  setExtras,
  setFilterTree,
  setGroupAggregateOverrides,
  setGroupBy,
  setLimit,
  setPage,
  setSearch,
  setSort,
  type TableViewStateConfig,
  toggleSortLevel,
  VIEW_CONFIG,
  VIEW_OVERRIDES,
  viewStateReader,
} from "./viewState";

/** The mutators of a view-state store, each one action on its store. */
export type ViewStoreActions = Omit<
  TableViewStore,
  | "getSnapshot"
  | "getServerSnapshot"
  | "subscribe"
  | "configure"
  | "claimNamespace"
>;

/**
 * The mutators every view-state store exposes, each dispatching its action
 * through `act`, which runs what the store needs first.
 *
 * @param store - The store the actions dispatch to.
 * @param act - Wraps each mutator with the store's own preparation.
 * @returns The mutators.
 */
export function viewStoreActions(
  store: TableStore,
  act: <TArgs extends readonly unknown[]>(
    run: (...args: TArgs) => void
  ) => (...args: TArgs) => void
): ViewStoreActions {
  const run = <TPayload>(action: ActionDefinition<TPayload>) =>
    act((payload: TPayload) => store.dispatch(action(payload)));
  return {
    setPage: run(setPage),
    setLimit: run(setLimit),
    setSearch: run(setSearch),
    setSort: act((key: string | undefined, dir?: SortDirection) =>
      store.dispatch(setSort({ key, dir }))
    ),
    setGroupBy: run(setGroupBy),
    initializeGroupBy: run(initializeGroupBy),
    setGroupAggregateOverrides: run(setGroupAggregateOverrides),
    toggleSortLevel: run(toggleSortLevel),
    setExtra: act((key: string, value: FilterValue) =>
      store.dispatch(setExtra({ key, value }))
    ),
    setExtras: run(setExtras),
    setFilterTree: run(setFilterTree),
    clearExtras: run(clearExtras),
    clearAll: run(clearAll),
  };
}

/** Releases nothing: a local store reads no shared namespace. */
const RELEASE_NOTHING = (): void => undefined;

/**
 * Create a view-state store that lives only in memory.
 *
 * @param config - Defaults and the extra keys read as numbers or arrays.
 * @param options - The table's store to scope the view state into, when the
 *   view state publishes with the table's other changes.
 * @returns The store. It reads and writes no URL.
 *
 * @public
 */
export function createLocalTableViewStore(
  config: TableViewStateConfig = {},
  options: { readonly store?: TableStore } = {}
): TableViewStore {
  const viewOf = viewStateReader();
  /**
   * The configuration reads use. A binding configures while it renders, so
   * a new one is kept here and reaches the slice with the next action.
   */
  let configured: TableViewStateConfig = {};
  let configPending = false;
  const seed: Parameters<typeof createTableStore>[0] = (writer) => {
    const configure = configureView(config);
    configure.reduce(writer, configure.payload);
    configured = writer.read(VIEW_CONFIG);
  };
  const store = options.store
    ? options.store.scope(seed)
    : createTableStore(seed);

  const act =
    <TArgs extends readonly unknown[]>(run: (...args: TArgs) => void) =>
    (...args: TArgs): void => {
      if (configPending) {
        configPending = false;
        store.dispatch(configureView(configured));
      }
      run(...args);
    };
  const snapshot = () => viewOf(store.read(VIEW_OVERRIDES), configured);

  return {
    getSnapshot: snapshot,
    getServerSnapshot: snapshot,
    subscribe: (listener) => store.slice(VIEW_OVERRIDES).subscribe(listener),
    configure(next) {
      if (sameViewConfig(configured, next)) return;
      configured = next;
      configPending = true;
    },
    claimNamespace: () => RELEASE_NOTHING,
    ...viewStoreActions(store, act),
  };
}
