import { useEffect, useState } from "react";

const DISMISS_KEY = "adapttable-star-the-repo";
const START_KEY = "adapttable-star-the-repo-since";
const CLOSED_KEY = "adapttable-star-the-repo-closed";
const DELAY_MS = 20_000;
const REPO = "https://github.com/orwa-mahmoud/adapttable";

const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return true;
  }
};

const persistDismissed = (): void => {
  try {
    window.localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private mode: the prompt will not survive a reload anyway.
  }
};

const readClosed = (): boolean => {
  try {
    return window.sessionStorage.getItem(CLOSED_KEY) === "1";
  } catch {
    return false;
  }
};

const persistClosed = (): void => {
  try {
    window.sessionStorage.setItem(CLOSED_KEY, "1");
  } catch {
    // Session storage can be unavailable — closing still hides it this page.
  }
};

/** First demo-page visit in this tab. Survives MPA navigations. */
const readStart = (): number => {
  try {
    const raw = window.sessionStorage.getItem(START_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    const now = Date.now();
    window.sessionStorage.setItem(START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
};

/**
 * Centered modal on the live demo: twenty elapsed seconds from the first
 * demo page in this tab, then ask once for a GitHub star. Interaction is
 * not required. It does not block the table. Close hides it for this tab;
 * Don't show again or the star link writes localStorage and never shows
 * again on this device until that key is cleared.
 */
export function StarTheRepo() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readDismissed() || readClosed()) return;
    if (navigator.webdriver) return;

    const remaining = DELAY_MS - (Date.now() - readStart());
    if (remaining <= 0) {
      setOpen(true);
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), remaining);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    persistClosed();
    setOpen(false);
  };

  const dismissForever = () => {
    persistDismissed();
    persistClosed();
    setOpen(false);
  };

  if (!open) return null;

  return (
    <section
      className="star-the-repo"
      role="dialog"
      aria-labelledby="star-the-repo-title"
    >
      <button
        type="button"
        className="star-the-repo__close"
        aria-label="Close"
        onClick={close}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M2 2l10 10M12 2L2 12" />
        </svg>
      </button>
      <h2 id="star-the-repo-title" className="star-the-repo__title">
        Enjoying AdaptTable?
      </h2>
      <p className="star-the-repo__copy">
        A GitHub star helps more developers discover it.
      </p>
      <div className="star-the-repo__actions">
        <a
          className="star-the-repo__star"
          href={REPO}
          target="_blank"
          rel="noreferrer"
          onClick={dismissForever}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          Star AdaptTable
        </a>
        <button
          type="button"
          className="star-the-repo__skip"
          onClick={dismissForever}
        >
          Don&apos;t show again
        </button>
      </div>
    </section>
  );
}
