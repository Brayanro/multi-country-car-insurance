import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from './app.routes';
import { QuoteState } from './quote-state';

const countryField = (country: 'co' | 'cl') => ({
  id: 'identity',
  kind: 'text',
  order: 10,
  label: country === 'co' ? 'Número de documento' : 'RUT',
  required: true,
  helpText: 'Ejemplo ficticio',
  errorMessage: 'Completa el documento',
  rules: [],
});
const sharedField = { required: true, helpText: '', errorMessage: 'Completa el campo' };
const configuration = (country: 'co' | 'cl') => ({
  schemaVersion: 1,
  country,
  fields: [
    {
      ...sharedField,
      id: 'birth',
      purpose: 'dateOfBirth',
      kind: 'date',
      order: 20,
      label: 'Nacimiento',
      rules: [{ operator: 'minimumAge', argument: 18, message: 'Edad mínima' }],
    },
    countryField(country),
    {
      ...sharedField,
      id: 'year',
      purpose: 'vehicleYear',
      kind: 'number',
      order: 30,
      label: 'Año',
      rules: [{ operator: 'vehicleYearRange', message: 'Año inválido' }],
    },
  ],
});

describe('US-01 wizard form', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  async function initialScreen() {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    const harness = await RouterTestingHarness.create('/co/quote/details');
    const backend = TestBed.inject(HttpTestingController);
    return { harness, backend };
  }

  it('T-US01-01/03 renders published field order and blocks an invalid submit with configured errors', async () => {
    const { harness, backend } = await initialScreen();
    backend.expectOne('/api/quote-content/v1/co/form').flush(configuration('co'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const screen = harness.routeNativeElement!;
    const form = screen.querySelector('form')!;
    expect(Array.from(form.querySelectorAll('input')).map((input) => input.type)).toEqual([
      'text',
      'date',
      'number',
    ]);
    expect(screen.textContent).toContain('Número de documento');
    expect(screen.textContent).not.toContain('Completa el documento');
    expect(TestBed.inject(QuoteState).state()).toMatchObject({
      phase: 'ready',
      validation: { invalidFields: ['identity', 'birth', 'year'] },
    });
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(screen.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(screen.textContent).toContain('Completa el documento');
    expect(document.activeElement).toBe(screen.querySelector('input'));
  });

  it('T-US01-08/13 refreshes country transitions and cancels an earlier in-flight read', async () => {
    const { harness, backend } = await initialScreen();
    const earlier = backend.expectOne('/api/quote-content/v1/co/form');
    await harness.navigateByUrl('/cl/quote/details');
    expect(earlier.cancelled).toBe(true);
    backend.expectOne('/api/quote-content/v1/cl/form').flush(configuration('co'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const screen = harness.routeNativeElement!;
    expect(screen.textContent).toContain('Formulario no disponible');
    expect(screen.querySelector('form')).toBeNull();
    screen.querySelector('button')?.click();
    backend.expectOne('/api/quote-content/v1/cl/form').flush(configuration('cl'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(screen.textContent).toContain('RUT');
    expect(screen.textContent).not.toContain('Número de documento');
  });
});
