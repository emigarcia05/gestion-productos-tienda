export const TITULARES_CAJA_TESORERIA = [
  "SUC. GUAYMALLEN",
  "SUC. MAIPU",
  "WALTER GARCIA",
  "FERNANDO PANAIA",
  "EMILIANO GARCIA",
  "VANESA GARCIA",
] as const;

export type TitularCajaTesoreria = (typeof TITULARES_CAJA_TESORERIA)[number];
