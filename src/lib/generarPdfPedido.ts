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

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 2) + "…";
}

function fmtFechaNotaPedido(d: Date): string {
  const weekday = d.toLocaleDateString("es-ES", { weekday: "long" });
  const month = d.toLocaleDateString("es-ES", { month: "long" });
  const year = d.getFullYear();
  return `${weekday} de ${month} de ${year}`;
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
  doc.setFontSize(TITLE_FONT_SIZE);
  doc.setFont("helvetica", "normal");
  doc.text("Nota de Pedido", MARGIN, y);
  y += 8;

  // Fecha
  doc.setFontSize(DATE_FONT_SIZE);
  doc.text(`Fecha: ${fmtFechaNotaPedido(new Date())}`, MARGIN, y);
  y += 8;

  if (items.length === 0) {
    doc.text("Sin ítems con cantidad.", MARGIN, y);
    const buf = doc.output("arraybuffer");
    return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
  }

  // Tabla: CANT. - COD. - DESCRIPCION
  const contentWidth = pageWidth - 2 * MARGIN;
  const wCant = 18;
  const wCod = 26;
  const wDesc = contentWidth - wCant - wCod;

  const colCant = MARGIN;
  const colCod = colCant + wCant;
  const colDesc = colCod + wCod;

  doc.setFontSize(HEADER_FONT_SIZE);
  doc.setFont("helvetica", "bold");
  doc.text("CANT.", colCant, y);
  doc.text("COD.", colCod, y);
  doc.text("DESCRIPCION", colDesc, y);
  y += ROW_HEIGHT;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_SIZE);

  for (const row of items) {
    if (y + ROW_HEIGHT > pageHeight - MARGIN) {
      doc.addPage();
      y = MARGIN;
      doc.setFontSize(HEADER_FONT_SIZE);
      doc.setFont("helvetica", "bold");
      doc.text("CANT.", colCant, y);
      doc.text("COD.", colCod, y);
      doc.text("DESCRIPCION", colDesc, y);
      y += ROW_HEIGHT;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FONT_SIZE);
    }
    doc.text(String(row.cantPedir), colCant + wCant - 2, y, { align: "right" });
    doc.text(truncate(row.codProveedor ?? "", 16), colCod, y);
    doc.text(truncate(row.descripcion, MAX_DESC_LEN), colDesc, y);
    y += ROW_HEIGHT;
  }

  const buf = doc.output("arraybuffer");
  return new Uint8Array(buf instanceof ArrayBuffer ? buf : (buf as unknown as ArrayBuffer));
}
