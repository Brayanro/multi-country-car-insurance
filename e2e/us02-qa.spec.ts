import { expect, test } from "@playwright/test";

async function completeDetails(
  page: import("@playwright/test").Page,
  country: "co" | "cl",
) {
  await page.goto(`/${country}/quote/details`);
  await page.getByLabel("Nombre del titular").fill("Conductor de prueba");
  if (country === "co") {
    await page
      .getByLabel("Tipo de documento")
      .selectOption({ label: "Cédula de ciudadanía" });
    await page.getByLabel("Placa").fill("QA-CO-02");
  } else {
    await page.getByLabel("Patente").fill("QA-CL-02");
  }
  await page
    .getByLabel(country === "co" ? "Número de documento" : "RUT")
    .fill("FICTITIOUS-ID");
  await page.getByLabel("Fecha de nacimiento").fill("1990-02-10");
  await page.getByLabel("Año del vehículo").fill("2021");
  await page.getByLabel("Marca").selectOption({ label: "Ejemplo Motor" });
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(new RegExp(`/${country}/quote/plans$`));
}

test("T-US02-01/02/03: public catalogs are country-scoped, ordered, and no-store", async ({
  request,
}) => {
  for (const [country, currency] of [
    ["co", "COP"],
    ["cl", "CLP"],
  ] as const) {
    const response = await request.get(
      `/api/quote-content/v1/${country}/plans`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const catalog = (await response.json()) as {
      schemaVersion: number;
      country: string;
      plans: Array<{
        id: string;
        name: string;
        order: number;
        basePrice: { amountMinor: number; currency: string };
        benefits: string[];
      }>;
    };
    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.country).toBe(country);
    expect(catalog.plans.map(({ name }) => name)).toEqual([
      "Esencial",
      "Ruta",
      "Integral",
    ]);
    expect(catalog.plans.map(({ order }) => order)).toEqual(
      [...catalog.plans.map(({ order }) => order)].sort((a, b) => a - b),
    );
    expect(
      catalog.plans.every(({ basePrice }) => basePrice.currency === currency),
    ).toBe(true);
    expect(catalog.plans.every(({ id }) => /^[a-z0-9]+$/.test(id))).toBe(true);
    expect(catalog.plans.map(({ benefits }) => benefits.length)).toEqual([
      3, 4, 5,
    ]);
    expect(
      catalog.plans.every((plan) =>
        plan.benefits.includes("Asistencia en carretera"),
      ),
    ).toBe(true);
  }

  expect(
    (await request.get("/api/quote-content/v1/co/plans?status=draft")).status(),
  ).toBe(400);
  expect((await request.get("/api/quote-content/v1/zz/plans")).status()).toBe(
    404,
  );
  expect((await request.post("/api/quote-content/v1/co/plans")).status()).toBe(
    405,
  );
  expect((await request.get("/api/plans")).status()).toBe(404);
});

test("T-US02-02/03/04/07: Colombia comparison keeps recommendation separate and hands off one keyboard choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await completeDetails(page, "co");
  const heading = page.getByRole("heading", { name: "Elige tu plan" });
  await expect(heading).toBeFocused();
  await expect(page.getByText("COP 129.900,50")).toBeVisible();
  await expect(page.getByText("COP 159.900,00")).toBeVisible();
  await expect(page.getByText("COP 199.900,00")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(3);
  await expect(
    page.getByRole("radio", { name: "Integral", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Responsabilidad civil").first()).toBeVisible();
  await expect(page.getByText("Asistencia en carretera").first()).toBeVisible();
  for (const benefit of [
    "Orientación telefónica tras un accidente",
    "Apoyo para coordinar una grúa",
    "Envío de grúa en caso de avería",
    "Ayuda con batería descargada",
    "Asistencia para cambiar un neumático",
    "Vehículo de reemplazo durante la reparación",
    "Traslado de ocupantes tras una avería",
  ]) {
    await expect(
      page.getByText(benefit, { exact: true }).first(),
    ).toBeVisible();
  }

  const essential = page.getByRole("radio", { name: "Esencial", exact: true });
  const route = page.getByRole("radio", { name: "Ruta", exact: true });
  await expect(essential).not.toBeChecked();
  await expect(route).not.toBeChecked();
  await expect(route).toHaveAccessibleDescription(
    /COP.*159\.900,00.*Recomendado/,
  );
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();

  await essential.focus();
  await page.keyboard.press("ArrowDown");
  await expect(route).toBeFocused();
  await expect(route).toBeChecked();
  await expect(essential).not.toBeChecked();
  const candidate = await page.evaluate(() =>
    JSON.parse(sessionStorage.getItem("quote-plan-v1:co") ?? "null"),
  );
  expect(candidate).toMatchObject({
    country: "co",
    price: { currency: "COP" },
  });

  const back = page.getByRole("link", { name: "Volver a datos" });
  const next = page.getByRole("button", { name: "Continuar" });
  await page.keyboard.press("Tab");
  await expect(back).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/co\/quote\/summary$/);
  await expect(
    page.getByRole("heading", { name: "Revisa tu cotización" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ruta", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Cambiar plan" }).click();
  await expect(page).toHaveURL(/\/co\/quote\/plans$/);
  await expect(route).toBeChecked();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Elige tu plan" }),
  ).toBeFocused();
  await expect(route).toBeChecked();

  await completeDetails(page, "cl");
  await expect(
    page.getByRole("radio", { name: "Esencial", exact: true }),
  ).not.toBeChecked();
  await expect(page.getByText("CLP 24.900")).toBeVisible();
  await expect(page.getByText("CLP 29.900")).toBeVisible();
  await expect(page.getByText("CLP 36.900")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(3);
  await expect(
    page.getByRole("radio", { name: "Integral", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/COP/)).toHaveCount(0);
  const candidates = await page.evaluate(() => ({
    co: sessionStorage.getItem("quote-plan-v1:co"),
    cl: sessionStorage.getItem("quote-plan-v1:cl"),
  }));
  expect(candidates.co).not.toBeNull();
  expect(candidates.cl).toBeNull();
});

test("T-US02-04/06/07: Chile remains isolated and reselects after a fresh price changes", async ({
  page,
}) => {
  let plansReads = 0;
  await page.route("**/api/quote-content/v1/cl/plans", async (route) => {
    plansReads += 1;
    const response = await route.fetch();
    if (plansReads === 1) return route.fulfill({ response });
    const catalog = await response.json();
    catalog.plans[0].basePrice.amountMinor += 100;
    await route.fulfill({ response, json: catalog });
  });

  await page.setViewportSize({ width: 320, height: 740 });
  await completeDetails(page, "cl");
  await expect(page.getByText("CLP 24.900")).toBeVisible();
  await expect(page.getByText("COP 24.900")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );

  const first = page.getByRole("radio", { name: "Esencial", exact: true });
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toBeChecked();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page).toHaveURL(/\/cl\/quote\/plans$/);
  await expect(
    page
      .getByRole("status")
      .getByText(/Tu plan cambió o ya no está disponible/),
  ).toBeVisible();
  await expect(first).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
  expect(plansReads).toBe(2);
});

test("T-US02-05/06: recover from an unavailable catalog and render the empty state", async ({
  page,
}) => {
  let reads = 0;
  await page.route("**/api/quote-content/v1/co/plans", async (route) => {
    reads += 1;
    if (reads === 1) {
      await route.fulfill({
        status: 503,
        json: { error: { code: "CONTENT_UNAVAILABLE" } },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { "Cache-Control": "no-store" },
      json: { schemaVersion: 1, country: "co", plans: [] },
    });
  });

  await completeDetails(page, "co");
  await expect(
    page.getByRole("heading", { name: "Planes no disponibles" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Reintentar" })).toBeVisible();
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(
    page.getByRole("heading", { name: "No hay planes disponibles" }),
  ).toBeVisible();
  await expect(
    page.getByText("Por ahora no hay planes para Colombia."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Volver a datos" }),
  ).toBeVisible();
});

test("T-US02-04/06: direct summary routes require valid details and a current explicit selection", async ({
  page,
}) => {
  await page.goto("/co/quote/summary");
  await expect(page).toHaveURL(/\/co\/quote\/details$/);
  await completeDetails(page, "co");
  await page.goto("/co/quote/summary");
  await expect(page).toHaveURL(/\/co\/quote\/plans$/);
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
});

test("T-US02-06: loading blocks progression and a late response cannot replace the Back route", async ({
  page,
}) => {
  let releaseResponse!: () => void;
  let signalRequestStarted!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    signalRequestStarted = resolve;
  });
  await page.route("**/api/quote-content/v1/co/plans", async (route) => {
    signalRequestStarted();
    await responseGate;
    try {
      await route.fulfill({
        status: 200,
        json: {
          schemaVersion: 1,
          country: "co",
          plans: [
            {
              id: "late-plan",
              name: "Late plan",
              shortDescription: "Stale response",
              basePrice: { amountMinor: 10000, currency: "COP" },
              coverages: [],
              benefits: [],
              order: 1,
              recommended: false,
            },
          ],
        },
      });
    } catch {
      // The request can be cancelled when Back leaves the plans route.
    }
  });

  await completeDetails(page, "co");
  await requestStarted;
  await expect(
    page.getByText("Cargando los planes…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toHaveCount(0);
  const backNavigation = page
    .getByRole("link", { name: "Volver a datos" })
    .click();
  releaseResponse();
  await backNavigation;
  await expect(page).toHaveURL(/\/co\/quote\/details$/);
  await expect(
    page.getByRole("heading", { name: "Datos para cotizar" }),
  ).toBeVisible();
  await expect(page.getByText("Late plan")).toHaveCount(0);
});

test("T-US02-07: forced-colors emulation preserves the native checked radio", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await completeDetails(page, "co");

  const radio = page.getByRole("radio", { name: "Esencial", exact: true });
  await expect(radio).toBeVisible();
  expect(
    await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
  ).toBe(true);
  await radio.focus();
  await page.keyboard.press("Space");
  await expect(radio).toBeChecked();

  const radioStyle = await radio.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      appearance: style.appearance,
      visibility: style.visibility,
      opacity: style.opacity,
      forcedColorAdjust: style.forcedColorAdjust,
    };
  });
  expect(radioStyle.appearance).not.toBe("none");
  expect(radioStyle.visibility).toBe("visible");
  expect(radioStyle.opacity).not.toBe("0");
  await page.screenshot({
    path: testInfo.outputPath("forced-colors.png"),
    fullPage: true,
  });
});
