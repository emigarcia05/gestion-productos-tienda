/**
 * PDF de aumentos: segmento Resumen (tabla) + Detalle Por Producto.
 */
import { jsPDF } from "jspdf";
import { formatFechaLargaNotaPedidoArgentina } from "@/lib/fechaArgentina";
import type { InformeAumentosPxExport } from "@/lib/exportPxDiffTypes";

const MARGIN = 16;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

const PRIMARY_RGB = { r: 0, g: 114, b: 187 }; // #0072BB
const RUBRO_LINE_RGB = { r: 186, g: 218, b: 244 }; // divisor fino entre rubros (#bae4f4)
const MARCA_FILL_A_RGB = { r: 255, g: 255, b: 255 };
const MARCA_FILL_B_RGB = { r: 244, g: 248, b: 252 };
const MUTED_RGB = { r: 100, g: 116, b: 139 };
const POSITIVE_RGB = { r: 4, g: 120, b: 87 };
const NEGATIVE_RGB = { r: 185, g: 28, b: 28 };

const TITLE_SIZE = 14;
const SECTION_SIZE = 12;
const SUBTITLE_SIZE = 10;
const HEADER_SIZE = 9;
const BODY_SIZE = 10;
const DET_MARCA_SIZE = 11;
const DET_RUBRO_SIZE = 10;
const DET_PROD_SIZE = 9.5;

const ROW_H = 6.5;
const HEADER_H = 7.5;
const SECTION_GAP = 10;

const COL_MARCA_W = 46;
const COL_PCT_W = 20;
const COL_GAP_RUBRO_PCT = 2;
const COL_RUBRO_X = MARGIN + COL_MARCA_W;
const COL_RUBRO_W = CONTENT_WIDTH - COL_MARCA_W - COL_PCT_W - COL_GAP_RUBRO_PCT;
const COL_PCT_X = COL_RUBRO_X + COL_RUBRO_W + COL_GAP_RUBRO_PCT;

const DET_MARCA_ROW_PAD = 1.2;
const DET_RUBRO_ROW_PAD = 0.8;
const DET_ITEM_ROW_PAD = 0.35;
const DET_DESC_INDENT = 6;
const DET_RUBRO_INDENT = 3;
const DET_COL_PCT_W = 22;
const DET_DESC_X = MARGIN + DET_DESC_INDENT;
const DET_PCT_X = MARGIN + CONTENT_WIDTH - DET_COL_PCT_W;
const DET_DESC_W = DET_PCT_X - DET_DESC_X - 2;

export type GenerarPdfAumentosPxOptions = {
  fechaDocumento?: Date;
};

function formatPctAumento(pct: number): string {
  const abs = Math.abs(pct);
  if (abs < 0.05) return "≈0%";
  const absFmt = abs.toFixed(1);
  if (pct > 0) return `+${absFmt}%`;
  return `-${absFmt}%`;
}

function pctColor(pct: number): { r: number; g: number; b: number } {
  if (Math.abs(pct) < 0.05) return MUTED_RGB;
  return pct > 0 ? POSITIVE_RGB : NEGATIVE_RGB;
}

type PdfCtx = {
  doc: jsPDF;
  y: number;
};

function ensureSpace(ctx: PdfCtx, needed: number): void {
  if (ctx.y + needed <= PAGE_HEIGHT - MARGIN) return;
  ctx.doc.addPage();
  ctx.y = MARGIN;
}

function drawDocHeader(ctx: PdfCtx, fechaDoc: Date): void {
  const { doc } = ctx;
  doc.setTextColor(17, 17, 17);
  doc.setFontSize(TITLE_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("Informe De Aumentos De Precios", MARGIN + CONTENT_WIDTH / 2, ctx.y, {
    align: "center",
  });
  ctx.y += 7;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED_RGB.r, MUTED_RGB.g, MUTED_RGB.b);
  doc.text(formatFechaLargaNotaPedidoArgentina(fechaDoc), MARGIN + CONTENT_WIDTH / 2, ctx.y, {
    align: "center",
  });
  ctx.y += 8;
}

function startNewPage(ctx: PdfCtx): void {
  ctx.doc.addPage();
  ctx.y = MARGIN;
}

/** Título de sección en MAYÚSCULAS y centrado. */
function drawSectionHeading(ctx: PdfCtx, title: string): void {
  ensureSpace(ctx, SECTION_GAP + 4);
  const { doc } = ctx;
  doc.setTextColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  doc.setFontSize(SECTION_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), MARGIN + CONTENT_WIDTH / 2, ctx.y + 5, {
    align: "center",
  });
  ctx.y += 10;
}

function drawRubroDividerLine(ctx: PdfCtx, y: number): void {
  ctx.doc.setDrawColor(RUBRO_LINE_RGB.r, RUBRO_LINE_RGB.g, RUBRO_LINE_RGB.b);
  ctx.doc.setLineWidth(0.2);
  ctx.doc.line(COL_RUBRO_X, y, COL_PCT_X + COL_PCT_W, y);
}

function drawMarcaDividerLine(ctx: PdfCtx, y: number): void {
  ctx.doc.setDrawColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  ctx.doc.setLineWidth(0.55);
  ctx.doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
}

/** Divisor grueso #0072BB (bloque marca). */
function drawDetalleMarcaLine(ctx: PdfCtx, y: number): void {
  ctx.doc.setDrawColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  ctx.doc.setLineWidth(0.55);
  ctx.doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
}

/** Divisor medio #0072BB (subencabezado rubro). */
function drawDetalleRubroLine(ctx: PdfCtx, y: number): void {
  ctx.doc.setDrawColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  ctx.doc.setLineWidth(0.35);
  ctx.doc.line(MARGIN + DET_RUBRO_INDENT, y, MARGIN + CONTENT_WIDTH, y);
}

/** Divisor muy fino #0072BB (entre filas de producto). */
function drawDetalleItemLine(ctx: PdfCtx, y: number): void {
  ctx.doc.setDrawColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  ctx.doc.setLineWidth(0.15);
  ctx.doc.line(MARGIN + DET_DESC_INDENT, y, MARGIN + CONTENT_WIDTH, y);
}

function measureWrappedLines(
  doc: jsPDF,
  text: string,
  maxW: number,
  fontSize: number
): string[] {
  doc.setFontSize(fontSize);
  const wrapped = doc.splitTextToSize(text, maxW);
  const lines = Array.isArray(wrapped) ? wrapped : [String(wrapped)];
  return lines.filter((l) => l.trim().length > 0);
}

function drawResumenTable(ctx: PdfCtx, informe: InformeAumentosPxExport): void {
  const { resumen } = informe;
  if (resumen.marcas.length === 0) {
    ctx.doc.setFontSize(BODY_SIZE);
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setTextColor(17, 17, 17);
    ctx.doc.text(
      "No hay modificaciones agrupables por marca y rubro.",
      MARGIN,
      ctx.y,
      { maxWidth: CONTENT_WIDTH }
    );
    ctx.y += 8;
    return;
  }

  ensureSpace(ctx, HEADER_H + ROW_H);
  const { doc } = ctx;

  doc.setFillColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  doc.rect(MARGIN, ctx.y, CONTENT_WIDTH, HEADER_H, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(HEADER_SIZE);
  doc.setFont("helvetica", "bold");
  const hy = ctx.y + 4.8;
  doc.text("MARCA", MARGIN + COL_MARCA_W / 2, hy, { align: "center" });
  doc.text("RUBRO", COL_RUBRO_X + COL_RUBRO_W / 2, hy, { align: "center" });
  doc.text("AUM. PROM.", COL_PCT_X + COL_PCT_W / 2, hy, { align: "center" });
  ctx.y += HEADER_H;

  let marcaIdx = 0;

  for (const bloque of resumen.marcas) {
    const rubroRows: { rubro: string; pctText: string; pct: number; h: number }[] = [];
    let blockH = 0;

    for (const r of bloque.rubros) {
      const lines = measureWrappedLines(doc, r.rubro, COL_RUBRO_W - 2, BODY_SIZE);
      const h = Math.max(ROW_H, lines.length * (ROW_H - 0.6));
      rubroRows.push({
        rubro: r.rubro,
        pctText: formatPctAumento(r.aumentoPromedioPct),
        pct: r.aumentoPromedioPct,
        h,
      });
      blockH += h;
    }

    const marcaLines = measureWrappedLines(doc, bloque.marca, COL_MARCA_W - 3, BODY_SIZE);
    const marcaBlockH = Math.max(blockH, marcaLines.length * (ROW_H - 0.6));
    const totalBlockH = marcaBlockH;

    ensureSpace(ctx, totalBlockH + 1.2);

    const fill =
      marcaIdx % 2 === 0 ? MARCA_FILL_A_RGB : MARCA_FILL_B_RGB;
    doc.setFillColor(fill.r, fill.g, fill.b);
    doc.rect(MARGIN, ctx.y, CONTENT_WIDTH, totalBlockH, "F");

    doc.setFontSize(BODY_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 17, 17);
    let marcaY = ctx.y + 4.2;
    for (const ml of marcaLines) {
      doc.text(ml, MARGIN + 2, marcaY);
      marcaY += ROW_H - 0.6;
    }

    let rubroY = ctx.y + 4.2;
    const rubroDividerYs: number[] = [];

    for (let i = 0; i < rubroRows.length; i++) {
      const row = rubroRows[i]!;
      const rubroTextLines = measureWrappedLines(doc, row.rubro, COL_RUBRO_W - 2, BODY_SIZE);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 17, 17);
      let ty = rubroY;
      for (const rtl of rubroTextLines) {
        doc.text(rtl, COL_RUBRO_X + 1, ty);
        ty += ROW_H - 0.6;
      }

      const c = pctColor(row.pct);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(c.r, c.g, c.b);
      doc.text(row.pctText, COL_PCT_X + 1, rubroY);

      rubroY += row.h;
      if (i < rubroRows.length - 1) {
        rubroDividerYs.push(rubroY);
      }
    }

    for (const sepY of rubroDividerYs) {
      drawRubroDividerLine(ctx, sepY);
    }

    ctx.y += totalBlockH;

    drawMarcaDividerLine(ctx, ctx.y);
    ctx.y += 0.8;
    marcaIdx += 1;
  }
}

function measureRowHeight(
  doc: jsPDF,
  lines: string[],
  minH: number,
  lineStep: number
): number {
  return Math.max(minH, lines.length * lineStep);
}

function drawDetalleMarcaHeader(ctx: PdfCtx, marca: string): void {
  const { doc } = ctx;
  const marcaLines = measureWrappedLines(doc, marca, CONTENT_WIDTH - 2, DET_MARCA_SIZE);
  const rowH = measureRowHeight(doc, marcaLines, ROW_H, ROW_H - 0.2);
  ensureSpace(ctx, rowH + DET_MARCA_ROW_PAD + 1);

  doc.setFontSize(DET_MARCA_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  let ty = ctx.y + 4;
  for (const ml of marcaLines) {
    doc.text(ml, MARGIN, ty);
    ty += ROW_H - 0.2;
  }
  ctx.y += rowH;
  drawDetalleMarcaLine(ctx, ctx.y);
  ctx.y += DET_MARCA_ROW_PAD;
}

function drawDetalleRubroHeader(ctx: PdfCtx, rubro: string): void {
  const { doc } = ctx;
  const rubroLines = measureWrappedLines(
    doc,
    rubro,
    CONTENT_WIDTH - DET_RUBRO_INDENT - 2,
    DET_RUBRO_SIZE
  );
  const rowH = measureRowHeight(doc, rubroLines, ROW_H - 0.5, ROW_H - 0.4);
  ensureSpace(ctx, rowH + DET_RUBRO_ROW_PAD + 1);

  doc.setFontSize(DET_RUBRO_SIZE);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 17, 17);
  let ty = ctx.y + 3.8;
  for (const rl of rubroLines) {
    doc.text(rl, MARGIN + DET_RUBRO_INDENT, ty);
    ty += ROW_H - 0.4;
  }
  ctx.y += rowH;
  drawDetalleRubroLine(ctx, ctx.y);
  ctx.y += DET_RUBRO_ROW_PAD;
}

function drawDetalleProductoRow(
  ctx: PdfCtx,
  descripcion: string,
  aumentoPct: number
): void {
  const { doc } = ctx;
  const pctText = formatPctAumento(aumentoPct);
  const descLines = measureWrappedLines(doc, descripcion, DET_DESC_W, DET_PROD_SIZE);
  const rowH = measureRowHeight(doc, descLines, ROW_H - 0.3, ROW_H - 0.5);
  ensureSpace(ctx, rowH + DET_ITEM_ROW_PAD + 0.2);

  doc.setFontSize(DET_PROD_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(17, 17, 17);
  let dy = ctx.y + 3.6;
  for (const dl of descLines) {
    doc.text(dl, DET_DESC_X, dy);
    dy += ROW_H - 0.5;
  }

  const c = pctColor(aumentoPct);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(c.r, c.g, c.b);
  doc.text(pctText, DET_PCT_X + DET_COL_PCT_W - 1, ctx.y + 3.6, { align: "right" });

  ctx.y += rowH;
}

function drawDetalleProductos(ctx: PdfCtx, informe: InformeAumentosPxExport): void {
  const { detalleProductos } = informe;
  if (detalleProductos.marcas.length === 0) return;

  ctx.y += 2;

  const marcas = detalleProductos.marcas;
  for (let mi = 0; mi < marcas.length; mi++) {
    const marcaBloque = marcas[mi]!;

    drawDetalleMarcaHeader(ctx, marcaBloque.marca);

    for (const rubroBloque of marcaBloque.rubros) {
      drawDetalleRubroHeader(ctx, rubroBloque.rubro);

      const productos = rubroBloque.productos;
      for (let pi = 0; pi < productos.length; pi++) {
        const prod = productos[pi]!;
        drawDetalleProductoRow(ctx, prod.descripcion, prod.aumentoPct);
        if (pi < productos.length - 1) {
          drawDetalleItemLine(ctx, ctx.y);
          ctx.y += DET_ITEM_ROW_PAD;
        }
      }
    }

    if (mi < marcas.length - 1) {
      ctx.y += 1;
      drawDetalleMarcaLine(ctx, ctx.y);
      ctx.y += DET_MARCA_ROW_PAD;
    }
  }
}

export function generarPdfAumentosPx(
  informe: InformeAumentosPxExport,
  options?: GenerarPdfAumentosPxOptions
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const fechaDoc = options?.fechaDocumento ?? new Date();
  const ctx: PdfCtx = { doc, y: MARGIN };

  drawDocHeader(ctx, fechaDoc);
  drawSectionHeading(ctx, "Resumen");
  drawResumenTable(ctx, informe);
  startNewPage(ctx);
  drawSectionHeading(ctx, "Detalle");
  drawDetalleProductos(ctx, informe);

  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
}
