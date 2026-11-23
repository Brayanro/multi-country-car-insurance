import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import {
  decodePlanCatalog,
  decodePlanPrice,
  isPlanId,
  isRecord,
  type Country,
  type Plan,
  type PlanPrice,
} from '@quote/contract';
import type { Subscription } from 'rxjs';

type Candidate = { id: string; price: PlanPrice };
type ReadMode = 'loading' | 'retrying' | 'checking';

export type PlanView =
  | { phase: 'idle' }
  | { phase: ReadMode | 'unavailable'; country: Country }
  | {
      phase: 'ready';
      country: Country;
      plans: readonly Plan[];
      lostChoice: boolean;
      checkedForSummary: boolean;
      recovered: boolean;
    };

function candidateKey(country: Country) {
  return `quote-plan-v1:${country}`;
}

function restoreCandidate(country: Country): Candidate | null {
  try {
    const text = sessionStorage.getItem(candidateKey(country));
    if (!text || text.length > 512) return null;
    const value: unknown = JSON.parse(text);
    if (
      !isRecord(value) ||
      value['version'] !== 1 ||
      value['country'] !== country ||
      !isPlanId(value['id'])
    )
      return null;
    const price = decodePlanPrice(value['price'], country);
    return price ? { id: value['id'], price } : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class PlanState {
  private readonly http = inject(HttpClient);
  private readonly current = signal<PlanView>({ phase: 'idle' });
  private readonly candidates = signal<Partial<Record<Country, Candidate | null>>>({});
  private request?: Subscription;
  private generation = 0;

  readonly view = this.current.asReadonly();

  leave() {
    this.generation++;
    this.request?.unsubscribe();
    this.current.set({ phase: 'idle' });
  }

  hasCandidate(country: Country) {
    return this.candidate(country) !== null;
  }

  selected(country: Country): Plan | null {
    const state = this.current();
    if (state.phase !== 'ready' || state.country !== country) return null;
    return this.match(state.plans, this.candidate(country));
  }

  choose(country: Country, id: string) {
    const state = this.current();
    if (state.phase !== 'ready' || state.country !== country) return;
    const choice = state.plans.find((plan) => plan.id === id);
    if (!choice) return;
    this.save(country, { id: choice.id, price: choice.basePrice });
    if (state.lostChoice) this.current.set({ ...state, lostChoice: false });
  }

  clearCandidate(country: Country) {
    this.save(country, null);
  }

  removeStoredCandidate(country: Country) {
    const key = candidateKey(country);
    sessionStorage.removeItem(key);
    return sessionStorage.getItem(key) === null;
  }

  clearCandidateMemory(country: Country) {
    this.candidates.update((values) => ({ ...values, [country]: null }));
  }

  read(country: Country, phase: ReadMode) {
    const generation = ++this.generation;
    this.request?.unsubscribe();
    this.current.set({ phase, country });

    const stillCurrent = () => {
      const state = this.current();
      return generation === this.generation && state.phase === phase && state.country === country;
    };
    const unavailable = () => {
      if (stillCurrent()) this.current.set({ phase: 'unavailable', country });
    };
    this.request = this.http
      .get<unknown>(`/api/quote-content/v1/${country}/plans`, { timeout: 10_000 })
      .subscribe({
        next: (input) => {
          if (!stillCurrent()) return;
          const catalog = decodePlanCatalog(input, country);
          if (!catalog) return unavailable();
          const candidate = this.candidate(country);
          const lostChoice = candidate !== null && !this.match(catalog.plans, candidate);
          if (lostChoice) this.clearCandidate(country);
          this.current.set({
            phase: 'ready',
            country,
            plans: catalog.plans,
            lostChoice,
            checkedForSummary: phase === 'checking',
            recovered: phase === 'retrying',
          });
        },
        error: unavailable,
      });
  }

  private candidate(country: Country) {
    const memory = this.candidates()[country];
    return memory === undefined ? restoreCandidate(country) : memory;
  }

  private match(plans: readonly Plan[], candidate: Candidate | null): Plan | null {
    if (!candidate) return null;
    return (
      plans.find(
        ({ id, basePrice }) =>
          id === candidate.id &&
          basePrice.amountMinor === candidate.price.amountMinor &&
          basePrice.currency === candidate.price.currency,
      ) ?? null
    );
  }

  private save(country: Country, candidate: Candidate | null) {
    this.candidates.update((values) => ({ ...values, [country]: candidate }));
    try {
      if (candidate) {
        sessionStorage.setItem(
          candidateKey(country),
          JSON.stringify({ version: 1, country, ...candidate }),
        );
      } else {
        sessionStorage.removeItem(candidateKey(country));
      }
    } catch {
      // Selection remains available in memory for the current page session.
    }
  }
}
