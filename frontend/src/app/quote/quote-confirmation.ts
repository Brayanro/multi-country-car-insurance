import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { displayPrice } from './price-format';
import type { Receipt } from './quote-receipt';

@Component({
  selector: 'app-quote-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quote-confirmation.html',
})
export class QuoteConfirmation {
  readonly receipt = input.required<Receipt>();
  readonly restartFailed = input(false);
  readonly restart = output<void>();
  protected readonly displayPrice = displayPrice;
}
