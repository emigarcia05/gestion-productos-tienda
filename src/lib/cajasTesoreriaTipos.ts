import type {
  DisponibilidadCajaTesoreria,
  TipoCajaTesoreria,
  TipoValorTesoreria,
} from "@prisma/client";

/** Opciones de alta/edición en UI (valor = enum Prisma). */
export const OPCIONES_TIPO_CAJA_TESORERIA_UI: { value: TipoCajaTesoreria; label: string }[] = [
  { value: "BANCO", label: "BANCO" },
  { value: "BILLETERA_DIGITAL", label: "BILLETERA DIGITAL" },
  { value: "CHEQUE", label: "CHEQUE" },
  { value: "EFECTIVO", label: "CAJA LOCAL" },
  { value: "TARJETAS_A_COBRAR", label: "TARJETAS A COBRAR" },
];

export const OPCIONES_TIPO_VALOR_TESORERIA_UI: { value: TipoValorTesoreria; label: string }[] = [
  { value: "DIGITAL", label: "DIGITAL" },
  { value: "EFECTIVO", label: "EFECTIVO" },
  { value: "CHEQUE", label: "CHEQUE" },
];

export const OPCIONES_DISPONIBILIDAD_CAJA_UI: { value: DisponibilidadCajaTesoreria; label: string }[] = [
  { value: "INMEDIATA", label: "INMEDIATA" },
  { value: "DIFERIDO", label: "DIFERIDO" },
];

export function tipoValorDesdeTipoCaja(tipo: TipoCajaTesoreria): TipoValorTesoreria {
  if (tipo === "BANCO" || tipo === "BILLETERA_DIGITAL" || tipo === "TARJETAS_A_COBRAR") return "DIGITAL";
  if (tipo === "EFECTIVO") return "EFECTIVO";
  return "CHEQUE";
}

export function disponibilidadDesdeTipoCaja(tipo: TipoCajaTesoreria): DisponibilidadCajaTesoreria {
  if (tipo === "CHEQUE" || tipo === "TARJETAS_A_COBRAR") return "DIFERIDO";
  return "INMEDIATA";
}

/** Etiqueta de pantalla para filtros y tabla (enum EFECTIVO → CAJA LOCAL; el resto: guión bajo → espacio). */
export function etiquetaTipoCajaEnPantalla(tipo: TipoCajaTesoreria): string {
  if (tipo === "EFECTIVO") return "CAJA LOCAL";
  if (tipo === "TARJETAS_A_COBRAR") return "TARJETAS A COBRAR";
  return tipo.replaceAll("_", " ");
}
