/**
 * Formateo de fechas/horas en zona horaria de negocio: Argentina (UTC−3, sin DST).
 * Usar siempre en PDFs, nombres de archivo y UI que deban coincidir con hora local AR
 * aunque el servidor esté en UTC (p. ej. Vercel) o el usuario tenga otra zona en el navegador.
 */
export const TIMEZONE_ARGENTINA = "America/Argentina/Buenos_Aires" as const;

type PartMap = Record<string, string>;

function toPartMap(d: Date, options: Intl.DateTimeFormatOptions): PartMap {
  const parts = new Intl.DateTimeFormat("es-AR", {
    ...options,
    timeZone: TIMEZONE_ARGENTINA,
  }).formatToParts(d);
  const m: PartMap = {};
  for (const x of parts) {
    if (x.type !== "literal") m[x.type] = x.value;
  }
  return m;
}

/** Ej. `25/03 14:30` — PDF, listados, modales. */
export function formatDdMmHhMmArgentina(d: Date): string {
  const m = toPartMap(d, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${m.day}/${m.month} ${m.hour}:${m.minute}`;
}

/** Encabezado tipo nota de pedido: `miércoles 25 de marzo de 2026`. */
export function formatFechaLargaNotaPedidoArgentina(d: Date): string {
  const weekday = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    weekday: "long",
  }).format(d);
  const day = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    day: "numeric",
  }).format(d);
  const month = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    month: "long",
  }).format(d);
  const year = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    year: "numeric",
  }).format(d);
  return `${weekday} ${day} de ${month} de ${year}`;
}

/** Fecha y hora legible para impresión / pie de página. */
export function formatFechaHoraCompletaArgentina(d: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(d)
    .replace(/\s*,\s*/g, " ")
    .trim();
}

/** Sello para nombres de archivo: `25-03-26 14:30`. */
export function formatDdMmYyHhMmNombreArchivoArgentina(d: Date): string {
  const m = toPartMap(d, {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${m.day}-${m.month}-${m.year} ${m.hour}:${m.minute}`;
}

/**
 * Calendario gregoriano en Argentina a partir de un instante UTC (p. ej. `generadoAt` de Prisma).
 * `YYYY-MM-DD` para inputs `type="date"` y exportaciones DUX.
 */
export function dateToIsoYmdArgentina(d: Date): string {
  const m = toPartMap(d, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${m.year}-${m.month}-${m.day}`;
}

/** Primeros siete caracteres de {@link dateToIsoYmdArgentina} → `YYYY-MM` (mes calendario AR). */
export function isoYearMonthArgentina(d = new Date()): string {
  return dateToIsoYmdArgentina(d).slice(0, 7);
}

/** Título tipo **Marzo 2026** para encabezado de calendario. */
export function formatMesAnioTituloArgentina(year: number, month1to12: number): string {
  const d = new Date(Date.UTC(year, month1to12 - 1, 15, 3, 0, 0));
  const mes = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    month: "long",
  }).format(d);
  const capitalizado = mes.charAt(0).toLocaleUpperCase("es-AR") + mes.slice(1);
  return `${capitalizado} ${year}`;
}

/** Suma días calendario a `YYYY-MM-DD` (negocio en `TIMEZONE_ARGENTINA`). */
export function addDaysToIsoYmdArgentina(isoYmd: string, deltaDays: number): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return isoYmd;
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const next = new Date(utc + deltaDays * 86400000);
  return dateToIsoYmdArgentina(next);
}

/** Etiqueta de mes para tablas: `MARZO 2026` (nombre del mes en mayúsculas + año). */
export function formatMesAnioMayusculasDesdeIsoYmd(isoYmd: string): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const mes = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    month: "long",
  }).format(dt);
  const anio = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    year: "numeric",
  }).format(dt);
  return `${mes.toLocaleUpperCase("es-AR")} ${anio}`;
}

/** Ej. `ABRIL 1` — mes en mayúsculas + día del mes (calendario Argentina). */
export function formatMesDiaMayusculasDesdeIsoYmd(isoYmd: string): string {
  const [y, m, d] = isoYmd.split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const mes = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    month: "long",
  })
    .format(dt)
    .toLocaleUpperCase("es-AR");
  const dia = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    day: "numeric",
  }).format(dt);
  return `${mes} ${dia}`;
}

/** `2026-03-15` → `15/03/2026` (solo presentación). */
export function formatIsoYmdDdMmYyyyArgentina(isoYmd: string): string {
  const [y, m, d] = isoYmd.split("-");
  if (!y || !m || !d) return isoYmd;
  return `${d}/${m}/${y}`;
}

const MS_CALENDARIO_DIA = 86_400_000;

/**
 * Días calendario entre `desdeIso` y `hastaIso` (solo `YYYY-MM-DD`), ambas en zona de negocio Argentina.
 * Si `hastaIso` es anterior a `desdeIso`, devuelve `null`. Si coinciden, `0`.
 */
export function diasCalendarioDesdeHastaIsoYmdArgentina(
  desdeIso: string,
  hastaIso: string
): number | null {
  const [ya, ma, da] = desdeIso.split("-").map(Number);
  const [yh, mh, dh] = hastaIso.split("-").map(Number);
  if (![ya, ma, da, yh, mh, dh].every((n) => Number.isFinite(n))) return null;
  const t0 = Date.UTC(ya, ma - 1, da);
  const t1 = Date.UTC(yh, mh - 1, dh);
  if (t1 < t0) return null;
  return Math.round((t1 - t0) / MS_CALENDARIO_DIA);
}

/**
 * Para cheques de tesorería: días que restan hasta la fecha de acreditación (calendario Argentina).
 * Vacío si la fecha de acreditación ya pasó respecto de hoy en AR.
 */
export function textoDiasFaltantesAcreditacionCheque(fechaAcreditacionIso: string): string {
  const hoy = dateToIsoYmdArgentina(new Date());
  const n = diasCalendarioDesdeHastaIsoYmdArgentina(hoy, fechaAcreditacionIso);
  if (n === null) return "";
  return String(n);
}

/** Sello `dd_mm hh_mm` para nombre de archivo de recepción. */
export function formatDdMmHhMmGuionesBajosArchivoArgentina(d: Date): string {
  const m = toPartMap(d, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${m.day}_${m.month} ${m.hour}_${m.minute}`;
}
