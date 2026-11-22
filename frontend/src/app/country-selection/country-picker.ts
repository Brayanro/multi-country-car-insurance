import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { QuoteState } from '../quote/quote-state';

@Component({
  selector: 'app-country-picker',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      id="main-content"
      tabindex="-1"
      class="shell grid gap-6 py-10 lg:grid-cols-[1fr_0.85fr] lg:gap-x-20 lg:gap-y-8 lg:pt-32"
    >
      <div class="self-center">
        <div class="mb-4 h-px w-11 bg-link" aria-hidden="true"></div>
        <h1 tabindex="-1" id="screen-heading">¿Dónde quieres cotizar?</h1>
        <p class="mt-3 text-base text-secondary">
          Elige el país donde está registrado tu vehículo.
        </p>
      </div>
      <div class="grid gap-3">
        @if (unsupported()) {
          <div
            class="w-full rounded-lg border border-error bg-error-tint px-4 py-5 text-error sm:px-6"
          >
            <p class="text-error"><strong>Este país no está disponible.</strong></p>
            <p class="mt-2 text-sm text-error">Elige Colombia o Chile para continuar.</p>
          </div>
        }
        <a
          class="flex min-h-[4.5rem] min-w-0 items-center gap-3 rounded-md border border-control bg-paper px-4 py-3 font-heading text-xl hover:bg-context"
          routerLink="/co/quote/details"
        >
          <span
            class="rounded bg-context px-2 py-2 font-interface text-sm font-bold text-link"
            aria-hidden="true"
            >CO</span
          >
          <span>Colombia</span>
          <img class="ml-auto shrink-0" src="icons/arrow-right.svg" alt="" width="20" height="20" />
        </a>
        <a
          class="flex min-h-[4.5rem] min-w-0 items-center gap-3 rounded-md border border-control bg-paper px-4 py-3 font-heading text-xl hover:bg-context"
          routerLink="/cl/quote/details"
        >
          <span
            class="rounded bg-context px-2 py-2 font-interface text-sm font-bold text-link"
            aria-hidden="true"
            >CL</span
          >
          <span>Chile</span>
          <img class="ml-auto shrink-0" src="icons/arrow-right.svg" alt="" width="20" height="20" />
        </a>
      </div>
    </main>
  `,
})
export class CountryPicker {
  private readonly route = inject(ActivatedRoute);
  readonly unsupportedRoute = input(false);
  protected readonly unsupported = computed(
    () => this.unsupportedRoute() || this.route.snapshot.data['unsupported'] === true,
  );

  constructor() {
    inject(QuoteState).leave();
    afterNextRender(() => document.getElementById('screen-heading')?.focus());
  }
}
