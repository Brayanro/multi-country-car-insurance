import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { decodeTerms, type Country, type Terms } from '@quote/contract';
import type { Subscription } from 'rxjs';
import { PlanState } from './plan-state';
import { QuoteState } from './quote-state';
import { receiptKey, restoreReceipt, type Receipt } from './quote-receipt';
import { reviewRows } from './quote-review';

type Outcome = 'approved' | 'rejected';
type Phase = 'idle' | 'loading' | 'ready' | 'unavailable' | 'checking' | 'processing';

type Consent = {
  terms: Terms;
  quote: string;
};

@Injectable({ providedIn: 'root' })
export class QuotePayment {
  private readonly http = inject(HttpClient);
  private readonly details = inject(QuoteState);
  private readonly plans = inject(PlanState);
  private readonly country = signal<Country | null>(null);
  private readonly currentPhase = signal<Phase>('idle');
  private readonly currentTerms = signal<Terms | null>(null);
  private readonly consent = signal<Consent | null>(null);
  private readonly receipts = signal<Partial<Record<Country, Receipt | null>>>({});
  private readonly changed = signal(false);
  private readonly rejected = signal(false);
  private generation = 0;
  private request?: Subscription;
  private simulation?: ReturnType<typeof setTimeout>;

  readonly phase = this.currentPhase.asReadonly();
  readonly terms = this.currentTerms.asReadonly();
  readonly termsChanged = this.changed.asReadonly();
  readonly paymentRejected = this.rejected.asReadonly();
  readonly busy = computed(() => this.phase() === 'checking' || this.phase() === 'processing');
  readonly accepted = computed(() => {
    const country = this.country();
    const consent = this.consent();
    const terms = this.terms();
    return (
      !!country &&
      !!consent &&
      !!terms &&
      this.sameTerms(consent.terms, terms) &&
      consent.quote === this.quoteSnapshot(country)
    );
  });
  readonly canPay = computed(() => {
    const country = this.country();
    return !!country && this.phase() === 'ready' && this.accepted() && !this.receipt(country);
  });

  enter(country: Country) {
    this.leave();
    if (this.receipt(country)) return;
    this.country.set(country);
    this.loadTerms(country);
  }

  leave() {
    this.generation++;
    this.request?.unsubscribe();
    clearTimeout(this.simulation);
    this.country.set(null);
    this.currentPhase.set('idle');
    this.currentTerms.set(null);
    this.consent.set(null);
    this.changed.set(false);
    this.rejected.set(false);
  }

  receipt(country: Country) {
    const memory = this.receipts()[country];
    return memory === undefined ? restoreReceipt(country) : memory;
  }

  holdReceipt(country: Country, receipt: Receipt) {
    this.receipts.update((receipts) =>
      receipts[country] === receipt ? receipts : { ...receipts, [country]: receipt },
    );
  }

  restart(country: Country) {
    const receipt = this.receipt(country);
    if (!receipt) return false;
    // Keep the terminal receipt in memory even if storage becomes inaccessible during reset.
    this.holdReceipt(country, receipt);
    this.details.leave();
    this.plans.leave();
    this.leave();
    try {
      if (!this.details.removeStoredDraft(country) || !this.plans.removeStoredCandidate(country))
        return false;
      sessionStorage.removeItem(receiptKey(country));
    } catch {
      return false;
    }
    this.details.clearDraftMemory(country);
    this.plans.clearCandidateMemory(country);
    this.receipts.update((receipts) => ({ ...receipts, [country]: null }));
    return true;
  }

  accept(checked: boolean) {
    const country = this.country();
    const terms = this.terms();
    if (this.phase() !== 'ready' || !country || !terms) return;
    const quote = this.quoteSnapshot(country);
    this.consent.set(checked && quote !== null ? { terms, quote } : null);
    if (checked) this.changed.set(false);
  }

  retryTerms() {
    const country = this.country();
    if (country && this.phase() === 'unavailable') this.loadTerms(country);
  }

  pay(outcome: Outcome) {
    const country = this.country();
    const consent = this.consent();
    if (!country || !consent || !this.canPay() || consent.quote !== this.quoteSnapshot(country))
      return;
    const generation = ++this.generation;
    this.currentPhase.set('checking');
    this.rejected.set(false);
    const stillCurrent = () => this.generation === generation && this.country() === country;
    const stillEligible = () =>
      this.consent() === consent && this.quoteSnapshot(country) === consent.quote;
    this.readTerms(country, generation, (terms) => {
      this.applyTerms(terms);
      if (!this.sameTerms(terms, consent.terms) || !stillEligible()) {
        this.currentPhase.set('ready');
        return;
      }
      this.currentPhase.set('processing');
      this.simulation = setTimeout(() => {
        if (!stillCurrent() || this.phase() !== 'processing') return;
        if (stillEligible()) {
          if (outcome === 'approved') this.complete(country);
          else this.rejected.set(true);
        }
        this.currentPhase.set('ready');
      }, 450);
    });
  }

  private loadTerms(country: Country) {
    this.currentPhase.set('loading');
    this.readTerms(country, ++this.generation, (terms) => {
      this.applyTerms(terms);
      this.currentPhase.set('ready');
    });
  }

  private readTerms(country: Country, generation: number, ready: (terms: Terms) => void) {
    this.request?.unsubscribe();
    const stillCurrent = () => generation === this.generation && this.country() === country;
    const unavailable = () => {
      if (stillCurrent()) this.currentPhase.set('unavailable');
    };
    this.request = this.http
      .get<unknown>(`/api/quote-content/v1/${country}/terms`, { timeout: 10_000 })
      .subscribe({
        next: (input) => {
          if (!stillCurrent()) return;
          const terms = decodeTerms(input, country);
          const previous = this.terms();
          if (
            !terms ||
            (previous && previous.revision === terms.revision && previous.text !== terms.text)
          ) {
            unavailable();
          } else {
            ready(terms);
          }
        },
        error: unavailable,
      });
  }

  private applyTerms(terms: Terms) {
    const previous = this.terms();
    if (previous && !this.sameTerms(previous, terms)) {
      this.consent.set(null);
      this.changed.set(true);
    }
    this.currentTerms.set(terms);
  }

  private sameTerms(first: Terms, second: Terms) {
    return (
      first.country === second.country &&
      first.revision === second.revision &&
      first.text === second.text
    );
  }

  private quoteSnapshot(country: Country) {
    const state = this.details.state();
    const catalog = this.plans.view();
    const selected = this.plans.selected(country);
    if (
      state.phase !== 'ready' ||
      state.country !== country ||
      !this.details.canContinue(country) ||
      catalog.phase !== 'ready' ||
      catalog.country !== country ||
      !catalog.checkedForSummary ||
      !selected
    )
      return null;
    return JSON.stringify([
      this.details.draftRevision(country),
      state.form.fields.map(({ id, kind }) => [id, kind]),
      selected.id,
      selected.basePrice.amountMinor,
      selected.basePrice.currency,
    ]);
  }

  private complete(country: Country) {
    if (this.receipt(country)) return;
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const number =
      'DEMO-' +
      Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    const state = this.details.state();
    const plan = this.plans.selected(country);
    if (state.phase !== 'ready' || state.country !== country || !plan) return;
    const review = {
      rows: reviewRows(state.form, this.details.draft(country)),
      planName: plan.name,
      price: { ...plan.basePrice },
    };
    let persisted = false;
    try {
      sessionStorage.setItem(
        receiptKey(country),
        JSON.stringify({ version: 2, country, number, review }),
      );
      persisted = true;
    } catch {
      // The completed receipt stays locked and recoverable in memory.
    }
    this.receipts.update((receipts) => ({ ...receipts, [country]: { number, review, persisted } }));
  }
}
