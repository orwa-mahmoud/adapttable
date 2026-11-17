/**
 * What the agent is actually told about this table: the permitted contract
 * as it stands, what each turn carries, and one capability's schema. Always
 * LTR — a JSON schema read right-to-left demonstrates nothing. The page
 * moves this element into the documentation column beside the integration
 * example, so there is one inspector rather than a copy of one.
 */
import type {
  AgentContextInputs,
  AgentManifest,
  AgentSession,
} from "@adapttable/ai";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from "@angular/core";

import { docsUrl } from "../matrix/content";
import type { DemoContextProfile } from "../shared/aiDemo";
import {
  inspectedContext,
  INSPECTOR_LINKS,
  INSPECTOR_TEXT,
  inspectorView,
} from "../shared/aiInspector";

/** Where the matrix page keeps the inspector. */
const INSPECTOR_SLOT = "mx-inspector-slot";

@Component({
  selector: "adapt-ai-context-inspector",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ai-demo__dev" data-testid="ai-inspector" dir="ltr">
      <h3 class="ai-demo__dev-title">{{ text.title }}</h3>
      <p class="ai-demo__revision">{{ view().revision }}</p>

      <dl class="ai-demo__facts" data-testid="ai-context-facts">
        <div>
          <dt>{{ text.version }}</dt>
          <dd>
            <code data-testid="ai-contract-version">{{ view().version }}</code>
          </dd>
        </div>
        <div>
          <dt>{{ text.sent }}</dt>
          <dd data-testid="ai-context-size">{{ view().sent }}</dd>
        </div>
        <div>
          <dt>{{ text.upfront }}</dt>
          <dd data-testid="ai-context-upfront">{{ view().upfront }}</dd>
        </div>
        <div>
          <dt>{{ text.deferred }}</dt>
          <dd data-testid="ai-context-deferred">{{ view().deferred }}</dd>
        </div>
      </dl>

      @if (view().notes.length > 0) {
        <ul class="ai-demo__notes" data-testid="ai-context-notes">
          @for (note of view().notes; track note) {
            <li>{{ note }}</li>
          }
        </ul>
      }

      <p class="ai-demo__note" data-testid="ai-sampling-note">
        {{ view().sampling }}
      </p>
      <p class="ai-demo__note" data-testid="ai-webmcp-tools">
        {{ view().webmcp }}
      </p>

      <label class="ai-demo__pick">
        <span>{{ text.capability }}</span>
        <select data-testid="ai-catalog" (change)="pick($event)">
          @for (entry of view().capabilities; track entry.key) {
            <option
              [value]="entry.key"
              [selected]="entry.key === view().selected"
            >
              {{ entry.label }}
            </option>
          } @empty {
            <option value="">{{ text.noCapabilities }}</option>
          }
        </select>
      </label>

      <div class="ai-demo__schema-wrap">
        <button
          type="button"
          class="ai-demo__copy"
          data-testid="ai-schema-copy"
          (click)="copySchema()"
        >
          {{ text.copy }}
        </button>
        <pre
          class="ai-demo__schema"
          data-testid="ai-schema"
          dir="ltr"
          [attr.aria-label]="text.schemaFor(view().selected)"
          >{{ view().schema }}</pre>
      </div>

      <p class="ai-demo__refs">
        @for (link of links; track link.page) {
          <a [href]="docsUrl(link.page, 'angular')">{{ link.label }}</a>
        }
      </p>
    </section>
  `,
})
export class AiContextInspector {
  readonly session = input<AgentSession | undefined>();
  readonly manifest = input<AgentManifest | undefined>();
  readonly contextInputs = input.required<() => AgentContextInputs>();
  readonly profile = input.required<DemoContextProfile>();
  readonly webmcpNames = input.required<readonly string[]>();

  readonly text = INSPECTOR_TEXT;
  readonly links = INSPECTOR_LINKS;
  readonly docsUrl = docsUrl;
  private readonly picked = signal("");

  // Rebuilt when the session, the manifest or the profile moves: a new
  // manifest is published only when one actually differs.
  private readonly context = computed(() =>
    inspectedContext(
      this.session(),
      this.manifest(),
      this.profile(),
      this.contextInputs()
    )
  );
  readonly view = computed(() =>
    inspectorView(
      this.context(),
      this.manifest(),
      this.picked(),
      this.webmcpNames(),
      this.session() !== undefined
    )
  );

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => {
      host.ownerDocument.getElementById(INSPECTOR_SLOT)?.append(host);
    });
  }

  pick(event: Event): void {
    if (event.target instanceof HTMLSelectElement)
      this.picked.set(event.target.value);
  }

  copySchema(): void {
    const view = this.view();
    void navigator.clipboard?.writeText(view.copyable ? view.schema : "");
  }
}
