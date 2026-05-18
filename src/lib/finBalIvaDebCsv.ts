/** Tipos compartidos para líneas importadas de IVA débito (TXT AFIP). */

export interface FilaCsvIvaDebParseada {
  dedupeKey: string;
  fechaEmision: Date;
  denominacionReceptor: string;
  impTotal: number;
  impIva: number;
}

export function filaPerteneceMesAnio(fecha: Date, mes: number, anio: number): boolean {
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() + 1 === mes;
}
