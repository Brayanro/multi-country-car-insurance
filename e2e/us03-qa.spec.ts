import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

type CountryCase = {
  country: "co" | "cl";
  viewport: { width: number; height: number };
  vehicleLabel: string;
  currency: "COP" | "CLP";
  expectedPrice: string;
  terms: RegExp;
};

const cases: CountryCase[] = [
  {
    country: "co",
    viewport: { width: 1280, height: 900 },
    vehicleLabel: "Placa",
    currency: "COP",
    expectedPrice: "129.900,50",
    terms: /del vehículo está sujeta/,
  },
  {
    country: "cl",
    viewport: { width: 320, height: 844 },
    vehicleLabel: "Patente",
    currency: "CLP",
    expectedPrice: "24.900",
    terms: /patente/,
  },
];

async function completeDetails(
  page: import("@playwright/test").Page,
  country: CountryCase["country"],
) {
  await page.goto("/" + country + "/quote/details");
  await expect(
    page.getByRole("heading", { name: "Datos para cotizar" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nombre del titular")).toBeVisible();
  await expect(
    page.getByText("Usa datos ficticios del titular y del vehículo."),
  ).toHaveCount(0);
  await expect(
    page.getByText("Usa un número ficticio.", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Nombre del titular").fill("QA Persona " + country);
  if (country === "co") {
    await page
      .getByLabel("Tipo de documento")
      .selectOption({ label: "Cédula de ciudadanía" });
    await page.getByLabel("Placa").fill("QA-CO-03");
  } else {
    await page.getByLabel("Patente").fill("QA-CL-03");
  }
  await page
    .getByLabel(country === "co" ? "Número de documento" : "RUT")
    .fill("FICTITIOUS-ID-9031");
  await page.getByLabel("Fecha de nacimiento").fill("1990-02-10");
  await page.getByLabel("Año del vehículo").fill("2021");
  await page.getByLabel("Marca").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(new RegExp("/" + country + "/quote/plans$"));
}

for (const scenario of cases) {
  test(
    "T-US03-01/02/03/04/05/06/07/09/10/11: " +
      scenario.country.toUpperCase() +
      " quote rejection, retry and receipt",
    async ({ page }) => {
      await page.setViewportSize(scenario.viewport);
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      let termsReads = 0;
      let changedTerms: Record<string, unknown> | null = null;
      await page.route(
        "**/api/quote-content/v1/" + scenario.country + "/terms",
        async (route) => {
          termsReads += 1;
          if (scenario.country === "co" && termsReads === 1) {
            await route.fulfill({
              status: 503,
              json: { error: { code: "CONTENT_UNAVAILABLE" } },
            });
            return;
          }
          const response = await route.fetch();
          if (termsReads === 3) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
          if (scenario.country === "cl" && termsReads >= 2) {
            if (changedTerms) {
              await route.fulfill({ response, json: changedTerms });
              return;
            }
            const body = await response.json();
            const updatedText =
              body.text + "\n\nCláusula actualizada para la prueba.";
            const revision = createHash("sha256")
              .update(
                JSON.stringify([1, scenario.country, updatedText]),
                "utf8",
              )
              .digest("hex");
            changedTerms = { ...body, revision, text: updatedText };
            await route.fulfill({
              response,
              json: changedTerms,
            });
            return;
          }
          await route.fulfill({ response });
        },
      );

      await completeDetails(page, scenario.country);
      const plan = page.getByRole("radio", { name: "Esencial", exact: true });
      await expect(plan).toBeVisible();
      await plan.focus();
      await page.keyboard.press("Space");
      await expect(plan).toBeChecked();
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(
        new RegExp("/" + scenario.country + "/quote/summary$"),
      );

      await expect(
        page.getByRole("heading", { name: "Revisa tu cotización" }),
      ).toBeFocused();
      await expect(
        page.getByText("QA Persona " + scenario.country),
      ).toBeVisible();
      await expect(page.getByText(/Colombia|Chile/)).toHaveCount(0);
      await expect(page.getByLabel(scenario.vehicleLabel)).toHaveCount(0);
      await expect(page.getByRole("radio", { name: "Aprobado" })).toBeChecked();
      await expect(
        page.getByRole("group", { name: "Resultado de prueba" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Pagar" })).toBeVisible();
      await expect(
        page.getByText("Resultado del pago (solo demostración)", {
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        page.getByText("No se realizará un cobro real.", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Simular pago" }),
      ).toHaveCount(0);
      if (scenario.country === "cl") {
        await expect(page.getByText(scenario.terms)).toBeVisible();
      }
      await expect(
        page.getByRole("heading", { name: "Esencial" }),
      ).toBeVisible();
      await expect(
        page.getByText(
          new RegExp(scenario.currency + ".*" + scenario.expectedPrice),
        ),
      ).toBeVisible();
      await expect(
        page.getByText("FICTITIOUS-ID-9031", { exact: true }),
      ).toHaveCount(0);
      const maskedDocument = page.locator("dd").filter({ hasText: /9031/ });
      await expect(maskedDocument).toHaveCount(1);
      await expect(maskedDocument).toContainText(/^[•-]+9031$/);

      if (scenario.country === "co") {
        await expect(page.getByRole("alert")).toContainText(
          "No pudimos cargar los términos",
        );
        const unavailablePay = page.getByRole("button", {
          name: "Pagar",
        });
        await expect(unavailablePay).toHaveAttribute("aria-disabled", "true");
        await page.getByRole("button", { name: "Reintentar carga" }).click();
      }
      await expect(page.getByText(scenario.terms)).toBeVisible();

      const consent = page.getByRole("checkbox", {
        name: "Acepto los términos y condiciones",
      });
      await consent.focus();
      await page.keyboard.press("Space");
      await expect(consent).toBeChecked();

      if (scenario.country === "cl") {
        const rejectedFirst = page.getByRole("radio", { name: "Rechazado" });
        await rejectedFirst.focus();
        await page.keyboard.press("Space");
        const payFirst = page.getByRole("button", { name: "Pagar" });
        await payFirst.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("alert")).toContainText(
          "Los términos cambiaron",
        );
        await expect(consent).not.toBeChecked();
        await expect(
          page.getByText("Cláusula actualizada para la prueba."),
        ).toBeVisible();
        await expect(payFirst).toHaveAttribute("aria-disabled", "true");
        await consent.focus();
        await page.keyboard.press("Space");
        await expect(consent).toBeChecked();
      }

      const rejected = page.getByRole("radio", { name: "Rechazado" });
      await rejected.focus();
      await page.keyboard.press("Space");
      const pay = page.getByRole("button", { name: "Pagar" });
      const termsReadsBeforeRejection = termsReads;
      const paymentStatus = page
        .locator('p[role="status"].sr-only')
        .filter({ hasText: /Comprobando|Procesando/ });
      await pay.focus();
      await page.keyboard.press("Enter");
      await expect(pay).toHaveAttribute("aria-disabled", "true");
      await expect(paymentStatus).toHaveText("Comprobando los términos…");
      await page.keyboard.press("Enter");
      await expect(paymentStatus).toHaveText("Procesando el pago…");
      await expect(page.getByRole("alert")).toContainText("Pago rechazado");
      expect(termsReads).toBe(termsReadsBeforeRejection + 1);
      await expect(
        page.getByText("QA Persona " + scenario.country),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Esencial" }),
      ).toBeVisible();
      await expect(page.getByText(scenario.terms)).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(scenario.viewport.width);

      await page.getByRole("link", { name: "Editar datos" }).click();
      await expect(page).toHaveURL(
        new RegExp("/" + scenario.country + "/quote/details$"),
      );
      await expect(page.getByLabel("Nombre del titular")).toHaveValue(
        "QA Persona " + scenario.country,
      );
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(
        new RegExp("/" + scenario.country + "/quote/plans$"),
      );
      await expect(plan).toBeChecked();
      await page.getByRole("button", { name: "Continuar" }).click();
      await expect(page).toHaveURL(
        new RegExp("/" + scenario.country + "/quote/summary$"),
      );
      await expect(page.getByText(scenario.terms)).toBeVisible();
      const retryConsent = page.getByRole("checkbox", {
        name: "Acepto los términos y condiciones",
      });
      await retryConsent.focus();
      await page.keyboard.press("Space");
      await expect(retryConsent).toBeChecked();

      const approved = page.getByRole("radio", { name: "Aprobado" });
      await approved.focus();
      await page.keyboard.press("Space");
      await expect(approved).toBeChecked();
      await pay.focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("heading", { name: "Pago aprobado" }),
      ).toBeVisible();
      await expect(page.getByText(/Colombia|Chile/)).toHaveCount(0);
      await expect(
        page.getByText("No se realizó un cobro.", { exact: true }),
      ).toHaveCount(0);
      const receipt = page.getByText(/^DEMO-[A-F0-9]{24}$/);
      await expect(receipt).toBeVisible();
      const quoteNumber = await receipt.textContent();
      expect(quoteNumber).toMatch(/^DEMO-[A-F0-9]{24}$/);
      await expect(page.getByRole("button", { name: "Pagar" })).toHaveCount(0);
      expect(pageErrors).toEqual([]);

      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Pago aprobado" }),
      ).toBeFocused();
      await expect(page.getByText(quoteNumber!, { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Pagar" })).toHaveCount(0);
    },
  );
}

test("T-US03-03/09/11: published terms reads are country-scoped and read-only", async ({
  request,
}) => {
  const bodies: string[] = [];
  for (const country of ["co", "cl"] as const) {
    const response = await request.get(
      "/api/quote-content/v1/" + country + "/terms",
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const terms = (await response.json()) as {
      schemaVersion: number;
      country: string;
      revision: string;
      text: string;
    };
    expect(terms.schemaVersion).toBe(1);
    expect(terms.country).toBe(country);
    expect(terms.text.trim().length).toBeGreaterThan(0);
    expect(terms.revision).toBe(
      createHash("sha256")
        .update(JSON.stringify([1, country, terms.text]), "utf8")
        .digest("hex"),
    );
    bodies.push(terms.text);
  }
  expect(bodies[0]).not.toBe(bodies[1]);
  expect(
    (await request.get("/api/quote-content/v1/co/terms?status=draft")).status(),
  ).toBe(400);
  expect((await request.post("/api/quote-content/v1/co/terms")).status()).toBe(
    405,
  );
  const cmsUrl = process.env["QUOTE_CMS_URL"] ?? "http://127.0.0.1:1337";
  expect(
    (await request.get(new URL("/api/terms", cmsUrl).toString())).status(),
  ).toBe(404);
});

test("T-US03-08: direct summary routes require current same-country prerequisites", async ({
  page,
}) => {
  for (const country of ["co", "cl"] as const) {
    await page.goto("/" + country + "/quote/summary");
    await expect(page).toHaveURL(new RegExp("/" + country + "/quote/details$"));
    await expect(
      page.getByRole("heading", { name: "Datos para cotizar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Revisa tu cotización" }),
    ).toHaveCount(0);
  }
});

test("T-US03-07: a reload interrupts an active terms check and restores editable quote state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  let termsReads = 0;
  let announceCheckStarted!: () => void;
  let releaseCheck!: () => void;
  const checkStarted = new Promise<void>((resolve) => {
    announceCheckStarted = resolve;
  });
  const delayedResponse = new Promise<void>((resolve) => {
    releaseCheck = resolve;
  });
  await page.route("**/api/quote-content/v1/co/terms", async (route) => {
    termsReads += 1;
    if (termsReads === 2) {
      announceCheckStarted();
      await delayedResponse;
    }
    await route.continue();
  });
  await completeDetails(page, "co");
  const plan = page.getByRole("radio", { name: "Esencial", exact: true });
  await plan.check();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByRole("heading", { name: "Revisa tu cotización" }),
  ).toBeFocused();
  await expect(page.getByText(/del vehículo está sujeta/)).toBeVisible();
  const consent = page.getByRole("checkbox", {
    name: "Acepto los términos y condiciones",
  });
  await consent.check();
  const pay = page.getByRole("button", { name: "Pagar" });
  await pay.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator('p[role="status"].sr-only').filter({
      hasText: /Comprobando/,
    }),
  ).toHaveText("Comprobando los términos…");
  await checkStarted;

  const reload = page.reload();
  releaseCheck();
  await reload;
  await expect(
    page.getByRole("heading", { name: "Revisa tu cotización" }),
  ).toBeFocused();
  await expect(page.getByText("QA Persona co")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Esencial" })).toBeVisible();
  await expect(consent).not.toBeChecked();
  await expect(pay).toHaveAttribute("aria-disabled", "true");
  expect(termsReads).toBeGreaterThanOrEqual(3);
  await expect(
    page.getByRole("heading", { name: "Pago aprobado" }),
  ).toHaveCount(0);
});
