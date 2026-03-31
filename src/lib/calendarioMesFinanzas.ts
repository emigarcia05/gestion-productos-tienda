/** Calendario mensual (Lun→Dom) para UI Finanzas; fechas Y-M-D alineadas a calendario AR (medianoche = UTC+3). */

/** Día de la semana con **lunes = 0** … domingo = 6. */
export function weekdayLun0DesdeIsoYmd(isoYmd: string): number {
  const [y, m, d] = isoYmd.split("-").map(Number);
  const dowSun0 = new Date(Date.UTC(y, m - 1, d, 3, 0, 0)).getUTCDay();
  return (dowSun0 + 6) % 7;
}

export function diasEnMes(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0, 3, 0, 0)).getUTCDate();
}

export type CeldaCalendario = { isoYmd: string | null; dia: number | null };

/** Grilla de **42** celdas (6 semanas × 7 días); celdas vacías fuera del mes. */
export function construirGrillaMes(year: number, month1to12: number): CeldaCalendario[] {
  const m = String(month1to12).padStart(2, "0");
  const primer = `${year}-${m}-01`;
  const offset = weekdayLun0DesdeIsoYmd(primer);
  const total = diasEnMes(year, month1to12);
  const cells: CeldaCalendario[] = [];
  for (let i = 0; i < offset; i++) {
    cells.push({ isoYmd: null, dia: null });
  }
  for (let dia = 1; dia <= total; dia++) {
    const d = String(dia).padStart(2, "0");
    cells.push({ isoYmd: `${year}-${m}-${d}`, dia });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ isoYmd: null, dia: null });
  }
  while (cells.length < 42) {
    cells.push({ isoYmd: null, dia: null });
  }
  return cells;
}

/** `mes` query `YYYY-MM` o `undefined`; devuelve año/mes válidos y string `YYYY-MM`. */
export function parseMesFinanzasParam(
  mes: string | undefined,
  fallbackYm: string
): { year: number; month: number; ym: string } {
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = fallbackYm.split("-").map(Number);
    return { year: y, month: m, ym: fallbackYm };
  }
  const [ys, ms] = mes.split("-");
  const y = Number(ys);
  const mo = Number(ms);
  if (!Number.isFinite(y) || mo < 1 || mo > 12) {
    const [y2, m2] = fallbackYm.split("-").map(Number);
    return { year: y2, month: m2, ym: fallbackYm };
  }
  return { year: y, month: mo, ym: `${y}-${String(mo).padStart(2, "0")}` };
}

export function shiftMesYm(year: number, month1to12: number, delta: number): string {
  const d = new Date(Date.UTC(year, month1to12 - 1 + delta, 15, 3, 0, 0));
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}
