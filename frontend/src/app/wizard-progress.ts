import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-wizard-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="wizard-progress" role="list" aria-label="Progreso de la cotización">
      @for (label of labels; track label; let index = $index) {
        <li
          [attr.aria-current]="step() === index + 1 ? 'step' : null"
          [class.current]="step() === index + 1"
          [class.completed]="step() > index + 1"
        >
          <span class="step-number" aria-hidden="true">{{
            step() > index + 1 ? '✓' : index + 1
          }}</span>
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
