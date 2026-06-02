/**
 * PDF de aumentos promedio por marca y rubro (exportación Px Listas).
 */
import { jsPDF } from "jspdf";
import { formatFechaLargaNotaPedidoArgentina } from "@/lib/fechaArgentina";
import type { ResumenAumentosPromedioPxExport } from "@/lib/exportPxDiffTypes";

const MARGIN = 16;
const PRIMARY_RGB = { r: 0, g: 114, b: 187 };
const MUTED_RGB = { r: 100, g: 116, b: 139 };
const ROW_EVEN_RGB = { r: 248, g: 250, b: 252 };
const BORDER_RGB = { r: 226, g: 232, b: 240 };
const POSITIVE_RGB = { r: 4, g: 120, b: 87 };
const NEGATIVE_RGB = { r: 185, g: 28, b: 28 };

const TITLE_SIZE = 14;
const SUBTITLE_SIZE = 10;
const MARCA_SIZE = 11;
const RUBRO_SIZE = 10;
const LINE_HEIGHT = 6.2;
const MARCA_BLOCK_GAP = 4;
const COL_MARCA_W = 62;

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

export function generarPdfAumentosPx(
  resumen: ResumenAumentosPromedioPxExport,
  options?: GenerarPdfAumentosPxOptions
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const contentWidth = pageWidth - 2 * MARGIN;
  const colRubroX = MARGIN + COL_MARCA_W + 4;
  const colRubroW = contentWidth - COL_MARCA_W - 4;
  const colPctW = 28;
  const colRubroTextW = colRubroW - colPctW - 2;

  let y = MARGIN;

  doc.setTextColor(17, 17, 17);
  doc.setFontSize(TITLE_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("Aumentos Promedio Por Marca Y Rubro", MARGIN + contentWidth / 2, y, {
    align: "center",
  });
  y += 7;

  doc.setFontSize(SUBTITLE_SIZE);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED_RGB.r, MUTED_RGB.g, MUTED_RGB.b);
  const fechaDoc = options?.fechaDocumento ?? new Date();
  doc.text(formatFechaLargaNotaPedidoArgentina(fechaDoc), MARGIN + contentWidth / 2, y, {
    align: "center",
  });
  y += 5;

  doc.setDrawColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, MARGIN + contentWidth, y);
  y += 8;

  if (resumen.marcas.length === 0) {
    doc.setTextColor(17, 17, 17);
    doc.setFontSize(RUBRO_SIZE);
    doc.setFont("helvetica", "normal");
    doc.text(
      "No hay modificaciones agrupables por marca y rubro en esta exportación.",
      MARGIN,
      y,
      { maxWidth: contentWidth }
    );
    const buf = doc.output("arraybuffer");
    return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
  }

  let blockIdx = 0;

  for (const bloque of resumen.marcas) {
    const rubroLines = bloque.rubros.map((r) => ({
      rubro: r.rubro,
      pctText: formatPctAumento(r.aumentoPromedioPct),
      pct: r.aumentoPromedioPct,
    }));

    const rubroHeights = rubroLines.map((line) => {
      doc.setFontSize(RUBRO_SIZE);
      const wrapped = doc.splitTextToSize(line.rubro, colRubroTextW);
      const lines = Array.isArray(wrapped) ? wrapped.length : 1;
      return Math.max(LINE_HEIGHT, lines * (LINE_HEIGHT - 0.8));
    });

    const blockHeight =
      Math.max(
        LINE_HEIGHT * 1.2,
        rubroHeights.reduce((a, b) => a + b, 0)
      ) + MARCA_BLOCK_GAP;

    if (y + blockHeight > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
      blockIdx = 0;
    }

    if (blockIdx % 2 === 1) {
      doc.setFillColor(ROW_EVEN_RGB.r, ROW_EVEN_RGB.g, ROW_EVEN_RGB.b);
      doc.rect(MARGIN, y - 1, contentWidth, blockHeight + 1, "F");
    }

    doc.setDrawColor(BORDER_RGB.r, BORDER_RGB.g, BORDER_RGB.b);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + blockHeight, MARGIN + contentWidth, y + blockHeight);

    doc.setFontSize(MARCA_SIZE);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 17, 17);
    const marcaWrapped = doc.splitTextToSize(bloque.marca, COL_MARCA_W - 2);
    const marcaLines = Array.isArray(marcaWrapped) ? marcaWrapped : [String(marcaWrapped)];
    let marcaY = y + 3.5;
    for (const ml of marcaLines) {
      doc.text(ml, MARGIN + 1, marcaY);
      marcaY += LINE_HEIGHT - 0.5;
    }

    let rubroY = y + 3.5;
    doc.setFontSize(RUBRO_SIZE);
    for (let i = 0; i < rubroLines.length; i++) {
      const line = rubroLines[i]!;
      const h = rubroHeights[i]!;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(17, 17, 17);
      const rubroWrapped = doc.splitTextToSize(line.rubro, colRubroTextW);
      const rubroTextLines = Array.isArray(rubroWrapped) ? rubroWrapped : [String(rubroWrapped)];
      let ty = rubroY;
      for (const rtl of rubroTextLines) {
        doc.text(rtl, colRubroX, ty);
        ty += LINE_HEIGHT - 0.8;
      }

      const pctColor =
        Math.abs(line.pct) < 0.05
          ? MUTED_RGB
          : line.pct > 0
            ? POSITIVE_RGB
            : NEGATIVE_RGB;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(pctColor.r, pctColor.g, pctColor.b);
      doc.text(line.pctText, MARGIN + contentWidth - 1, rubroY, { align: "right" });

      rubroY += h;
    }

    y += blockHeight;
    blockIdx += 1;
  }

  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
}
