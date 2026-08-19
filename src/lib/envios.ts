import type { ClienteTipo, EnviosDepartamento, EnviosFormaPagado } from "@prisma/client";

export const CLIENTE_TIPO_VALUES = ["CONSUMIDOR_FINAL", "PINTOR"] as const;
export type ClienteTipoValue = (typeof CLIENTE_TIPO_VALUES)[number];

export const ENVIOS_FORMA_PAGADO_VALUES = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "POSNET",
  "CUENTA_CORRIENTE",
] as const;
export type EnviosFormaPagadoValue = (typeof ENVIOS_FORMA_PAGADO_VALUES)[number];

export const CLIENTE_TIPO_LABELS: Record<ClienteTipo, string> = {
  CONSUMIDOR_FINAL: "CONSUMIDOR FINAL",
  PINTOR: "PINTOR",
};

export const ENVIOS_DEPARTAMENTO_VALUES = [
  "LAS_HERAS",
  "GODOY_CRUZ",
  "GUAYMALLEN",
  "MAIPU",
  "LUJAN",
] as const;
export type EnviosDepartamentoValue = (typeof ENVIOS_DEPARTAMENTO_VALUES)[number];

export const ENVIOS_DEPARTAMENTO_LABELS: Record<EnviosDepartamento, string> = {
  LAS_HERAS: "LAS HERAS",
  GODOY_CRUZ: "GODOY CRUZ",
  GUAYMALLEN: "GUAYMALLEN",
  MAIPU: "MAIPU",
  LUJAN: "LUJAN",
};

export function etiquetaDepartamentoEnvio(departamento: EnviosDepartamento | null): string {
  return departamento ? ENVIOS_DEPARTAMENTO_LABELS[departamento] : "";
}

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

/** `clientes.nombre_completo` se persiste y muestra en mayúsculas. */
export function normalizarNombreCliente(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-AR");
}

export function nombreCompletoCliente(cliente: {
  nombreCompleto: string;
}): string {
  return normalizarNombreCliente(cliente.nombreCompleto);
}

/** Textos de `envios_direcciones`: primera letra mayúscula, resto minúsculas. */
export function capitalizarTextoEnvio(value: string): string {
  const t = value.trim().replace(/\s+/g, " ");
  if (t === "") return t;
  const lower = t.toLocaleLowerCase("es-AR");
  return lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1);
}

/** Misma regla mientras se escribe (sin recortar espacios al final). */
export function capitalizarTextoEnvioInput(value: string): string {
  if (value === "") return value;
  const first = value.charAt(0).toLocaleUpperCase("es-AR");
  const rest = value.slice(1).toLocaleLowerCase("es-AR");
  return first + rest;
}

export interface ClienteResumen {
  id: string;
  nombreCompleto: string;
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
  calleNombre: string;
  numeracion: string;
  distrito: string;
  departamento: EnviosDepartamento | null;
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
  const calle = `${dir.calleNombre} ${dir.numeracion}`.trim();
  if (calle !== "") return calle;
  return metaDireccionEnvio(dir) || "Dirección";
}

export function metaDireccionEnvio(dir: EnviosDireccionItem): string {
  return [dir.distrito, etiquetaDepartamentoEnvio(dir.departamento), dir.referencia]
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .join(" · ");
}

export function direccionEnvioTieneDato(data: {
  calleNombre?: string | null;
  numeracion?: string | null;
  distrito?: string | null;
  departamento?: string | null;
  urlMaps?: string | null;
  referencia?: string | null;
}): boolean {
  return (
    (data.calleNombre ?? "").trim() !== "" ||
    (data.numeracion ?? "").trim() !== "" ||
    (data.distrito ?? "").trim() !== "" ||
    Boolean(data.departamento) ||
    (data.urlMaps ?? "").trim() !== "" ||
    (data.referencia ?? "").trim() !== ""
  );
}
