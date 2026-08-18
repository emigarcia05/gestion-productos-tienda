import type { ClienteTipo, EnviosFormaPagado } from "@prisma/client";

export const CLIENTE_TIPO_VALUES = ["FINAL", "PINTOR"] as const;
export type ClienteTipoValue = (typeof CLIENTE_TIPO_VALUES)[number];

export const ENVIOS_FORMA_PAGADO_VALUES = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "POSNET",
  "CUENTA_CORRIENTE",
] as const;
export type EnviosFormaPagadoValue = (typeof ENVIOS_FORMA_PAGADO_VALUES)[number];

export const CLIENTE_TIPO_LABELS: Record<ClienteTipo, string> = {
  FINAL: "FINAL",
  PINTOR: "PINTOR",
};

export const ENVIOS_FORMA_PAGADO_LABELS: Record<EnviosFormaPagado, string> = {
  EFECTIVO: "EFECTIVO",
  TRANSFERENCIA: "TRANSFERENCIA",
  POSNET: "POSNET",
  CUENTA_CORRIENTE: "CUENTA CORRIENTE",
};

export function etiquetaTipoCliente(tipo: ClienteTipo): string {
  return CLIENTE_TIPO_LABELS[tipo];
}

export function etiquetaFormaPagadoEnvio(forma: EnviosFormaPagado): string {
  return ENVIOS_FORMA_PAGADO_LABELS[forma];
}

export function nombreCompletoCliente(cliente: {
  nombre: string;
  apellido: string;
}): string {
  return `${cliente.apellido} ${cliente.nombre}`.trim();
}

export interface ClienteResumen {
  id: string;
  nombre: string;
  apellido: string;
  cel: string;
  tipo: ClienteTipo;
}

export interface ClienteItem extends ClienteResumen {
  pintorAsociadoId: string | null;
  pintorAsociado: ClienteResumen | null;
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
  clienteFinal: ClienteItem | null;
  pintor: ClienteItem | null;
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
