import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../app.routes';
import { QuoteState } from './quote-state';

const countryField = (country: 'co' | 'cl') => ({
  id: 'identity-document',
  kind: 'text',
  purpose: 'identityDocument',
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
    'identity-document': { kind: 'text', value: 'fictitious' },
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

  it.each(['co', 'cl'] as const)(
    'T-US03-M02/M05 keeps an invalid %s snapshot away from its legacy draft',
    async (country) => {
      const key = `quote-draft-v1:${country}`;
      const draft = {
        'identity-document': { kind: 'text', value: 'FICTICIO-0001' },
        secondary: { kind: 'text', value: 'FICTICIO-0002' },
        birth: { kind: 'date', value: '1990-02-10' },
        year: { kind: 'number', value: new Date().getFullYear() },
        make: { kind: 'select', value: 'demo' },
        consent: { kind: 'checkbox', value: true },
      };
      const stored = JSON.stringify({ version: 1, country, draft });
      sessionStorage.setItem(key, stored);
      const { harness, backend } = await initialScreen();
      const uri = `/api/quote-content/v1/${country}/form`;
      if (country === 'cl') {
        const cancelled = backend.expectOne('/api/quote-content/v1/co/form');
        await harness.navigateByUrl('/cl/quote/details');
        expect(cancelled.cancelled).toBe(true);
      }
      const form = configuration(country);
      backend.expectOne(uri).flush({
        ...form,
        fields: form.fields.map((field) =>
          field.id === 'identity-document' ? { ...field, purpose: undefined } : field,
        ),
      });
      await harness.fixture.whenStable();
      harness.detectChanges();
      const screen = harness.routeNativeElement!;
      expect(screen.textContent).toContain('Formulario no disponible');
      expect(screen.querySelector('form')).toBeNull();
      expect(sessionStorage.getItem(key)).toBe(stored);

      screen.querySelector('button')!.click();
      backend.expectOne(uri).flush({
        ...form,
        fields: [
          ...form.fields,
          { ...sharedField, id: 'secondary', kind: 'text', order: 40, label: 'Otro', rules: [] },
          {
            ...sharedField,
            id: 'make',
            kind: 'select',
            order: 50,
            label: 'Marca',
            rules: [],
            options: [{ id: 'demo', label: 'Demo' }],
          },
          {
            ...sharedField,
            id: 'consent',
            kind: 'checkbox',
            order: 60,
            label: 'Permiso',
            rules: [],
          },
        ],
      });
      await harness.fixture.whenStable();
      harness.detectChanges();
      expect(JSON.parse(sessionStorage.getItem(key)!)).toEqual({
        version: 2,
        country,
        draft: {
          ...draft,
          secondary: { kind: 'text', value: null },
          birth: { kind: 'date', value: null },
        },
      });
    },
  );

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
      validation: { invalidFields: ['identity-document', 'birth', 'year'] },
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
    backend
      .expectOne('/api/quote-content/v1/co/terms')
      .flush({ schemaVersion: 1, country: 'co', revision: 'a'.repeat(64), text: 'Condiciones.' });
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

describe('US-03 Summary', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.clear();
  });

  const termsUri = '/api/quote-content/v1/co/terms';
  const termsResponse = (revision = 'a', text = 'Condiciones del plan.') => ({
    schemaVersion: 1,
    country: 'co',
    revision: revision.repeat(64),
    text,
  });

  async function review() {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    storeValidDetails();
    sessionStorage.setItem(
      'quote-plan-v1:co',
      JSON.stringify({
        version: 1,
        country: 'co',
        id: 'plan-a',
        price: { amountMinor: 10000, currency: 'COP' },
      }),
    );
    const harness = await RouterTestingHarness.create('/co/quote/summary');
    const backend = TestBed.inject(HttpTestingController);
    const form = configuration('co');
    backend.expectOne('/api/quote-content/v1/co/form').flush(form);
    await harness.fixture.whenStable();
    backend.expectOne('/api/quote-content/v1/co/plans').flush(catalog(10000));
    await harness.fixture.whenStable();
    backend.expectOne(termsUri).flush(termsResponse());
    const update = () => harness.detectChanges();
    update();
    const screen = harness.routeNativeElement!;
    const consent = () => screen.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    const pay = () =>
      [...screen.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Pagar'),
      )!;
    const choose = (outcome: 'approved' | 'rejected') => {
      screen.querySelector<HTMLInputElement>(`input[value="${outcome}"]`)!.click();
      update();
    };
    const accept = () => {
      consent().click();
      update();
    };
    return { harness, backend, screen, consent, accept, pay, choose, update };
  }

  it('T-US03-01/02/03 shows review, masks identity and gates Pay on country terms consent', async () => {
    const { screen, pay, accept } = await review();
    expect(screen.textContent).toContain('Plan A');
    expect(screen.textContent).toContain('ious');
    expect(screen.textContent).not.toContain('fictitious');
    expect(screen.textContent).toContain('Condiciones del plan.');
    expect(screen.querySelector('fieldset legend')?.textContent).toContain('Resultado de prueba');
    expect(screen.textContent).not.toContain('No se realizará un cobro real.');
    expect(pay().getAttribute('aria-disabled')).toBe('true');
    accept();
    expect(pay().getAttribute('aria-disabled')).not.toBe('true');
  });

  it('T-US03-03 invalidates consent when an underlying identity value changes', async () => {
    const { screen, pay, accept, update } = await review();
    accept();
    const state = TestBed.inject(QuoteState);
    const draft = state.draft('co');
    state.save('co', {
      ...draft,
      'identity-document': { kind: 'text', value: '123456ious' },
    });
    update();
    expect(screen.textContent).toContain('••••••ious');
    expect(pay().getAttribute('aria-disabled')).toBe('true');
  });

  it('T-US03-03/11 invalidates changed consent and recovers a failed pre-Pay read without paying', async () => {
    const { backend, screen, pay, consent, accept, update } = await review();
    accept();
    pay().click();
    const refresh = backend.expectOne(termsUri);
    pay().click();
    backend.expectNone(termsUri);
    refresh.flush(termsResponse('b', 'Términos actualizados.'));
    update();
    expect(screen.textContent).toContain('Los términos cambiaron');
    expect(screen.textContent).toContain('Términos actualizados.');
    expect(consent().checked).toBe(false);
    expect(pay().getAttribute('aria-disabled')).toBe('true');

    accept();
    pay().click();
    backend.expectOne(termsUri).flush(termsResponse('b', 'Texto inconsistente.'));
    update();
    expect(screen.textContent).toContain('No pudimos cargar los términos.');
    expect(screen.textContent).not.toContain('Texto inconsistente.');
    expect(pay().getAttribute('aria-disabled')).toBe('true');
    screen.querySelector<HTMLButtonElement>('#terms-retry')!.click();
    backend.expectOne(termsUri).flush(termsResponse('b', 'Términos actualizados.'));
    update();
    expect(consent().checked).toBe(true);
    expect(screen.textContent).not.toContain('Procesando');
    expect(screen.querySelector('#receipt-heading')).toBeNull();
    expect(screen.textContent).toContain('Plan A');
  });

  it('T-US03-05/06 rejects, retries and locks the completed receipt', async () => {
    const { harness, backend, screen, pay, consent, accept, choose, update } = await review();
    expect(screen.querySelector<HTMLInputElement>('input[value="approved"]')?.checked).toBe(true);
    accept();
    choose('rejected');
    pay().click();
    backend.expectOne(termsUri).flush(termsResponse());
    update();
    expect(pay().getAttribute('aria-disabled')).toBe('true');
    pay().click();
    backend.expectNone(termsUri);
    await vi.waitFor(() => {
      update();
      expect(screen.textContent).toContain('Pago rechazado.');
    });
    expect(consent().checked).toBe(true);
    expect(screen.textContent).toContain('Plan A');
    choose('approved');
    pay().click();
    backend.expectOne(termsUri).flush(termsResponse());
    await vi.waitFor(() => {
      update();
      expect(screen.querySelector('#receipt-heading')?.textContent).toContain('Pago aprobado');
    });
    const number = screen.querySelector('dd')?.textContent?.trim();
    expect(number).toMatch(/^DEMO-[A-F0-9]{24}$/);
    expect(JSON.parse(sessionStorage.getItem('quote-receipt-v1:co')!)).toMatchObject({
      number,
      version: 3,
      review: {
        planName: 'Plan A',
        rows: [
          { id: 'identity-document', kind: 'masked-identity', value: '••••••ious' },
          expect.anything(),
          expect.anything(),
        ],
      },
    });
    expect(screen.textContent).toContain('Plan A');
    expect(screen.textContent).not.toContain('fictitious');
    expect(pay()).toBeUndefined();

    await harness.navigateByUrl('/co/quote/details');
    await harness.fixture.whenStable();
    update();
    expect(TestBed.inject(Router).url).toBe('/co/quote/summary');
    expect(screen.querySelector('app-details-form')).toBeNull();
    backend.expectNone('/api/quote-content/v1/co/form');
    backend.expectNone(termsUri);
    expect(screen.querySelector('dd')?.textContent?.trim()).toBe(number);
  });

  it('T-US03-08 cancels a Pay refresh on navigation and restores only same-country completed receipts', async () => {
    const { harness, backend, accept, pay } = await review();
    accept();
    pay().click();
    const refresh = backend.expectOne(termsUri);
    await harness.navigateByUrl('/co/quote/details');
    expect(refresh.cancelled).toBe(true);
    expect(sessionStorage.getItem('quote-receipt-v1:co')).toBeNull();

    const number = 'DEMO-' + 'A'.repeat(24);
    sessionStorage.setItem(
      'quote-receipt-v1:cl',
      JSON.stringify({ version: 1, country: 'cl', number }),
    );
    await harness.navigateByUrl('/cl/quote/plans');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/cl/quote/summary');
    backend.expectNone('/api/quote-content/v1/cl/form');
    backend.expectNone('/api/quote-content/v1/cl/plans');
    backend.expectNone('/api/quote-content/v1/cl/terms');
    expect(harness.routeNativeElement?.querySelector('dd')?.textContent?.trim()).toBe(number);
  });

  it.each([
    ['removeItem', 'quote-draft-v1:co'],
    ['getItem', 'quote-draft-v1:co'],
    ['removeItem', 'quote-plan-v1:co'],
    ['getItem', 'quote-plan-v1:co'],
    ['removeItem', 'quote-receipt-v1:co'],
  ] as const)('AC-US03-R03 keeps the lock when %s fails for %s', async (method, failingKey) => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    storeValidDetails();
    const number = 'DEMO-' + 'C'.repeat(24);
    const receipt = JSON.stringify({ version: 1, country: 'co', number });
    sessionStorage.setItem('quote-receipt-v1:co', receipt);
    sessionStorage.setItem(
      'quote-plan-v1:co',
      JSON.stringify({
        version: 1,
        country: 'co',
        id: 'plan-a',
        price: { amountMinor: 10000, currency: 'COP' },
      }),
    );
    sessionStorage.setItem('quote-plan-v1:cl', 'other plan');
    sessionStorage.setItem('quote-draft-v1:cl', 'other draft');
    sessionStorage.setItem(
      'quote-receipt-v1:cl',
      JSON.stringify({ version: 1, country: 'cl', number }),
    );
    const harness = await RouterTestingHarness.create('/co/quote/summary');
    const backend = TestBed.inject(HttpTestingController);
    const screen = harness.routeNativeElement!;
    const restart = () => screen.querySelector<HTMLButtonElement>('app-quote-confirmation button')!;
    expect(screen.textContent).toContain('El detalle de esta cotización no está disponible.');
    const original = Storage.prototype[method];
    const storage = vi.spyOn(Storage.prototype, method).mockImplementation(function (
      this: Storage,
      key,
    ) {
      if (key === failingKey) throw new Error('Storage unavailable');
      return Reflect.apply(original, this, [key]) as never;
    });
    try {
      restart().focus();
      restart().click();
      harness.detectChanges();
      expect(screen.querySelector('[role="alert"]')?.textContent).toContain('No pudimos iniciar');
      expect(document.activeElement).toBe(restart());
      expect(screen.querySelector('dd')?.textContent?.trim()).toBe(number);
      backend.expectNone('/api/quote-content/v1/co/form');
    } finally {
      storage.mockRestore();
    }
    expect(sessionStorage.getItem('quote-receipt-v1:co')).toBe(receipt);
    await harness.navigateByUrl('/co/quote/plans');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/co/quote/summary');
    expect(screen.querySelector('dd')?.textContent?.trim()).toBe(number);

    restart().click();
    await harness.fixture.whenStable();
    backend.expectOne('/api/quote-content/v1/co/form').flush(configuration('co'));
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/co/quote/details');
    expect(screen.querySelector<HTMLInputElement>('#quote-field-identity-document')?.value).toBe(
      '',
    );
    expect(sessionStorage.getItem('quote-receipt-v1:co')).toBeNull();
    expect(sessionStorage.getItem('quote-plan-v1:co')).toBeNull();
    expect(sessionStorage.getItem('quote-plan-v1:cl')).toBe('other plan');
    expect(sessionStorage.getItem('quote-draft-v1:cl')).toBe('other draft');
    expect(JSON.parse(sessionStorage.getItem('quote-receipt-v1:cl')!).country).toBe('cl');
  });

  it('AC-US03-R02 shows the full memory-only confirmation when saving the receipt fails', async () => {
    const { backend, screen, pay, accept, update } = await review();
    const original = Storage.prototype.setItem;
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === 'quote-receipt-v1:co') throw new Error('Quota exceeded');
      original.call(this, key, value);
    });
    try {
      accept();
      pay().click();
      backend.expectOne(termsUri).flush(termsResponse());
      await vi.waitFor(() => {
        update();
        expect(screen.textContent).toContain('Si recargas la página');
      });
      expect(screen.textContent).toContain('Plan A');
      expect(screen.textContent).toContain('••••••ious');
      expect(sessionStorage.getItem('quote-receipt-v1:co')).toBeNull();
    } finally {
      storage.mockRestore();
    }
  });
});
