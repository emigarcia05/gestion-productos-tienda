/**
 * Genera un PDF con el detalle del pedido para envío (p. ej. por WhatsApp).
 * Usa jsPDF en el servidor (Node).
 */
import { jsPDF } from "jspdf";
import type { ItemPedidoParaPdf } from "@/services/pedidosEnvio.service";

const MARGIN = 14;
const ROW_HEIGHT = 7;
const FONT_SIZE = 10;
const HEADER_FONT_SIZE = 9;
const TITLE_FONT_SIZE = 12;
const DATE_FONT_SIZE = 10;
const MAX_DESC_LEN = 55;

const PRIMARY_RGB = { r: 0, g: 114, b: 187 }; // #0072BB
const EVEN_ROW_RGB = { r: 244, g: 248, b: 252 }; // #f4f8fc
const ROW_BORDER_RGB = { r: 224, g: 232, b: 240 }; // #e0e8f0

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 2) + "...";
}

function fmtFechaNotaPedido(d: Date): string {
  const weekday = d.toLocaleDateString("es-ES", { weekday: "long" });
  const month = d.toLocaleDateString("es-ES", { month: "long" });
  const year = d.getFullYear();
  const day = d.getDate();
  return `${weekday} ${day} de ${month} de ${year}`;
}

/**
 * Genera el PDF del pedido y devuelve el buffer (para convertir a base64).
 */
export function generarPdfPedido(
  items: ItemPedidoParaPdf[],
  proveedorNombre: string,
  sucursal: string,
  tiposLabel: string
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210; // A4 portrait mm
  const pageHeight = 297;
  let y = MARGIN;

  // Nota de Pedido
  const headerTopY = y;
  const contentWidth = pageWidth - 2 * MARGIN;
  const lineY = headerTopY + 9;
  const centerX = MARGIN + contentWidth / 2;

  doc.setTextColor(17, 17, 17);
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("Nota de Pedido", centerX, headerTopY, { align: "center" });

  // Fecha (más chico)
  doc.setFontSize(DATE_FONT_SIZE);
  doc.setFont("helvetica", "normal");
  doc.text(fmtFechaNotaPedido(new Date()), centerX, headerTopY + 6, { align: "center" });

  // (Sin línea divisoria: el encabezado de tabla ya separa visualmente)
  y = headerTopY + 17;

  if (items.length === 0) {
    doc.text("Sin ítems con cantidad.", MARGIN, y);
    const buf = doc.output("arraybuffer");
    return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
  }

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

  function drawRow(rowY: number, idx: number, row: ItemPedidoParaPdf) {
    const isEven = idx % 2 === 1; // nth-child(even) en PrintStock -> idx impar
    if (isEven) {
      doc.setFillColor(EVEN_ROW_RGB.r, EVEN_ROW_RGB.g, EVEN_ROW_RGB.b);
      doc.rect(MARGIN, rowY, contentWidth, ROW_HEIGHT, "F");
    }

    doc.setDrawColor(ROW_BORDER_RGB.r, ROW_BORDER_RGB.g, ROW_BORDER_RGB.b);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, rowY + ROW_HEIGHT, MARGIN + contentWidth, rowY + ROW_HEIGHT);

    doc.setTextColor(17, 17, 17);
    doc.setFontSize(FONT_SIZE);
    doc.setFont("helvetica", "normal");

    const textY = rowY + 5;
    doc.text(String(row.cantPedir), xCantCenter, textY, { align: "center" });
    doc.text(truncate(row.codProveedor ?? "", 16), xCodCenter, textY, { align: "center" });
    doc.text(truncate(row.descripcion, MAX_DESC_LEN), xDescCenter, textY, { align: "center" });
  }

  drawHeaderRow(y);
  y += ROW_HEIGHT;

  for (let idx = 0; idx < items.length; idx++) {
    const row = items[idx];
    if (y + ROW_HEIGHT > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
      drawHeaderRow(y);
      y += ROW_HEIGHT;
    }
    drawRow(y, idx, row);
    y += ROW_HEIGHT;
  }

  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
}
