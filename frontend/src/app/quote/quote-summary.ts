import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Country, FormDefinition, Plan } from '@quote/contract';
import { displayPrice } from './price-format';
import { QuotePayment } from './quote-payment';
import { reviewRows } from './quote-review';
import { QuoteState } from './quote-state';

@Component({
  selector: 'app-quote-summary',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quote-summary.html',
})
export class QuoteSummary {
  readonly country = input.required<Country>();
  readonly form = input.required<FormDefinition>();
  readonly plan = input.required<Plan>();

  protected readonly payment = inject(QuotePayment);
  private readonly details = inject(QuoteState);
  private readonly injector = inject(Injector);
  protected readonly rows = computed(() =>
    reviewRows(this.form(), this.details.draft(this.country())),
  );
  protected readonly price = computed(() => displayPrice(this.plan().basePrice));
  protected readonly outcome = signal<'approved' | 'rejected'>('approved');
  protected readonly status = computed(() => {
    switch (this.payment.phase()) {
      case 'loading':
        return 'Cargando términos…';
      case 'checking':
        return 'Comprobando los términos…';
      case 'processing':
        return 'Procesando el pago…';
      default:
        return '';
    }
  });
  private focusFrom?: 'pay' | 'retry';
  private origin?: EventTarget | null;

  constructor() {
    effect(() => {
      const country = this.country();
      untracked(() => {
        this.focusFrom = undefined;
        this.outcome.set('approved');
        this.payment.enter(country);
        this.focus('summary-heading');
      });
    });
    effect(() => {
      const phase = this.payment.phase();
      const changed = this.payment.termsChanged();
      if (!this.focusFrom || (phase !== 'ready' && phase !== 'unavailable')) return;
      const source = this.focusFrom;
      const origin = this.origin;
      this.focusFrom = undefined;
      if (phase === 'unavailable' && source === 'pay') this.focus('terms-retry', origin);
      if (phase === 'ready' && (source === 'retry' || changed)) this.focus('terms-heading', origin);
    });
  }

  protected updateConsent(event: Event) {
    if (event.currentTarget instanceof HTMLInputElement) {
      this.payment.accept(event.currentTarget.checked);
    }
  }

  protected retryTerms(event: MouseEvent) {
    this.rememberFocus('retry', event);
    this.payment.retryTerms();
  }

  protected pay(event: MouseEvent) {
    if (!this.payment.canPay()) return;
    this.rememberFocus('pay', event);
    this.payment.pay(this.outcome());
  }

  private rememberFocus(source: 'pay' | 'retry', event: MouseEvent) {
    this.focusFrom = source;
    this.origin = event.currentTarget === document.activeElement ? event.currentTarget : undefined;
  }

  private focus(id: string, origin?: EventTarget | null) {
    afterNextRender(
      () => {
        if (
          id === 'summary-heading' ||
          (origin &&
            (document.activeElement === origin || document.activeElement === document.body))
        ) {
          document.getElementById(id)?.focus();
        }
      },
      { injector: this.injector },
    );
  }
}
