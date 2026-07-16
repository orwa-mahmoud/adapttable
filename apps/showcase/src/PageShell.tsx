import type { ConfirmRequest } from "@adapttable/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, startTransition, useEffect, useState } from "react";

import { DEMO_CONFIRM_EVENT, DEMO_NOTICE_EVENT, type DemoNotice } from "./data";
import { AppNav, type DemoPage, Footer } from "./sections";

const queryClient = new QueryClient();

const THEME_KEY = "adapttable-demo-theme";

const readStoredTheme = (): boolean => {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark";
  } catch {
    return false;
  }
};

const storeTheme = (dark: boolean): void => {
  try {
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch {
    // Storage can be unavailable (private mode) — the theme simply
    // won't persist across pages then.
  }
};

/**
 * Shared chrome for every demo page: theme state, the app nav (page tabs),
 * footer, and the notice/confirm overlays the adapter demos dispatch to.
 * `root` is the relative prefix back to the demo home ("." on the home
 * page, ".." on subpages) so plain static links work from any depth.
 */
export function PageShell({
  active,
  root,
  children,
}: Readonly<{
  active: DemoPage;
  root: string;
  children: (dark: boolean) => ReactNode;
}>) {
  // Each demo page is its own static app, so the theme must live in
  // storage to survive page-to-page navigation.
  const [dark, setDark] = useState(readStoredTheme);
  const [notice, setNotice] = useState<DemoNotice | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(
    null
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    storeTheme(dark);
  }, [dark]);

  useEffect(() => {
    const onNotice = (event: Event) => {
      setNotice((event as CustomEvent<DemoNotice>).detail);
      window.setTimeout(() => setNotice(null), 2600);
    };
    const onConfirm = (event: Event) => {
      setConfirmRequest((event as CustomEvent<ConfirmRequest>).detail);
    };
    window.addEventListener(DEMO_NOTICE_EVENT, onNotice);
    window.addEventListener(DEMO_CONFIRM_EVENT, onConfirm);
    return () => {
      window.removeEventListener(DEMO_NOTICE_EVENT, onNotice);
      window.removeEventListener(DEMO_CONFIRM_EVENT, onConfirm);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppNav
        active={active}
        root={root}
        dark={dark}
        onToggleDark={() => {
          startTransition(() => setDark((d) => !d));
        }}
      />
      <main>{children(dark)}</main>
      <Footer root={root} />

      {notice && (
        <div
          role="status"
          style={{
            position: "fixed",
            insetInlineEnd: 20,
            bottom: 20,
            zIndex: 100,
            padding: "10px 16px",
            borderRadius: 10,
            background: notice.tone === "danger" ? "#b91c1c" : "#111827",
            color: "#fff",
            fontSize: 14,
            boxShadow: "0 8px 24px rgba(0,0,0,.25)",
          }}
        >
          {notice.message}
        </div>
      )}
      {confirmRequest && (
        <div
          role="presentation"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,.45)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={confirmRequest.title}
            style={{
              background: "var(--page-surface)",
              color: "var(--ink)",
              borderRadius: 14,
              padding: 24,
              maxWidth: 380,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>
              {confirmRequest.title}
            </h2>
            <p style={{ margin: "0 0 18px", color: "var(--ink-2)" }}>
              {confirmRequest.message}
            </p>
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                type="button"
                className="nav__icon"
                style={{ width: "auto", padding: "0 14px" }}
                onClick={() => setConfirmRequest(null)}
              >
                {confirmRequest.cancelLabel}
              </button>
              <button
                type="button"
                className="nav__cta"
                onClick={() => {
                  confirmRequest.onConfirm();
                  setConfirmRequest(null);
                }}
              >
                {confirmRequest.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </QueryClientProvider>
  );
}
