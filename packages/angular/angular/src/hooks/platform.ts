/**
 * Whether the table runs in a browser. Effects run on the server too, and a
 * server may carry window-like globals, so the platform decides — never the
 * globals.
 */
import { isPlatformBrowser } from "@angular/common";
import { type Injector, PLATFORM_ID } from "@angular/core";

/**
 * `true` when the injector's platform is a browser.
 *
 * @param injector - The injector the caller runs in.
 * @returns Whether `window` and `document` are the reader's.
 */
export function onBrowser(injector: Injector): boolean {
  return isPlatformBrowser(injector.get(PLATFORM_ID));
}
