/**
 * Where the conversation goes: this page's script, or the reader's own
 * endpoint. Nothing reaches the network until Connect is pressed, and the
 * token is the endpoint's own, held in this form only.
 */
import type { AgentSession, AssistantTransport } from "@adapttable/ai";
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  type ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";

import {
  type AiProtocol,
  CONNECTION_STEPS,
  CONNECTION_TEXT,
  connectShowcaseBackend,
  PROTOCOLS,
  scriptedConnection,
  SHOWCASE_AI_ENDPOINT,
  type ShowcaseConnection,
} from "../aiBackendConnection";
import { docsUrl } from "../matrix/content";
import { codeSpans } from "../shared/codeSpans";

let fieldSequence = 0;

@Component({
  selector: "adapt-ai-connect-dialog",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="ai-conn-dialog"
      [attr.aria-label]="text.dialogLabel"
      (cancel)="$event.preventDefault(); closed.emit()"
    >
      <header class="ai-conn-dialog__head">
        <h3>{{ text.title }}</h3>
        <button
          type="button"
          class="ai-conn-dialog__close"
          aria-label="Close"
          (click)="closed.emit()"
        >
          ✕
        </button>
      </header>
      <div class="ai-conn" aria-label="Assistant connection">
        <p class="ai-conn__now">
          @if (connection().mode === "simulated") {
            <strong>{{ text.scripted }}</strong>
            <span>{{ text.scriptedHelp }}</span>
          } @else {
            <strong>{{ connectedLabel() }}</strong>
            <span>{{ connection().endpoint }}</span>
          }
        </p>

        @if (connection().mode === "simulated") {
          <ol class="ai-conn__steps">
            @for (step of steps; track step.title) {
              <li>
                <strong>{{ step.title }}</strong>
                {{ " " }}
                @for (part of codeSpans(step.body); track $index) {
                  @if (part.code) {
                    <code>{{ part.text }}</code>
                  } @else {
                    {{ part.text }}
                  }
                }
              </li>
            }
          </ol>
          <form class="ai-conn__form" (submit)="submit($event)">
            <fieldset class="ai-conn__protocol">
              <legend>{{ text.protocol }}</legend>
              @for (option of protocols; track option.value) {
                <label>
                  <input
                    type="radio"
                    name="ai-protocol"
                    [value]="option.value"
                    [checked]="protocol() === option.value"
                    (change)="protocol.set(option.value)"
                  />
                  <span>
                    {{ option.label }} —
                    @for (part of codeSpans(option.help); track $index) {
                      @if (part.code) {
                        <code>{{ part.text }}</code>
                      } @else {
                        {{ part.text }}
                      }
                    }
                  </span>
                </label>
              }
            </fieldset>
            <label [attr.for]="endpointId">{{ text.endpoint }}</label>
            <input
              [id]="endpointId"
              type="url"
              [value]="endpoint()"
              (input)="endpoint.set(field($event))"
            />
            <label [attr.for]="tokenId">{{ text.token }}</label>
            <input
              [id]="tokenId"
              type="password"
              autocomplete="off"
              [value]="token()"
              [placeholder]="text.tokenPlaceholder"
              (input)="token.set(field($event))"
            />
            <p class="ai-conn__note">
              {{ text.note }}
              <a [href]="docsUrl('ai-http', 'angular')">{{ text.runExample }}</a
              >.
            </p>
            @if (error()) {
              <p class="ai-conn__error" role="alert">{{ error() }}</p>
            }
            <span class="ai-conn__row">
              <button type="submit" class="ai-conn__btn" [disabled]="busy()">
                {{ busy() ? text.connecting : text.connect }}
              </button>
              <button
                type="button"
                class="ai-conn__btn"
                (click)="closed.emit()"
              >
                {{ text.cancel }}
              </button>
            </span>
          </form>
        } @else {
          <button type="button" class="ai-conn__btn" (click)="disconnect()">
            {{ text.disconnect }}
          </button>
        }
      </div>
    </dialog>
  `,
})
export class AiConnectDialog {
  readonly open = input.required<boolean>();
  readonly session = input<AgentSession | undefined>();
  readonly connection = input.required<ShowcaseConnection>();
  readonly demoTransport = input.required<AssistantTransport>();
  readonly changed = output<ShowcaseConnection>();
  readonly closed = output();

  readonly text = CONNECTION_TEXT;
  readonly steps = CONNECTION_STEPS;
  readonly protocols = PROTOCOLS;
  readonly codeSpans = codeSpans;
  readonly docsUrl = docsUrl;
  readonly endpointId = `ai-endpoint-${String(++fieldSequence)}`;
  readonly tokenId = `ai-token-${String(fieldSequence)}`;
  readonly endpoint = signal(SHOWCASE_AI_ENDPOINT);
  readonly token = signal("");
  readonly protocol = signal<AiProtocol>("http");
  readonly busy = signal(false);
  readonly error = signal("");
  private request: AbortController | undefined;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>("dialog");

  constructor() {
    effect(() => {
      const element = this.dialog()?.nativeElement;
      if (!element) return;
      const open = this.open();
      if (open && !element.open) element.showModal();
      if (!open && element.open) element.close();
    });
    // A new session ends a handshake started against the old one.
    effect(() => {
      this.session();
      this.cancelRequest();
    });
    inject(DestroyRef).onDestroy(() => {
      this.cancelRequest();
    });
  }

  connectedLabel(): string {
    const mode = this.connection().mode;
    return mode === "simulated" ? "" : CONNECTION_TEXT.connected(mode);
  }

  field(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : "";
  }

  submit(event: Event): void {
    event.preventDefault();
    void this.connect();
  }

  private cancelRequest(): void {
    this.request?.abort();
    this.request = undefined;
    this.busy.set(false);
  }

  private async connect(): Promise<void> {
    const session = this.session();
    if (!session) {
      this.error.set(CONNECTION_TEXT.noSession);
      return;
    }
    this.cancelRequest();
    const current = new AbortController();
    this.request = current;
    this.busy.set(true);
    this.error.set("");
    try {
      const connection = await connectShowcaseBackend(
        session,
        this.endpoint(),
        this.token(),
        this.protocol(),
        current.signal
      );
      if (this.request !== current || this.session() !== session) return;
      this.changed.emit(connection);
      this.closed.emit();
    } catch (cause) {
      if (this.request === current && !current.signal.aborted)
        this.error.set(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (this.request === current) {
        this.request = undefined;
        this.busy.set(false);
      }
    }
  }

  disconnect(): void {
    // The token was only ever held in this form; dropping back to the
    // script leaves nothing behind that could reach the network.
    this.token.set("");
    this.changed.emit(scriptedConnection(this.demoTransport()));
    this.closed.emit();
  }
}
