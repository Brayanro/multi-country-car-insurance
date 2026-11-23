import type { Country } from "@quote/contract";

const makeOptions = [
  { optionKey: "example-motor", label: "Ejemplo Motor" },
  { optionKey: "demo-auto", label: "Demo Auto" },
];
const nameField = {
  fieldKey: "holder-name",
  label: "Nombre del titular",
  kind: "text",
  order: 10,
  required: true,
  helpText: "",
  errorMessage: "Ingresa el nombre del titular.",
  rules: [
    {
      operator: "minLength",
      argument: { value: 2 },
      message: "Ingresa al menos dos caracteres.",
    },
  ],
};
const dateField = {
  fieldKey: "birth-date",
  label: "Fecha de nacimiento",
  kind: "date",
  order: 40,
  required: true,
  purpose: "dateOfBirth",
  helpText: "",
  errorMessage: "Ingresa una fecha de nacimiento válida.",
  rules: [
    {
      operator: "minimumAge",
      argument: { value: 18 },
      message: "El titular debe tener al menos 18 años.",
    },
  ],
};
const yearField = {
  fieldKey: "vehicle-year",
  label: "Año del vehículo",
  kind: "number",
  order: 60,
  required: true,
  purpose: "vehicleYear",
  helpText: "",
  errorMessage: "Ingresa el año del vehículo.",
  rules: [
    {
      operator: "vehicleYearRange",
      message: "Ingresa un año entre hace 20 años y el próximo año.",
    },
  ],
};
const makeField = {
  fieldKey: "vehicle-make",
  label: "Marca",
  kind: "select",
  order: 70,
  required: true,
  helpText: "",
  errorMessage: "Selecciona una marca.",
  options: makeOptions,
};
const accessoriesField = {
  fieldKey: "accessories",
  label: "El auto tiene accesorios adicionales",
  kind: "checkbox",
  order: 80,
  required: false,
  helpText: "",
  errorMessage: "Revisa esta opción.",
  defaultValue: { value: false },
};
const documentTypeField = {
  fieldKey: "document-type",
  label: "Tipo de documento",
  kind: "select",
  order: 20,
  required: true,
  helpText: "",
  errorMessage: "Selecciona un tipo de documento.",
  options: [
    { optionKey: "cc", label: "Cédula de ciudadanía" },
    { optionKey: "ce", label: "Cédula de extranjería" },
  ],
};

export function seedForm(country: Country) {
  const isColombia = country === "co";
  const documentField = {
    fieldKey: "identity-document",
    label: isColombia ? "Número de documento" : "RUT",
    kind: "text",
    order: 30,
    required: true,
    purpose: "identityDocument",
    helpText: "",
    errorMessage: "Ingresa el número de documento.",
  };
  const plateField = {
    fieldKey: "license-plate",
    label: isColombia ? "Placa" : "Patente",
    kind: "text",
    order: 50,
    required: true,
    purpose: "licensePlate",
    helpText: "",
    errorMessage: isColombia ? "Ingresa la placa." : "Ingresa la patente.",
  };
  return {
    country,
    fields: [
      nameField,
      ...(isColombia ? [documentTypeField] : []),
      documentField,
      dateField,
      plateField,
      yearField,
      makeField,
      accessoriesField,
    ],
  };
}
