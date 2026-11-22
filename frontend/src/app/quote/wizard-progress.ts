import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-wizard-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol
      class="wizard-progress flex min-h-[3.625rem] flex-wrap items-center gap-x-3 gap-y-2 border-b border-divider py-4 sm:gap-x-6 justify-center"
      role="list"
      aria-label="Progreso de la cotización"
    >
      @for (label of labels; track label; let index = $index) {
        <li
          [attr.aria-current]="step() === index + 1 ? 'step' : null"
          class="flex items-center gap-1.5 text-sm text-muted sm:gap-2"
          [class.font-bold]="step() === index + 1"
          [class.text-ink]="step() === index + 1"
        >
          <span
            class="inline-grid size-[1.375rem] place-items-center rounded-full border border-control text-xs font-bold"
            [class]="
              step() === index + 1
                ? 'border-action bg-action text-white'
                : step() > index + 1
                  ? 'border-link bg-link text-white'
                  : ''
            "
            aria-hidden="true"
            >{{ step() > index + 1 ? '✓' : index + 1 }}</span
          >
          {{ label }}
          @if (step() > index + 1) {
            <span class="sr-only"> (completado)</span>
          }
        </li>
      }
    </ol>
  `,
})
export class WizardProgress {
  readonly step = input.required<number>();
  protected readonly labels = ['Datos', 'Plan', 'Resumen'];
}
