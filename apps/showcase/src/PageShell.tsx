import type { ConfirmRequest } from "@adapttable/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, startTransition, useEffect, useState } from "react";

import { DEMO_CONFIRM_EVENT } from "./data";
import {
  readShowcaseTheme,
  storeShowcaseTheme,
  updateShowcaseThemeUrl,
} from "./matrix/theme";
import { AppNav, Footer } from "./sections";
import {
  type DemoNotice,
  listenForNotices,
  noticeStyle,
} from "./shared/demoNotice";
import { StarTheRepo } from "./StarTheRepo";

const queryClient = new QueryClient();

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
  /** The page's own id — see the note on the nav's page ids in `sections.tsx`. */
  active: string;
  root: string;
  children: (dark: boolean) => ReactNode;
}>) {
  // Each demo page is its own static app, so the theme must live in
  // storage to survive page-to-page navigation.
  const [dark, setDark] = useState(readShowcaseTheme);
  const [notice, setNotice] = useState<DemoNotice | null>(null);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(
    null
  );

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    storeShowcaseTheme(dark);
  }, [dark]);

  useEffect(() => {
    const onConfirm = (event: Event) => {
      setConfirmRequest((event as CustomEvent<ConfirmRequest>).detail);
    };
    const stopNotices = listenForNotices(setNotice);
    window.addEventListener(DEMO_CONFIRM_EVENT, onConfirm);
    return () => {
      stopNotices();
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
          const next = !dark;
          updateShowcaseThemeUrl(next);
          startTransition(() => setDark(next));
        }}
      />
      <main>{children(dark)}</main>
      <StarTheRepo />
      <Footer root={root} />

      {notice && (
        <div role="status" style={noticeStyle(notice)}>
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
