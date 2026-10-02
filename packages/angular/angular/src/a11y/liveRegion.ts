/**
 * A polite live region — the one way the table says something out loud.
 *
 * `aria-live="polite"` so it waits for a gap rather than interrupting,
 * `aria-atomic` so the whole phrase is read rather than the diff, and hidden
 * by clip rather than `display: none`, which a screen reader does not
 * announce at all. The region must be in the document before it has anything
 * to say, so a kit renders it from the first paint and changes its text.
 */
import { Directive, input } from "@angular/core";

/**
 * Makes its host a polite, visually hidden live region that speaks its text.
 * Put it on a `<div>` for a region present on every table, and on an
 * `<output>` — which is the status role — for one that is the only status on
 * screen.
 *
 * @public
 */
@Directive({
  selector: "[adaptLiveRegion]",
  host: {
    "aria-live": "polite",
    "aria-atomic": "true",
    "[attr.data-adapttable-part]": "part()",
    "[textContent]": "adaptLiveRegion()",
    "[style.position]": "'absolute'",
    "[style.width]": "'1px'",
    "[style.height]": "'1px'",
    "[style.margin]": "'-1px'",
    "[style.padding]": "'0'",
    "[style.overflow]": "'hidden'",
    "[style.clip]": "'rect(0, 0, 0, 0)'",
    "[style.white-space]": "'nowrap'",
    "[style.border]": "'0'",
  },
})
export class AdaptLiveRegion {
  /** What to announce. Empty until there is something to say. */
  readonly adaptLiveRegion = input.required<string>();
  /** `data-adapttable-part`, so a test or a style can find this region. */
  readonly part = input.required<string>();
}
