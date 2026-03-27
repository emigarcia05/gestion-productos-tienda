/**
 * Genera un PDF con el detalle del pedido para envío (p. ej. por WhatsApp).
 * Usa jsPDF en el servidor (Node).
 */
import { jsPDF } from "jspdf";
import type { ItemPedidoParaPdf } from "@/services/pedidosEnvio.service";
import { formatFechaLargaNotaPedidoArgentina } from "@/lib/fechaArgentina";

const MARGIN = 14;
const ROW_HEIGHT = 7;
const FONT_SIZE = 10;
const HEADER_FONT_SIZE = 9;
const TITLE_FONT_SIZE = 12;
const DATE_FONT_SIZE = 10;
const CELL_LINE_HEIGHT = 4.4;
const CELL_PADDING_Y = 1.6;
const CELL_PADDING_X = 1.2;

const PRIMARY_RGB = { r: 0, g: 114, b: 187 }; // #0072BB
const EVEN_ROW_RGB = { r: 244, g: 248, b: 252 }; // #f4f8fc
const ROW_BORDER_RGB = { r: 224, g: 232, b: 240 }; // #e0e8f0

export type GenerarPdfPedidoOptions = {
  /** Si se informa (p. ej. historial), la fecha del encabezado coincide con la del pedido guardado. */
  fechaDocumento?: Date;
};

/**
 * Genera el PDF del pedido y devuelve el buffer (para convertir a base64).
 */
export function generarPdfPedido(
  items: ItemPedidoParaPdf[],
  proveedorNombre: string,
  sucursal: string,
  tiposLabel: string,
  options?: GenerarPdfPedidoOptions
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210; // A4 portrait mm
  const pageHeight = 297;
  let y = MARGIN;

  // Nota de Pedido
  const headerTopY = y;
  const contentWidth = pageWidth - 2 * MARGIN;
  const centerX = MARGIN + contentWidth / 2;

  doc.setTextColor(17, 17, 17);
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("Nota de Pedido", centerX, headerTopY, { align: "center" });

  // Fecha (más chico)
  doc.setFontSize(DATE_FONT_SIZE);
  doc.setFont("helvetica", "normal");
  const fechaDoc = options?.fechaDocumento ?? new Date();
  doc.text(formatFechaLargaNotaPedidoArgentina(fechaDoc), centerX, headerTopY + 6, { align: "center" });

  // (Sin línea divisoria: el encabezado de tabla ya separa visualmente)
  y = headerTopY + 17;

  if (items.length === 0) {
    doc.text("Sin ítems con cantidad.", MARGIN, y);
    const buf = doc.output("arraybuffer");
    return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
  }

  const itemsOrdenados = [...items].sort((a, b) =>
    (a.descripcion ?? "").localeCompare(b.descripcion ?? "", "es", { sensitivity: "base" })
  );

  // Tabla: CANT. - COD. - DESCRIPCION
  const wCant = 18;
  const wCod = 26;
  const wDesc = contentWidth - wCant - wCod;

  const colCant = MARGIN;
  const colCod = colCant + wCant;
  const colDesc = colCod + wCod;
  const xCantCenter = colCant + wCant / 2;
  const xCodCenter = colCod + wCod / 2;
  const xDescCenter = colDesc + wDesc / 2;

  function drawHeaderRow(headerY: number) {
    doc.setFillColor(PRIMARY_RGB.r, PRIMARY_RGB.g, PRIMARY_RGB.b);
    doc.rect(MARGIN, headerY, contentWidth, ROW_HEIGHT, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(HEADER_FONT_SIZE);
    doc.setFont("helvetica", "bold");
    const textY = headerY + 4;
    doc.text("CANT.", xCantCenter, textY, { align: "center" });
    doc.text("COD.", xCodCenter, textY, { align: "center" });
    doc.text("DESCRIPCION", xDescCenter, textY, { align: "center" });
  }

  type RowLayout = {
    codLines: string[];
    descLines: string[];
    rowHeight: number;
    maxLines: number;
  };

  function getRowLayout(row: ItemPedidoParaPdf): RowLayout {
    doc.setFontSize(FONT_SIZE);
    doc.setFont("helvetica", "normal");

    const codLinesRaw = doc.splitTextToSize(
      (row.codProveedor ?? "").trim(),
      Math.max(1, wCod - CELL_PADDING_X * 2)
    );
    const descLinesRaw = doc.splitTextToSize(
      (row.descripcion ?? "").trim(),
      Math.max(1, wDesc - CELL_PADDING_X * 2)
    );

    const codLines = (Array.isArray(codLinesRaw) ? codLinesRaw : [String(codLinesRaw)]).filter(
      (line) => line.trim().length > 0
    );
    const descLines = (
      Array.isArray(descLinesRaw) ? descLinesRaw : [String(descLinesRaw)]
    ).filter((line) => line.trim().length > 0);

    const maxLines = Math.max(1, codLines.length, descLines.length);
    const rowHeight = Math.max(
      ROW_HEIGHT,
      CELL_PADDING_Y * 2 + maxLines * CELL_LINE_HEIGHT
    );

    return {
      codLines: codLines.length > 0 ? codLines : [""],
      descLines: descLines.length > 0 ? descLines : [""],
      rowHeight,
      maxLines,
    };
  }

  function drawRow(
    rowY: number,
    idx: number,
    row: ItemPedidoParaPdf,
    layout: RowLayout
  ) {
    const isEven = idx % 2 === 1; // nth-child(even) en PrintStock -> idx impar
    if (isEven) {
      doc.setFillColor(EVEN_ROW_RGB.r, EVEN_ROW_RGB.g, EVEN_ROW_RGB.b);
      doc.rect(MARGIN, rowY, contentWidth, layout.rowHeight, "F");
    }

    doc.setDrawColor(ROW_BORDER_RGB.r, ROW_BORDER_RGB.g, ROW_BORDER_RGB.b);
    doc.setLineWidth(0.2);
    doc.line(
      MARGIN,
      rowY + layout.rowHeight,
      MARGIN + contentWidth,
      rowY + layout.rowHeight
    );

    doc.setTextColor(17, 17, 17);
    doc.setFontSize(FONT_SIZE);
    doc.setFont("helvetica", "normal");

    const textStartY =
      rowY +
      CELL_PADDING_Y +
      (layout.rowHeight - CELL_PADDING_Y * 2 - layout.maxLines * CELL_LINE_HEIGHT) / 2 +
      3.4;

    // Cantidad siempre en una línea, centrada verticalmente en la fila.
    const cantY = rowY + layout.rowHeight / 2 + 1.2;
    doc.text(String(row.cantPedir), xCantCenter, cantY, { align: "center" });

    for (let i = 0; i < layout.codLines.length; i++) {
      doc.text(layout.codLines[i] ?? "", xCodCenter, textStartY + i * CELL_LINE_HEIGHT, {
        align: "center",
      });
    }
    for (let i = 0; i < layout.descLines.length; i++) {
      doc.text(layout.descLines[i] ?? "", xDescCenter, textStartY + i * CELL_LINE_HEIGHT, {
        align: "center",
      });
    }
  }

  drawHeaderRow(y);
  y += ROW_HEIGHT;

  for (let idx = 0; idx < itemsOrdenados.length; idx++) {
    const row = itemsOrdenados[idx];
    const layout = getRowLayout(row);
    if (y + layout.rowHeight > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
      drawHeaderRow(y);
      y += ROW_HEIGHT;
    }
    drawRow(y, idx, row, layout);
    y += layout.rowHeight;
  }

  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
}
