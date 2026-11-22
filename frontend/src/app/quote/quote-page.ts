import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  DestroyRef,
  inject,
  Injector,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isCountry, type Country } from '@quote/contract';
import { CountryPicker } from '../country-selection/country-picker';
import { DetailsForm } from './details-form';
import { PlanList } from './plan-list';
import { PlanState } from './plan-state';
import { QuoteState } from './quote-state';
import { WizardProgress } from './wizard-progress';

type QuoteRoute = { country: Country; step: 'details' | 'plans' | 'summary' };

@Component({
  selector: 'app-quote-page',
  imports: [WizardProgress, DetailsForm, PlanList, RouterLink, CountryPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (page(); as page) {
      <main id="main-content" tabindex="-1" class="wizard pb-16">
        @let summary = summaryReady(page);
        <app-wizard-progress [step]="page.step === 'details' ? 1 : summary ? 3 : 2" />
        @if (page.step === 'details') {
          <div class="step-heading mt-6 mb-3.5 lg:my-4 lg:text-center">
            <h1 tabindex="-1" id="screen-heading">Datos para cotizar</h1>
            @if (store.state().phase === 'ready') {
              <p class="mt-2 text-base text-secondary">
                Usa datos ficticios del titular y del vehículo.
              </p>
            }
          </div>
        }
        @let state = store.state();
        @if (state.phase === 'ready' && state.country === page.country) {
          @if (page.step === 'details') {
            <app-details-form [configuration]="state.form" (complete)="advance(page.country)" />
          } @else if (summary) {
            <section
              class="status-panel mt-9 rounded-lg border border-divider bg-paper px-4 py-5 sm:px-6"
            >
              <h1 tabindex="-1" id="summary-heading">Resumen</h1>
              <a
                class="mt-2 inline-flex min-h-11 items-center font-bold text-link underline underline-offset-4"
                [routerLink]="['/', page.country, 'quote', 'plans']"
                >Volver a planes</a
              >
            </section>
          } @else if (store.canContinue(page.country)) {
            <app-plan-list [country]="page.country" (complete)="openSummary(page.country)" />
          }
        } @else if (state.phase === 'unavailable' && state.country === page.country) {
          <section
            class="status-panel rounded-lg border border-error bg-error-tint px-4 py-5 text-error sm:px-6"
          >
            <h2 id="configuration-error" tabindex="-1">Formulario no disponible</h2>
            <p class="mt-2 text-sm text-error">
              No pudimos cargar el formulario. Intenta de nuevo.
            </p>
            <button
              class="primary-button mt-4 inline-flex min-h-12 items-center justify-center rounded-md bg-action px-6 text-base font-bold text-white hover:bg-action-hover active:bg-action-hover"
              type="button"
              (click)="store.load(page.country, true)"
            >
              Reintentar
            </button>
          </section>
        } @else {
          <section class="status-panel rounded-lg border border-divider bg-paper px-4 py-5 sm:px-6">
            <h2>Cargando el formulario…</h2>
            <p class="mt-2 text-sm text-secondary">
              Estamos preparando los campos de la cotización.
            </p>
            <div class="mt-5 h-3 rounded bg-context" aria-hidden="true"></div>
            <div class="mt-2 h-3 w-3/5 rounded bg-context" aria-hidden="true"></div>
          </section>
        }
      </main>
    } @else if (invalid()) {
      <app-country-picker [unsupportedRoute]="true" />
    }
  `,
})
export class QuotePage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  protected readonly store = inject(QuoteState);
  protected readonly page = signal<QuoteRoute | null>(null);
  protected readonly invalid = signal(false);
  private readonly plans = inject(PlanState);
  private checkedRoute?: QuoteRoute;
  private recoverCatalogFor?: Country;
  private routeKey = '';
  private priorPhase: string | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.plans.leave());
    // The router reuses this component across quote routes.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const rawCountry = params.get('country');
      const rawStep = params.get('step');
      const country =
        rawCountry === 'CO' || rawCountry === 'CL' ? rawCountry.toLowerCase() : rawCountry;
      const validStep = rawStep === 'details' || rawStep === 'plans' || rawStep === 'summary';
      const recover = this.recoverCatalogFor === country && rawStep === 'plans';
      this.recoverCatalogFor = undefined;
      if (!recover && rawStep !== 'summary') this.plans.leave();
      if (rawStep === 'summary' && this.page()?.country !== country) this.plans.leave();
      this.checkedRoute = undefined;
      if (!isCountry(country)) {
        this.store.leave();
        this.page.set(null);
        this.invalid.set(true);
        return;
      }
      if (rawCountry !== country || !validStep) {
        if (this.page()?.country !== country) this.store.leave();
        this.page.set(null);
        const nextStep = validStep ? rawStep : 'details';
        void this.router.navigate(['/', country, 'quote', nextStep], { replaceUrl: true });
        return;
      }
      this.invalid.set(false);
      const page: QuoteRoute = { country, step: rawStep };
      if (recover) this.checkedRoute = page;
      this.page.set(page);
      this.store.load(country);
    });

    effect(() => {
      const page = this.page();
      const state = this.store.state();
      if (!page || state.phase === 'idle' || state.country !== page.country) return;
      const key = `${page.country}/${page.step}`;
      const previous = key === this.routeKey ? this.priorPhase : undefined;
      this.routeKey = key;
      this.priorPhase = state.phase;
      if (state.phase === 'unavailable') this.focus('configuration-error');
      else if (
        page.step === 'details' &&
        (previous === undefined || (previous === 'loading' && state.phase === 'ready'))
      ) {
        this.focus('screen-heading');
      }
    });

    effect(() => {
      const page = this.page();
      const form = this.store.state();
      if (
        !page ||
        page.step === 'details' ||
        form.phase !== 'ready' ||
        form.country !== page.country
      )
        return;
      if (!this.store.canContinue(page.country)) {
        this.redirect(page.country, 'details');
        return;
      }
      if (this.checkedRoute !== page) {
        this.checkedRoute = page;
        untracked(() => {
          if (page.step === 'summary' && !this.plans.hasCandidate(page.country)) {
            this.redirect(page.country, 'plans');
          } else {
            this.plans.read(page.country, page.step === 'summary' ? 'checking' : 'loading');
          }
        });
      }
      if (page.step === 'summary') this.checkSummary(page);
    });

    effect(() => {
      const page = this.page();
      if (page && this.summaryReady(page)) this.focus('summary-heading');
    });
  }

  protected advance(country: Country) {
    if (this.store.canContinue(country))
      void this.router.navigate(['/', country, 'quote', 'plans']);
  }

  protected openSummary(country: Country) {
    if (this.store.canContinue(country) && this.plans.selected(country)) {
      void this.router.navigate(['/', country, 'quote', 'summary']);
    }
  }

  protected summaryReady(page: QuoteRoute) {
    const view = this.plans.view();
    return (
      page.step === 'summary' &&
      view.phase === 'ready' &&
      view.country === page.country &&
      view.checkedForSummary &&
      this.store.canContinue(page.country) &&
      !!this.plans.selected(page.country)
    );
  }

  private checkSummary(page: QuoteRoute) {
    const view = this.plans.view();
    if (view.phase === 'idle' || view.country !== page.country) return;
    if (
      view.phase === 'unavailable' ||
      (view.phase === 'ready' && view.checkedForSummary && !this.plans.selected(page.country))
    ) {
      this.recoverCatalogFor = page.country;
      this.redirect(page.country, 'plans');
    }
  }

  private redirect(country: Country, step: 'details' | 'plans') {
    void this.router.navigate(['/', country, 'quote', step], { replaceUrl: true });
  }

  private focus(target: string) {
    afterNextRender(() => document.getElementById(target)?.focus(), { injector: this.injector });
  }
}
