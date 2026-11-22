import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '../app.routes';
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

const catalog = (amountMinor: number) => ({
  schemaVersion: 1,
  country: 'co',
  plans: [
    {
      id: 'plan-a',
      name: 'Plan A',
      shortDescription: 'Descripción',
      basePrice: { amountMinor, currency: 'COP' },
      order: 1,
      recommended: true,
      coverages: [],
      benefits: [],
    },
  ],
});

function storeValidDetails() {
  TestBed.inject(QuoteState).save('co', {
    identity: { kind: 'text', value: 'fictitious' },
    birth: { kind: 'date', value: '1990-02-10' },
    year: { kind: 'number', value: new Date().getFullYear() },
  });
}

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

  it('T-US02-04 requires an explicit choice and rejects a repriced plan before Summary', async () => {
    const { harness, backend } = await initialScreen();
    storeValidDetails();
    backend.expectOne('/api/quote-content/v1/co/form').flush(configuration('co'));
    await harness.navigateByUrl('/co/quote/plans');
    const endpoint = '/api/quote-content/v1/co/plans';
    backend.expectOne(endpoint).flush(catalog(10000));
    await harness.fixture.whenStable();
    harness.detectChanges();
    const screen = harness.routeNativeElement!;
    const choice = screen.querySelector<HTMLInputElement>('input[type="radio"]')!;
    const next = screen.querySelector<HTMLButtonElement>('button')!;
    expect(choice.checked).toBe(false);
    expect(next.disabled).toBe(true);

    choice.click();
    harness.detectChanges();
    expect(next.disabled).toBe(false);
    next.click();
    await harness.fixture.whenStable();
    backend.expectOne(endpoint).flush(catalog(20000));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(screen.querySelector<HTMLInputElement>('input[type="radio"]')?.checked).toBe(false);
    expect(screen.textContent).toContain('Tu plan cambió');
    expect(screen.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true);

    screen.querySelector<HTMLInputElement>('input[type="radio"]')?.click();
    harness.detectChanges();
    screen.querySelector<HTMLButtonElement>('button')?.click();
    await harness.fixture.whenStable();
    backend.expectOne(endpoint).flush(catalog(20000));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(screen.querySelector('[aria-current="step"]')?.textContent).toContain('Resumen');
  });

  it('T-US02-04/06 gates direct Summary entry and reuses a failed read in Plans recovery', async () => {
    const { harness, backend } = await initialScreen();
    const router = TestBed.inject(Router);
    const endpoint = '/api/quote-content/v1/co/plans';
    backend.expectOne('/api/quote-content/v1/co/form').flush(configuration('co'));

    await harness.navigateByUrl('/co/quote/summary');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/co/quote/details');
    backend.expectNone(endpoint);

    storeValidDetails();
    await harness.navigateByUrl('/co/quote/summary');
    await harness.fixture.whenStable();
    expect(router.url).toBe('/co/quote/plans');
    backend.expectOne(endpoint).flush(catalog(10000));
    await harness.fixture.whenStable();
    harness.detectChanges();
    harness.routeNativeElement?.querySelector<HTMLInputElement>('input[type="radio"]')?.click();
    await harness.navigateByUrl('/co/quote/details');

    await harness.navigateByUrl('/co/quote/summary');
    backend.expectOne(endpoint).flush(
      { error: { code: 'PLANS_UNAVAILABLE' } },
      {
        status: 503,
        statusText: 'Service Unavailable',
      },
    );
    await harness.fixture.whenStable();
    expect(router.url).toBe('/co/quote/plans');
    backend.expectNone(endpoint);
    harness.detectChanges();
    const retry = harness.routeNativeElement?.querySelector('button');
    expect(retry?.textContent).toContain('Reintentar');
    retry?.click();
    backend.expectOne(endpoint).flush(catalog(10000));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(
      harness.routeNativeElement?.querySelector<HTMLInputElement>('input[type="radio"]')?.checked,
    ).toBe(true);
  });
});
