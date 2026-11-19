import { useEffect, useState, useSyncExternalStore } from "react";

import {
  onTableAction,
  SITE_EVENT,
  track,
  trackOnce,
} from "../../../scripts/site-events.mjs";
import { assistantActive, subscribeAssistantActive } from "./assistantActivity";

const DISMISS_KEY = "adapttable-star-the-repo";
const START_KEY = "adapttable-star-the-repo-since";
const CLOSED_KEY = "adapttable-star-the-repo-closed";
const ACTIONS_KEY = "adapttable-star-the-repo-actions";
const DELAY_MS = 20_000;
/** Actions on a live table in this tab before the prompt may open. */
const REQUIRED_ACTIONS = 3;
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
 * Actions on a live table counted in this tab, across demo pages; `null`
 * when session storage is unavailable, which keeps the prompt closed.
 */
const readActions = (): number | null => {
  try {
    const count = Number(window.sessionStorage.getItem(ACTIONS_KEY) ?? "0");
    return Number.isFinite(count) ? count : 0;
  } catch {
    return null;
  }
};

/** Count one more table action; the new total, or `null` without storage. */
const countAction = (): number | null => {
  const count = readActions();
  if (count === null) return null;
  try {
    window.sessionStorage.setItem(ACTIONS_KEY, String(count + 1));
    return count + 1;
  } catch {
    return null;
  }
};

/**
 * Centered modal on the live demo that asks once for a GitHub star. It opens
 * when twenty seconds have passed since the first demo page in this tab AND
 * the visitor has acted on a live table three times in this tab; whichever
 * comes last opens it. It does not block the table. Close hides it for this
 * tab; Don't show again or the star link writes localStorage and never shows
 * again on this device until that key is cleared.
 */
export function StarTheRepo() {
  const [open, setOpen] = useState(false);
  // An open conversation, a turn in flight or a pending approval outranks
  // this. The prompt is not cancelled — the timer keeps its place and it
  // appears once the reader is done.
  const busy = useSyncExternalStore(
    subscribeAssistantActive,
    assistantActive,
    () => false
  );

  useEffect(() => {
    if (readDismissed() || readClosed()) return;
    if (navigator.webdriver) return;

    const remaining = DELAY_MS - (Date.now() - readStart());
    let waited = remaining <= 0;
    let used = (readActions() ?? 0) >= REQUIRED_ACTIONS;
    const openWhenDue = () => {
      if (waited && used) setOpen(true);
    };
    const stopCounting = onTableAction(() => {
      const count = countAction();
      if (count === null || count < REQUIRED_ACTIONS) return;
      used = true;
      openWhenDue();
    });
    const timer = waited
      ? undefined
      : window.setTimeout(() => {
          waited = true;
          openWhenDue();
        }, remaining);
    openWhenDue();
    return () => {
      stopCounting();
      window.clearTimeout(timer);
    };
  }, []);

  const close = () => {
    track(SITE_EVENT.starPromptClosed, { item: "close" });
    persistClosed();
    setOpen(false);
  };

  const dismissForever = () => {
    persistDismissed();
    persistClosed();
    setOpen(false);
  };

  const star = () => {
    track(SITE_EVENT.starPromptStar);
    dismissForever();
  };

  const never = () => {
    track(SITE_EVENT.starPromptClosed, { item: "never" });
    dismissForever();
  };

  const visible = open && !busy;
  useEffect(() => {
    if (visible)
      trackOnce(SITE_EVENT.starPromptShown, SITE_EVENT.starPromptShown);
  }, [visible]);

  if (!visible) return null;

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
          onClick={star}
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
        <button type="button" className="star-the-repo__skip" onClick={never}>
          Don&apos;t show again
        </button>
      </div>
    </section>
  );
}
