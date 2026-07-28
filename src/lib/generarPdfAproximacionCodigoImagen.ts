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

/** Aviso legal / comercial bajo las coincidencias (pie del informe). */
export const DISCLAIMER_APROXIMACION_CODIGO =
  "La elección es una comparación digital de colores con el taco digital de Alba. Debe tomarse como una aproximación y referencia del color. El color final en pintura puede variar. Para una mayor aproximación es recomendable acercarse a alguno de nuestros locales para ver el taco en persona.";

export interface LogoTiendaColorPdf {
  dataUrl: string;
  naturalW: number;
  naturalH: number;
}

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
 * Compone la imagen (a la izquierda) con recuadro de muestra, flecha y
 * swatch grande (~30% del lado menor de la foto) + RGB/HEX legibles.
 * Solo navegador (canvas).
 */
export interface ImagenAnotadaPdf {
  dataUrl: string;
  width: number;
  height: number;
}

export function componerImagenConMuestra(
  imagenDataUrl: string,
  naturalW: number,
  naturalH: number,
  muestra: MuestraColorPdf,
): Promise<ImagenAnotadaPdf> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ladoMenor = Math.min(naturalW, naturalH);
      const swatch = Math.max(96, Math.round(ladoMenor * 0.3));
      const gapFlecha = Math.max(28, Math.round(swatch * 0.2));
      const panelPadX = Math.max(16, Math.round(swatch * 0.12));
      const fontSize = Math.max(18, Math.round(swatch * 0.2));
      const lineGap = Math.round(fontSize * 1.35);
      const textBlockH = lineGap * 2 + Math.round(fontSize * 0.6);
      const panelPadBottom = Math.max(12, Math.round(swatch * 0.08));

      const padRight = gapFlecha + swatch + panelPadX * 2;
      const canvasW = naturalW + padRight;
      const minHForSwatch = panelPadBottom + swatch + textBlockH + panelPadBottom;
      const canvasH = Math.max(naturalH, minHForSwatch);

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear el canvas del PDF."));
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Foto pegada a la izquierda (sin margen).
      const imgY = Math.round((canvasH - naturalH) / 2);
      ctx.drawImage(img, 0, imgY, naturalW, naturalH);

      const box = Math.max(14, Math.round(ladoMenor * 0.035));
      const bx = Math.max(0, Math.min(naturalW - box, muestra.x - box / 2));
      const by = Math.max(
        0,
        Math.min(naturalH - box, muestra.y - box / 2),
      );

      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(2, Math.round(box / 7));
      ctx.strokeRect(bx, by + imgY, box, box);

      const sx = naturalW + gapFlecha;
      const syMax = canvasH - swatch - textBlockH - panelPadBottom;
      const sy = Math.max(
        panelPadBottom,
        Math.min(syMax, imgY + muestra.y - swatch / 2),
      );

      const fromX = bx + box;
      const fromY = by + imgY + box / 2;
      const toX = sx;
      const toY = sy + swatch / 2;

      ctx.strokeStyle = "#0072BB";
      ctx.lineWidth = Math.max(3, Math.round(swatch * 0.025));
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      const ah = Math.max(12, Math.round(swatch * 0.12));
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
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = Math.max(2, Math.round(swatch * 0.02));
      ctx.strokeRect(sx, sy, swatch, swatch);

      ctx.fillStyle = "#0f172a";
      ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const textX = sx + swatch / 2;
      const textY = sy + swatch + Math.round(fontSize * 0.35);
      ctx.fillText(formatRgbTuple(muestra.color), textX, textY);
      ctx.fillText(hex, textX, textY + lineGap);

      resolve({
        dataUrl: canvas.toDataURL("image/jpeg", 0.92),
        width: canvasW,
        height: canvasH,
      });
    };
    img.onerror = () =>
      reject(new Error("No se pudo cargar la imagen para el PDF."));
    img.src = imagenDataUrl;
  });
}

export function generarPdfAproximacionCodigoImagen(
  informe: InformeAproximacionCodigoImagen,
  imagenAnotada: ImagenAnotadaPdf,
  logo?: LogoTiendaColorPdf | null,
): Uint8Array {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  const titleLines = doc.splitTextToSize(TITLE, pageW - margin * 2);
  doc.text(titleLines, pageW / 2, y, { align: "center" });
  y += titleLines.length * 7 + 6;

  const maxImgW = pageW - margin * 2;
  const maxImgH = 125;
  const scale = Math.min(
    maxImgW / imagenAnotada.width,
    maxImgH / imagenAnotada.height,
  );
  const drawW = imagenAnotada.width * scale;
  const drawH = imagenAnotada.height * scale;
  const imgX = margin;

  doc.addImage(imagenAnotada.dataUrl, "JPEG", imgX, y, drawW, drawH);
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
    filas.push({ nombre: "—", codigo: "—", similitud: "—", rgb: null, hex: null });
  }

  for (let i = 0; i < 5; i += 1) {
    const row = filas[i]!;
    if (y + rowH > pageH - 14) {
      doc.addPage();
      y = 16;
    }

    const fill =
      row.rgb ?? (row.hex ? hexToRgb(row.hex) : null);
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

  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const disclaimerLines = doc.splitTextToSize(
    DISCLAIMER_APROXIMACION_CODIGO,
    pageW - margin * 2,
  );
  const disclaimerH = disclaimerLines.length * 4.2;
  const logoMaxW = 48;
  const logoH =
    logo && logo.naturalW > 0
      ? (logoMaxW * logo.naturalH) / logo.naturalW
      : 0;
  const footerBlockH = disclaimerH + (logo ? 10 + logoH : 0);

  if (y + footerBlockH > pageH - margin) {
    doc.addPage();
    y = 16;
  }

  doc.text(disclaimerLines, margin, y);
  y += disclaimerH + 8;

  if (logo?.dataUrl && logo.naturalW > 0) {
    const logoW = logoMaxW;
    const drawnLogoH = (logoW * logo.naturalH) / logo.naturalW;
    const bottomLogoY = pageH - margin - drawnLogoH;
    const logoY = Math.max(y, bottomLogoY);
    const logoX = (pageW - logoW) / 2;
    const format = logo.dataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
    doc.addImage(logo.dataUrl, format, logoX, logoY, logoW, drawnLogoH);
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
