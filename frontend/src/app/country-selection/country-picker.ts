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
    <main id="main-content" tabindex="-1" class="picker shell">
      <div class="picker-intro">
        <div class="accent-line" aria-hidden="true"></div>
        <h1 tabindex="-1" id="screen-heading">¿Dónde quieres cotizar?</h1>
        <p>Elige el país donde está registrado tu vehículo.</p>
      </div>
      <div class="country-choices">
        @if (unsupported()) {
          <div class="status-panel error-panel route-error">
            <p><strong>Este país no está disponible.</strong></p>
            <p>Elige Colombia o Chile para continuar.</p>
          </div>
        }
        <a class="country-choice" routerLink="/co/quote/details">
          <span class="country-code" aria-hidden="true">CO</span>
          <span>Colombia</span>
          <img src="icons/arrow-right.svg" alt="" width="20" height="20" />
        </a>
        <a class="country-choice" routerLink="/cl/quote/details">
          <span class="country-code" aria-hidden="true">CL</span>
          <span>Chile</span>
          <img src="icons/arrow-right.svg" alt="" width="20" height="20" />
        </a>
      </div>
      <p class="picker-footer">Usa datos ficticios para cotizar.</p>
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
