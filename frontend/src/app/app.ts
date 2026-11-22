import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { QuoteState } from './quote-state';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly store = inject(QuoteState);
  protected readonly configurationAnnouncement = computed(() => {
    const phase = this.store.state().phase;
    if (phase === 'loading') return 'Cargando el formulario';
    if (phase === 'unavailable')
      return 'No pudimos cargar el formulario. Puedes intentar de nuevo.';
    return '';
  });
}
