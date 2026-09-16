import { chromium } from "@playwright/test";
const KITS = [
  "mantine",
  "mui",
  "chakra",
  "antd",
  "radix",
  "base-ui",
  "shadcn",
  "tailwind",
];
const PAGES = [
  "filtering",
  "columns",
  "selection",
  "rows",
  "editing",
  "grouping",
  "ai",
];
const b = await chromium.launch();
const bad = [];
let checked = 0;
for (const rtl of [false, true]) {
  for (const kit of KITS) {
    for (const page of PAGES) {
      for (const w of rtl ? [390] : [320, 390, 414, 768]) {
        const p = await b.newPage({ viewport: { width: w, height: 780 } });
        try {
          const res = await p.goto(`http://localhost:5173/${kit}/${page}/`, {
            waitUntil: "domcontentloaded",
            timeout: 12000,
          });
          if (!res || res.status() >= 400) {
            await p.close();
            continue;
          }
          if (rtl)
            await p.evaluate(() =>
              document.documentElement.setAttribute("dir", "rtl")
            );
          await p.waitForTimeout(450);
          checked++;
          for (const name of [/filters/i, /columns/i, /views/i]) {
            const t = p.getByRole("button", { name }).first();
            if (!(await t.count())) continue;
            await t.click({ timeout: 2500 }).catch(() => {});
            await p.waitForTimeout(300);
            const out = await p.evaluate((vw) => {
              const sel =
                '[role="dialog"],[role="menu"],[data-adapttable-part$="-popover"],[data-adapttable-part$="-drawer"],[data-adapttable-part$="-menu"]';
              return [...document.querySelectorAll(sel)]
                .filter((e) => e.getClientRects().length)
                .map((e) => {
                  const r = e.getBoundingClientRect();
                  return {
                    p:
                      e.getAttribute("data-adapttable-part") ||
                      e.getAttribute("role"),
                    x: Math.round(r.x),
                    r: Math.round(r.right),
                  };
                })
                .filter((o) => o.x < -1 || o.r > vw + 1);
            }, w);
            for (const o of out)
              bad.push(
                `${rtl ? "rtl " : ""}${kit}/${page} @${w} ${o.p} x=${o.x}`
              );
            await p.keyboard.press("Escape").catch(() => {});
            await p.waitForTimeout(120);
          }
          const over = await p.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          );
          if (over > 1)
            bad.push(
              `${rtl ? "rtl " : ""}${kit}/${page} @${w} SCROLLS by ${over}`
            );
        } catch {
          /* missing */
        }
        await p.close();
      }
    }
  }
}
console.log("screens checked:", checked);
console.log(
  bad.length
    ? bad.slice(0, 15).join("\n")
    : "CLEAN — no overlay left the viewport, no page scrolled sideways"
);
console.log("findings:", bad.length);
await b.close();
