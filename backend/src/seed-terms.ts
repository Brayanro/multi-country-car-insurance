import type { Country } from "@quote/contract";

const bodies = {
  co: "La cobertura del vehículo está sujeta a los límites y las exclusiones del plan seleccionado.\n\nRevisa el precio final y los datos registrados antes de aceptar.",
  cl: "La cobertura se aplica al vehículo identificado por su patente y está sujeta a los límites del plan seleccionado.\n\nRevisa el precio final y los datos registrados antes de aceptar.",
} satisfies Record<Country, string>;

export function seedTerms(country: Country) {
  return { country, body: bodies[country] };
}
