const MESES_TITULO: Record<number, string> = {
  1: "Enero",
  2: "Febrero",
  3: "Marzo",
  4: "Abril",
  5: "Mayo",
  6: "Junio",
  7: "Julio",
  8: "Agosto",
  9: "Septiembre",
  10: "Octubre",
  11: "Noviembre",
  12: "Diciembre",
};

function titleCaseSucursal(nombre: string): string {
  const lower = nombre.trim().toLocaleLowerCase("es");
  if (!lower) return nombre;
  return lower.charAt(0).toLocaleUpperCase("es") + lower.slice(1);
}

export function etiquetaMesEstPorProd(mes: number): string {
  return MESES_TITULO[mes] ?? String(mes);
}

/** Ej.: `Guaymallén - Enero - 2026` */
export function etiquetaPeriodoEstPorProd(
  nombreSucursal: string,
  mes: number,
  anio: number
): string {
  return `${titleCaseSucursal(nombreSucursal)} - ${etiquetaMesEstPorProd(mes)} - ${anio}`;
}
