import { planCurrency, type Country } from "@quote/contract";

export const PLAN_EXPANSION_KEY = "us02-expanded-plan-ids";

export const planCountries = ["co", "cl"] as const;

export function originalSeedPlans(country: Country) {
  const common = {
    country,
    currency: planCurrency[country],
    active: true,
    benefits: [{ text: "Asistencia en carretera" }],
  };
  return [
    {
      ...common,
      name: "Esencial",
      shortDescription: "Protección para tus recorridos diarios.",
      basePrice: country === "co" ? 129900.5 : 24900,
      coverages: [{ text: "Responsabilidad civil" }],
      order: 10,
      recommended: false,
    },
    {
      ...common,
      name: "Ruta",
      shortDescription: "Protección ampliada para tu vehículo.",
      basePrice: country === "co" ? 159900 : 29900,
      coverages: [{ text: "Responsabilidad civil" }, { text: "Daños propios" }],
      order: 20,
      recommended: true,
    },
  ] as const;
}

export function seedPlans(country: Country) {
  const [essential, extended] = originalSeedPlans(country);
  return [
    {
      ...essential,
      benefits: [
        ...essential.benefits,
        { text: "Orientación telefónica tras un accidente" },
        { text: "Apoyo para coordinar una grúa" },
      ],
    },
    {
      ...extended,
      benefits: [
        ...extended.benefits,
        { text: "Envío de grúa en caso de avería" },
        { text: "Ayuda con batería descargada" },
        { text: "Asistencia para cambiar un neumático" },
      ],
    },
    {
      country,
      currency: planCurrency[country],
      active: true,
      name: "Integral",
      shortDescription: "Cobertura amplia y asistencia para viajes largos.",
      basePrice: country === "co" ? 199900 : 36900,
      coverages: [
        { text: "Responsabilidad civil" },
        { text: "Daños propios" },
        { text: "Robo del vehículo" },
      ],
      benefits: [
        { text: "Asistencia en carretera" },
        { text: "Envío de grúa en caso de avería" },
        { text: "Ayuda con batería descargada" },
        { text: "Vehículo de reemplazo durante la reparación" },
        { text: "Traslado de ocupantes tras una avería" },
      ],
      order: 30,
      recommended: false,
    },
  ] as const;
}
