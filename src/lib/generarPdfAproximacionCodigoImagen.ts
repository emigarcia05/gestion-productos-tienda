/**
 * PDF cliente: aproximación de código Alba desde imagen + respuesta IA.
 */
import { jsPDF } from "jspdf";
import type { RgbColor } from "@/lib/colorMuestraImagen";
import { formatRgbTuple, rgbToHex } from "@/lib/colorMuestraImagen";
import type { CoincidenciaAlbaPdf } from "@/lib/parseRespuestaIaCoincidencias";

const PRIMARY = { r: 0, g: 114, b: 187 }; // #0072BB
const TITLE =
  "Aproximación de código desde una imagen digital" as const;

export interface MuestraColorPdf {
  color: RgbColor;
  /** Coordenadas en píxeles del bitmap original. */
  x: number;
  y: number;
}

export interface InformeAproximacionCodigoImagen {
  /** data URL JPEG/PNG de la imagen original (sin anotar). */
  imagenDataUrl: string;
  imagenNaturalW: number;
  imagenNaturalH: number;
  muestra: MuestraColorPdf;
  coincidencias: CoincidenciaAlbaPdf[];
}

function hexToRgb(hex: string): RgbColor {
  const h = hex.replace(/^#/, "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Compone la imagen con recuadro de muestra, flecha y swatch RGB a la derecha.
 * Solo navegador (canvas).
 */
export function componerImagenConMuestra(
  imagenDataUrl: string,
  naturalW: number,
  naturalH: number,
  muestra: MuestraColorPdf,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const padRight = Math.max(160, Math.round(naturalW * 0.28));
      const canvas = document.createElement("canvas");
      canvas.width = naturalW + padRight;
      canvas.height = naturalH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear el canvas del PDF."));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, naturalW, naturalH);

      const box = Math.max(12, Math.round(Math.min(naturalW, naturalH) * 0.04));
      const bx = Math.max(0, Math.min(naturalW - box, muestra.x - box / 2));
      const by = Math.max(0, Math.min(naturalH - box, muestra.y - box / 2));

      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(2, Math.round(box / 8));
      ctx.strokeRect(bx, by, box, box);

      const swatch = Math.max(56, Math.round(Math.min(naturalW, naturalH) * 0.12));
      const sx = naturalW + Math.round((padRight - swatch) / 2);
      const sy = Math.max(8, Math.min(naturalH - swatch - 40, muestra.y - swatch / 2));

      const fromX = bx + box;
      const fromY = by + box / 2;
      const toX = sx;
      const toY = sy + swatch / 2;

      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(2, Math.round(box / 10));
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      // Flecha simple
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const ah = Math.max(8, box * 0.6);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - ah * Math.cos(angle - Math.PI / 6),
        toY - ah * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        toX - ah * Math.cos(angle + Math.PI / 6),
        toY - ah * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = "#0072BB";
      ctx.fill();

      const hex = rgbToHex(muestra.color);
      ctx.fillStyle = hex;
      ctx.fillRect(sx, sy, swatch, swatch);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx, sy, swatch, swatch);

      ctx.fillStyle = "#0f172a";
      ctx.font = `${Math.max(11, Math.round(swatch * 0.22))}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(formatRgbTuple(muestra.color), sx + swatch / 2, sy + swatch + 18);
      ctx.fillText(hex, sx + swatch / 2, sy + swatch + 34);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para el PDF."));
    img.src = imagenDataUrl;
  });
}

export function generarPdfAproximacionCodigoImagen(
  informe: InformeAproximacionCodigoImagen,
  imagenAnotadaDataUrl: string,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  const titleLines = doc.splitTextToSize(TITLE, pageW - margin * 2);
  doc.text(titleLines, pageW / 2, y, { align: "center" });
  y += titleLines.length * 7 + 6;

  const maxImgW = pageW - margin * 2;
  const maxImgH = 110;
  const natW = informe.imagenNaturalW + Math.max(160, Math.round(informe.imagenNaturalW * 0.28));
  const natH = informe.imagenNaturalH;
  const scale = Math.min(maxImgW / natW, maxImgH / natH);
  const drawW = natW * scale;
  const drawH = natH * scale;
  const imgX = margin + (maxImgW - drawW) / 2;

  doc.addImage(imagenAnotadaDataUrl, "JPEG", imgX, y, drawW, drawH);
  y += drawH + 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Coincidencias más cercanas", margin, y);
  y += 6;

  const rowH = 14;
  const sw = 12;
  const colSwatch = margin;
  const colNombre = margin + sw + 6;
  const colCodigo = margin + 85;
  const colSim = margin + 140;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("COLOR", colSwatch, y);
  doc.text("NOMBRE", colNombre, y);
  doc.text("CÓDIGO", colCodigo, y);
  doc.text("APROX. DIGITAL", colSim, y);
  y += 4;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const filas = [...informe.coincidencias];
  while (filas.length < 5) {
    filas.push({ nombre: "—", codigo: "—", similitud: "—", hex: null });
  }

  for (let i = 0; i < 5; i += 1) {
    const row = filas[i]!;
    if (y + rowH > doc.internal.pageSize.getHeight() - 14) {
      doc.addPage();
      y = 16;
    }

    const fill = row.hex ? hexToRgb(row.hex) : null;
    if (fill) {
      doc.setFillColor(fill.r, fill.g, fill.b);
      doc.rect(colSwatch, y - 3, sw, sw, "F");
    } else {
      doc.setFillColor(248, 250, 252);
      doc.rect(colSwatch, y - 3, sw, sw, "F");
    }
    doc.setDrawColor(148, 163, 184);
    doc.rect(colSwatch, y - 3, sw, sw, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const nombreLines = doc.splitTextToSize(row.nombre, colCodigo - colNombre - 4);
    doc.text(nombreLines, colNombre, y + 2);
    doc.text(row.codigo, colCodigo, y + 2);
    doc.text(row.similitud, colSim, y + 2);

    y += Math.max(rowH, nombreLines.length * 4 + 6);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
