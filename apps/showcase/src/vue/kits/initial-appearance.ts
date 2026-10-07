/** Use the workspace's URL and stored preference before a kit installs its theme. */
export function initialKitAppearance(): { dark: boolean; rtl: boolean } {
  const query = new URLSearchParams(window.location.search);
  const theme = query.get("theme");
  let stored = false;
  try {
    stored = window.localStorage.getItem("adapttable-demo-theme") === "dark";
  } catch {
    // The explicit link still controls appearance when storage is unavailable.
  }
  return {
    dark: theme === "dark" || (theme !== "light" && stored),
    rtl: query.get("lang") === "ar",
  };
}
