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
const MAX_DESC_LEN = 50;

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 2) + "…";
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

  doc.setFontSize(12);
  doc.text("Pedido de mercadería", MARGIN, y);
  y += 8;

  doc.setFontSize(FONT_SIZE);
  doc.text(`Proveedor: ${proveedorNombre}`, MARGIN, y);
  y += 6;
  doc.text(`Sucursal: ${sucursal}`, MARGIN, y);
  y += 6;
  doc.text(`Tipos: ${tiposLabel}`, MARGIN, y);
  y += 10;

  if (items.length === 0) {
    doc.text("Sin ítems con cantidad.", MARGIN, y);
    const buf = doc.output("arraybuffer");
    return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
  }

  const colCod = MARGIN;
  const colDesc = colCod + 28;
  const colCant = pageWidth - MARGIN - 18;

  doc.setFontSize(HEADER_FONT_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("Código", colCod, y);
  doc.text("Descripción", colDesc, y);
  doc.text("Cant.", colCant, y);
  y += ROW_HEIGHT;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZE);

  for (const row of items) {
    if (y + ROW_HEIGHT > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
      doc.setFontSize(HEADER_FONT_SIZE);
      doc.setFont("helvetica", "bold");
      doc.text("Código", colCod, y);
      doc.text("Descripción", colDesc, y);
      doc.text("Cant.", colCant, y);
      y += ROW_HEIGHT;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FONT_SIZE);
    }
    doc.text(truncate(row.codExt, 16), colCod, y);
    doc.text(truncate(row.descripcion, MAX_DESC_LEN), colDesc, y);
    doc.text(String(row.cantPedir), colCant, y);
    y += ROW_HEIGHT;
  }

  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
}
