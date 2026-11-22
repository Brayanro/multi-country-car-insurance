import { Routes } from '@angular/router';
import { CountryPicker } from './country-selection/country-picker';
import { QuotePage } from './quote/quote-page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: CountryPicker,
    title: 'Elige un país · Seguro de auto',
  },
  { path: ':country/quote/:step', component: QuotePage, title: 'Cotización · Seguro de auto' },
  {
    path: '**',
    component: CountryPicker,
    data: { unsupported: true },
    title: 'País no disponible · Seguro de auto',
  },
];
