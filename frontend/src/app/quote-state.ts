import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import {
  decodeForm,
  isFieldKind,
  isKindValue,
  isRecord,
  isSafeId,
  reconcileDraft,
  validateField,
  type Country,
  type DraftEntry,
  type FormDefinition,
  type QuoteDraft,
} from '@quote/contract';
import type { Subscription } from 'rxjs';

type LoadState =
  | { phase: 'idle' }
  | { phase: 'loading' | 'unavailable'; country: Country }
  | { phase: 'ready'; country: Country; form: FormDefinition; validation?: DraftValidation };

type DraftValidation = { date: string; invalidFields: readonly string[] };

export const QUOTE_CLOCK = new InjectionToken<() => Date>('quote calendar clock', {
  providedIn: 'root',
  factory: () => () => new Date(),
});

function civilDate(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

function evaluate(form: FormDefinition, draft: QuoteDraft, now: Date): DraftValidation {
  const invalidFields = form.fields
    .filter((field) => validateField(field, draft[field.id]?.value, now).length)
    .map((field) => field.id);
  return { date: civilDate(now), invalidFields };
}

function storageKey(country: Country) {
  return `quote-draft-v1:${country}`;
}

function restore(country: Country): QuoteDraft {
  try {
    const text = sessionStorage.getItem(storageKey(country));
    if (!text || text.length > 100_000) return {};
    const snapshot: unknown = JSON.parse(text);
    if (
      !isRecord(snapshot) ||
      snapshot['version'] !== 1 ||
      snapshot['country'] !== country ||
      !isRecord(snapshot['draft'])
    )
      return {};
    const entries = Object.entries(snapshot['draft']);
    if (entries.length > 40) return {};
    const draft: [string, DraftEntry][] = [];
    for (const [key, entry] of entries) {
      if (
        !isSafeId(key) ||
        !isRecord(entry) ||
        !isFieldKind(entry['kind']) ||
        (entry['value'] !== null && !isKindValue(entry['kind'], entry['value']))
      )
        return {};
      draft.push([key, { kind: entry['kind'], value: entry['value'] }]);
    }
    return Object.fromEntries(draft);
  } catch {
    return {};
  }
}

@Injectable({ providedIn: 'root' })
export class QuoteState {
  private readonly http = inject(HttpClient);
  private readonly clock = inject(QUOTE_CLOCK);
  private readonly current = signal<LoadState>({ phase: 'idle' });
  private readonly drafts = signal<Partial<Record<Country, QuoteDraft>>>({});
  private request?: Subscription;
  private generation = 0;

  readonly state = this.current.asReadonly();

  leave() {
    this.generation++;
    this.request?.unsubscribe();
    this.current.set({ phase: 'idle' });
  }

  load(country: Country, refresh = false) {
    const state = this.current();
    if (!refresh && state.phase !== 'idle' && state.country === country) return;
    const generation = ++this.generation;
    this.request?.unsubscribe();
    this.current.set({ phase: 'loading', country });

    const stillCurrent = () =>
      generation === this.generation &&
      this.current().phase === 'loading' &&
      this.currentCountry() === country;
    const unavailable = () => {
      if (stillCurrent()) this.current.set({ phase: 'unavailable', country });
    };
    this.request = this.http
      .get<unknown>(`/api/quote-content/v1/${country}/form`, {
        timeout: 10_000,
      })
      .subscribe({
        next: (input) => {
          if (!stillCurrent()) return;
          const now = this.clock();
          const form = decodeForm(input, country, now);
          if (!form) return unavailable();
          const draft = reconcileDraft(form.fields, this.draft(country));
          this.save(country, draft);
          this.current.set({
            phase: 'ready',
            country,
            form,
            validation: evaluate(form, draft, now),
          });
        },
        error: unavailable,
      });
  }

  private currentCountry(): Country | null {
    const state = this.current();
    return state.phase === 'idle' ? null : state.country;
  }

  draft(country: Country): QuoteDraft {
    return this.drafts()[country] ?? restore(country);
  }

  save(country: Country, draft: QuoteDraft) {
    this.drafts.update((drafts) => ({ ...drafts, [country]: draft }));
    const state = this.current();
    if (state.phase === 'ready' && state.country === country && state.validation) {
      this.current.set({ ...state, validation: undefined });
    }
    try {
      sessionStorage.setItem(storageKey(country), JSON.stringify({ version: 1, country, draft }));
    } catch {
      // The in-memory copy remains available for this page session.
    }
  }

  canContinue(country: Country): boolean {
    const state = this.current();
    if (state.phase !== 'ready' || state.country !== country) return false;
    const now = this.clock();
    const validation =
      civilDate(now) === state.validation?.date
        ? state.validation
        : evaluate(state.form, this.draft(country), now);
    return validation.invalidFields.length === 0;
  }
}
