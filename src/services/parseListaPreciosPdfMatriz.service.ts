import {
  aplanarMatrizListaPrecios,
  filaPareceEncabezadoPresentaciones,
  normalizarPresentacion,
  type MatrizListaPreciosPdf,
} from "@/lib/listaPreciosPdfMatriz";
import { getPdfJsServer } from "@/lib/pdfjsServerLoad";
import { PAGINA_INICIO_PDF_MATRIZ_DEFAULT } from "@/lib/validations/parseListaPreciosPdfMatriz";

export interface ParseListaPreciosPdfMatrizOptions {
  paginaInicio?: number;
  /** Cantidad de filas tabulares extraídas a descartar desde el inicio. */
  filasIgnorar?: number;
}

export interface ParseListaPreciosPdfMatrizResult {
  filas: ReturnType<typeof aplanarMatrizListaPrecios>["filas"];
  meta: {
    paginaInicioUsada: number;
    filasIgnoradasUsadas: number;
    paginasProcesadas: number;
    filasOmitidasVacias: number;
    advertencias: string[];
  };
}

/** Omite las primeras N filas del texto tabular extraído del PDF. */
export function omitirFilasTabularesInicio(filas: string[][], filasIgnorar: number): string[][] {
  const n = Math.max(0, Math.floor(filasIgnorar));
  if (n === 0) return filas;
  return filas.slice(n);
}

interface TextToken {
  x: number;
  y: number;
  str: string;
}

const Y_TOLERANCE = 4;
const MERGE_X_GAP = 6;
const COLUMN_GAP = 22;

function esPresentacionConocida(valor: string): boolean {
  const n = normalizarPresentacion(valor);
  if (!n) return false;
  if (normalizarPresentacion("Un.") === n) return true;
  if (["¼", "½"].includes(n)) return true;
  return /^\d+\s*L$/i.test(n);
}

function tokensFromTextContent(items: unknown[]): TextToken[] {
  const tokens: TextToken[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const rec = item as { str?: string; transform?: number[] };
    if (typeof rec.str !== "string" || !rec.str.trim()) continue;
    const tr = rec.transform;
    if (!Array.isArray(tr) || tr.length < 6) continue;
    tokens.push({ x: tr[4], y: tr[5], str: rec.str.trim() });
  }
  return tokens;
}

function clusterTokensIntoRows(tokens: TextToken[]): TextToken[][] {
  if (tokens.length === 0) return [];
  const sorted = [...tokens].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextToken[][] = [];
  let current: TextToken[] = [sorted[0]];
  let currentY = sorted[0].y;

  for (let i = 1; i < sorted.length; i++) {
    const t = sorted[i];
    if (Math.abs(t.y - currentY) <= Y_TOLERANCE) {
      current.push(t);
    } else {
      rows.push(current);
      current = [t];
      currentY = t.y;
    }
  }
  rows.push(current);
  return rows;
}

function mergeTokensInRow(row: TextToken[]): string[] {
  const sorted = [...row].sort((a, b) => a.x - b.x);
  const chunks: { x: number; text: string }[] = [];

  for (const t of sorted) {
    const last = chunks[chunks.length - 1];
    if (last && t.x - last.x <= MERGE_X_GAP) {
      last.text = `${last.text} ${t.str}`.replace(/\s+/g, " ").trim();
    } else {
      chunks.push({ x: t.x, text: t.str });
    }
  }

  if (chunks.length === 0) return [];

  const cells: string[] = [];
  let buf = chunks[0].text;
  let prevX = chunks[0].x;

  for (let i = 1; i < chunks.length; i++) {
    const c = chunks[i];
    if (c.x - prevX >= COLUMN_GAP) {
      cells.push(buf.trim());
      buf = c.text;
    } else {
      buf = `${buf} ${c.text}`.replace(/\s+/g, " ").trim();
    }
    prevX = c.x;
  }
  cells.push(buf.trim());
  return cells;
}

function indiceInicioPresentaciones(celdas: string[]): number {
  for (let i = 0; i < celdas.length; i++) {
    if (esPresentacionConocida(celdas[i])) return i;
  }
  return -1;
}

function extraerPresentacionesDeEncabezado(celdas: string[]): string[] | null {
  const start = indiceInicioPresentaciones(celdas);
  if (start < 0) return null;
  const slice = celdas.slice(start);
  if (!filaPareceEncabezadoPresentaciones(slice)) return null;
  return slice.map(normalizarPresentacion).filter(Boolean);
}

function filaEsEncabezadoDescripcion(celdas: string[]): boolean {
  const first = (celdas[0] ?? "").toLowerCase();
  return first.includes("descrip") || first === "producto" || first === "artículo" || first === "articulo";
}

function construirMatrizDesdeFilasTabulares(
  filasTabulares: string[][],
  advertencias: string[]
): MatrizListaPreciosPdf {
  let presentaciones: string[] | null = null;
  let indicePresentacion = -1;
  const filas: MatrizListaPreciosPdf["filas"] = [];

  for (const celdas of filasTabulares) {
    if (celdas.length === 0) continue;

    const encabezado = extraerPresentacionesDeEncabezado(celdas);
    if (encabezado) {
      presentaciones = encabezado;
      indicePresentacion = indiceInicioPresentaciones(celdas);
      continue;
    }

    if (!presentaciones) {
      if (filaEsEncabezadoDescripcion(celdas)) continue;
      continue;
    }

    if (filaEsEncabezadoDescripcion(celdas)) continue;

    const descripcionBase =
      indicePresentacion > 0
        ? celdas
            .slice(0, indicePresentacion)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        : (celdas[0] ?? "").trim();

    if (!descripcionBase) continue;

    const celdasPrecio = celdas.slice(indicePresentacion);
    const mapa: Record<string, string> = {};
    for (let i = 0; i < presentaciones.length; i++) {
      mapa[presentaciones[i]] = celdasPrecio[i] ?? "";
    }

    filas.push({ descripcionBase, celdas: mapa });
  }

  if (!presentaciones) {
    advertencias.push(
      "No se encontró fila de encabezados con presentaciones (Un., 1 L, 10 L, etc.). Verificá la página de inicio."
    );
  }

  return {
    presentaciones: presentaciones ?? [],
    filas,
  };
}

async function extraerFilasTabularesDesdePdf(
  buffer: Buffer,
  paginaInicio: number
): Promise<{ filas: string[][]; paginasProcesadas: number; advertencias: string[] }> {
  const advertencias: string[] = [];
  const pdfjs = await getPdfJsServer();

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const filas: string[][] = [];
  const totalPages = doc.numPages;
  const from = Math.min(Math.max(1, paginaInicio), totalPages);
  let paginasProcesadas = 0;

  if (from > 1) {
    advertencias.push(`Se omitieron las páginas 1 a ${from - 1} (índice).`);
  }

  for (let pageNum = from; pageNum <= totalPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const tokens = tokensFromTextContent(content.items as unknown[]);
    const rowGroups = clusterTokensIntoRows(tokens);

    for (const group of rowGroups) {
      const cells = mergeTokensInRow(group);
      if (cells.some((c) => c.length > 0)) filas.push(cells);
    }
    paginasProcesadas++;
  }

  return { filas, paginasProcesadas, advertencias };
}

export async function parseListaPreciosPdfMatriz(
  buffer: Buffer,
  options?: ParseListaPreciosPdfMatrizOptions
): Promise<ParseListaPreciosPdfMatrizResult> {
  const paginaInicioUsada = options?.paginaInicio ?? PAGINA_INICIO_PDF_MATRIZ_DEFAULT;
  const filasIgnoradasUsadas = Math.max(0, Math.floor(options?.filasIgnorar ?? 0));
  const advertencias: string[] = [];

  const { filas: filasExtraidas, paginasProcesadas, advertencias: advPdf } =
    await extraerFilasTabularesDesdePdf(buffer, paginaInicioUsada);
  advertencias.push(...advPdf);

  if (filasIgnoradasUsadas > 0) {
    if (filasIgnoradasUsadas >= filasExtraidas.length) {
      advertencias.push(
        `Se ignoraron ${filasIgnoradasUsadas} filas pero el PDF solo aportó ${filasExtraidas.length} fila(s) tabular(es).`
      );
    } else {
      advertencias.push(`Se ignoraron las primeras ${filasIgnoradasUsadas} fila(s) tabular(es) del extracto.`);
    }
  }

  const filasTabulares = omitirFilasTabularesInicio(filasExtraidas, filasIgnoradasUsadas);

  const matriz = construirMatrizDesdeFilasTabulares(filasTabulares, advertencias);
  const { filas, meta: metaAplanado } = aplanarMatrizListaPrecios(matriz);
  advertencias.push(...metaAplanado.advertencias);

  if (matriz.filas.length === 0 && filas.length === 0) {
    advertencias.push(
      "No se extrajeron filas de producto. Probá ajustar página de inicio, filas a ignorar o el formato del PDF."
    );
  }

  return {
    filas,
    meta: {
      paginaInicioUsada,
      filasIgnoradasUsadas,
      paginasProcesadas,
      filasOmitidasVacias: metaAplanado.filasOmitidasVacias,
      advertencias,
    },
  };
}

/** Expuesto para tests con matrices JSON sin PDF. */
export function parseMatrizTabularListaPrecios(
  filasTabulares: string[][],
  options?: { paginaInicioUsada?: number; filasIgnorar?: number }
): ParseListaPreciosPdfMatrizResult {
  const paginaInicioUsada = options?.paginaInicioUsada ?? PAGINA_INICIO_PDF_MATRIZ_DEFAULT;
  const filasIgnoradasUsadas = Math.max(0, Math.floor(options?.filasIgnorar ?? 0));
  const advertencias: string[] = [];
  const filasRecortadas = omitirFilasTabularesInicio(filasTabulares, filasIgnoradasUsadas);
  if (filasIgnoradasUsadas > 0) {
    advertencias.push(`Se ignoraron las primeras ${filasIgnoradasUsadas} fila(s) tabular(es) del extracto.`);
  }
  const matriz = construirMatrizDesdeFilasTabulares(filasRecortadas, advertencias);
  const { filas, meta: metaAplanado } = aplanarMatrizListaPrecios(matriz);
  advertencias.push(...metaAplanado.advertencias);

  return {
    filas,
    meta: {
      paginaInicioUsada,
      filasIgnoradasUsadas,
      paginasProcesadas: 0,
      filasOmitidasVacias: metaAplanado.filasOmitidasVacias,
      advertencias,
    },
  };
}
