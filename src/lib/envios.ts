import type { EnviosFormaPagado, EnviosPersonaTipo } from "@prisma/client";

export const ENVIOS_PERSONA_TIPO_VALUES = ["CLIENTE_FINAL", "PINTOR"] as const;
export type EnviosPersonaTipoValue = (typeof ENVIOS_PERSONA_TIPO_VALUES)[number];

export const ENVIOS_FORMA_PAGADO_VALUES = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "POSNET",
  "CUENTA_CORRIENTE",
] as const;
export type EnviosFormaPagadoValue = (typeof ENVIOS_FORMA_PAGADO_VALUES)[number];

export const ENVIOS_PERSONA_TIPO_LABELS: Record<EnviosPersonaTipo, string> = {
  CLIENTE_FINAL: "CLIENTE FINAL",
  PINTOR: "PINTOR",
};

export const ENVIOS_FORMA_PAGADO_LABELS: Record<EnviosFormaPagado, string> = {
  EFECTIVO: "EFECTIVO",
  TRANSFERENCIA: "TRANSFERENCIA",
  POSNET: "POSNET",
  CUENTA_CORRIENTE: "CUENTA CORRIENTE",
};

export function etiquetaTipoPersonaEnvio(tipo: EnviosPersonaTipo): string {
  return ENVIOS_PERSONA_TIPO_LABELS[tipo];
}

export function etiquetaFormaPagadoEnvio(forma: EnviosFormaPagado): string {
  return ENVIOS_FORMA_PAGADO_LABELS[forma];
}

export function nombreCompletoPersonaEnvio(persona: {
  nombre: string;
  apellido: string;
}): string {
  return `${persona.apellido} ${persona.nombre}`.trim();
}

export interface EnviosPersonaItem {
  id: string;
  nombre: string;
  apellido: string;
  cel: string;
  tipo: EnviosPersonaTipo;
}

export interface EnviosDireccionItem {
  id: string;
  personaId: string;
  direccion: string;
  numeracion: string;
  urlMaps: string;
  referencia: string;
}

export interface EnviosFinalListItem {
  id: string;
  clienteFinal: EnviosPersonaItem | null;
  pintor: EnviosPersonaItem | null;
  direccion: EnviosDireccionItem;
  observacionEnvio: string;
  pagado: boolean;
  formaPagado: EnviosFormaPagado;
  pdfComprobanteNombre: string | null;
  tienePdf: boolean;
}

export function etiquetaDireccionEnvio(dir: EnviosDireccionItem): string {
  return `${dir.direccion} ${dir.numeracion}`.trim();
}
