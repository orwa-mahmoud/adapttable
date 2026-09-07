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
const WIDTHS = [320, 390, 414, 768];
const b = await chromium.launch();
const bad = [];
let checked = 0;
for (const kit of KITS) {
  for (const page of PAGES) {
    for (const w of WIDTHS) {
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
        await p.waitForTimeout(500);
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
            bad.push(`${kit}/${page} @${w} ${o.p} x=${o.x} right=${o.r}`);
          await p.keyboard.press("Escape").catch(() => {});
          await p.waitForTimeout(150);
        }
        const over = await p.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth
        );
        if (over > 1)
          bad.push(`${kit}/${page} @${w} PAGE SCROLLS SIDEWAYS by ${over}`);
      } catch {
        /* page missing */
      }
      await p.close();
    }
  }
}
console.log("screens checked:", checked);
console.log(
  bad.length
    ? bad.slice(0, 20).join("\n")
    : "CLEAN — nothing escaped the viewport"
);
console.log("findings:", bad.length);
await b.close();
