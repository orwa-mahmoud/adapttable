import { onScopeDispose, shallowRef, watch } from "vue";

export type WorkspaceView = "orders" | "dispatch" | "revenue";
interface Presentation {
  view: WorkspaceView;
  locale: "en" | "ar";
  layout: "auto" | "cards";
  dark: boolean;
}
const THEME_KEY = "adapttable-demo-theme";
function storedTheme(): boolean {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
}
function read(): Presentation {
  const query = new URLSearchParams(window.location.search);
  const view = query.get("view");
  const theme = query.get("theme");
  const dark = theme === "light" ? false : storedTheme();
  return {
    view: view === "dispatch" || view === "revenue" ? view : "orders",
    locale: query.get("lang") === "ar" ? "ar" : "en",
    layout: query.get("layout") === "cards" ? "cards" : "auto",
    dark: theme === "dark" || dark,
  };
}
/** Presentation navigation owns its parameters and preserves all binding URL namespaces. */
export function useWorkspacePresentation() {
  const state = shallowRef(read());
  const urlFor = (value: Presentation): URL => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", value.view);
    url.searchParams.set("lang", value.locale);
    url.searchParams.set("layout", value.layout);
    url.searchParams.set("theme", value.dark ? "dark" : "light");
    return url;
  };
  // Make the first history entry explicit, so Back does not read a newer theme preference.
  const initialUrl = urlFor(state.value);
  if (initialUrl.href !== window.location.href)
    window.history.replaceState(window.history.state, "", initialUrl);
  const restore = () => {
    state.value = read();
  };
  window.addEventListener("popstate", restore);
  onScopeDispose(() => {
    window.removeEventListener("popstate", restore);
  });
  watch(
    state,
    (value) => {
      document.documentElement.lang = value.locale;
      document.documentElement.dir = value.locale === "ar" ? "rtl" : "ltr";
      document.documentElement.style.colorScheme = value.dark
        ? "dark"
        : "light";
      document.body.dataset.workspaceTheme = value.dark ? "dark" : "light";
      try {
        window.localStorage.setItem(THEME_KEY, value.dark ? "dark" : "light");
      } catch {
        /* The URL still retains the chosen appearance. */
      }
    },
    { immediate: true }
  );
  const navigate = (change: Partial<Presentation>): void => {
    const next = { ...state.value, ...change };
    const url = urlFor(next);
    if (url.href !== window.location.href)
      window.history.pushState(window.history.state, "", url);
    state.value = next;
  };
  return { state, navigate };
}
