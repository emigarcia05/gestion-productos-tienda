export const TITULARES_CAJA_TESORERIA = [
  "Suc. Guaymallen",
  "Suc. Maipu",
  "Walter Garcia",
  "Fernando Panaia",
  "Emiliano Garcia",
  "Vanesa Garcia",
] as const;

export type TitularCajaTesoreria = (typeof TITULARES_CAJA_TESORERIA)[number];
