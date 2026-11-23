import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  output,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Country } from '@quote/contract';
import { PlanState } from './plan-state';

import { displayPrice } from './price-format';

@Component({
  selector: 'app-plan-list',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-list.html',
})
export class PlanList {
  readonly country = input.required<Country>();
  readonly complete = output<void>();
  protected readonly store = inject(PlanState);
  private readonly injector = inject(Injector);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  private retryHadFocus = false;
  protected readonly view = computed(() => {
    const state = this.store.view();
    return state.phase !== 'idle' && state.country === this.country()
      ? state
      : { phase: 'loading' as const };
  });
  protected readonly selected = computed(() => this.store.selected(this.country()));
  protected readonly countryLabel = computed(() =>
    this.country() === 'co' ? 'Colombia' : 'Chile',
  );
  protected readonly status = computed(() => {
    const state = this.view();
    switch (state.phase) {
      case 'loading':
      case 'retrying':
        return 'Cargando los planes…';
      case 'checking':
        return 'Verificando tu plan…';
      case 'unavailable':
        return 'No pudimos cargar los planes. Intenta de nuevo.';
      case 'ready':
        if (state.lostChoice)
          return state.plans.length
            ? 'Tu plan cambió o ya no está disponible. Selecciona un plan para continuar.'
            : 'Tu plan cambió o ya no está disponible.';
        if (!state.plans.length) return 'No hay planes disponibles.';
        return state.recovered ? 'Planes disponibles.' : '';
    }
  });

  constructor() {
    effect(() => {
      this.country();
      this.focusHeading();
    });

    effect(() => {
      const state = this.view();
      if (state.phase === 'retrying') return;
      if (state.phase === 'ready' && state.recovered && this.retryHadFocus) {
        afterNextRender(
          () => {
            const focused = document.activeElement;
            if (focused === document.body) this.heading().nativeElement.focus();
          },
          { injector: this.injector },
        );
      }
      this.retryHadFocus = false;
    });
  }

  protected retry(event: MouseEvent) {
    if (this.view().phase !== 'unavailable') return;
    this.retryHadFocus = document.activeElement === event.currentTarget;
    this.store.read(this.country(), 'retrying');
  }

  protected proceed() {
    if (!this.selected()) return;
    this.heading().nativeElement.focus();
    this.complete.emit();
  }

  protected readonly displayPrice = displayPrice;

  private focusHeading() {
    afterNextRender(() => this.heading().nativeElement.focus(), { injector: this.injector });
  }
}
