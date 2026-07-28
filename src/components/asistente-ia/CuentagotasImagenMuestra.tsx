"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { ImagePlus, Pipette, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  formatRgbTuple,
  promedioRgbEnPunto,
  rgbToHex,
  type RgbColor,
} from "@/lib/colorMuestraImagen";

const MAX_PREVIEW = 640;
const RADIO_MUESTRA = 8;

export interface MuestraPuntoImagen {
  x: number;
  y: number;
  imagenDataUrl: string;
  imagenNaturalW: number;
  imagenNaturalH: number;
}

export interface CuentagotasImagenMuestraProps {
  color: RgbColor | null;
  onColorChange: (color: RgbColor | null) => void;
  /** Tras un clic válido: color + metadatos de imagen/punto para el PDF. */
  onColorPicked?: (color: RgbColor, meta: MuestraPuntoImagen) => void;
}

export default function CuentagotasImagenMuestra({
  color,
  onColorChange,
  onColorPicked,
}: CuentagotasImagenMuestraProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const clearImagen = useCallback(() => {
    revokeObjectUrl();
    sampleCanvasRef.current = null;
    setPreviewUrl(null);
    setDisplaySize({ w: 0, h: 0 });
    onColorChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onColorChange, revokeObjectUrl]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  function ensureSampleCanvas(img: HTMLImageElement): HTMLCanvasElement | null {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    sampleCanvasRef.current = canvas;
    return canvas;
  }

  function handlePreviewLoad() {
    const img = previewImgRef.current;
    if (!img || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      toast.error("No Se Pudo Leer La Imagen");
      clearImagen();
      return;
    }

    const scale = Math.min(
      1,
      MAX_PREVIEW / img.naturalWidth,
      MAX_PREVIEW / img.naturalHeight,
    );
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    if (!ensureSampleCanvas(img)) {
      toast.error("No Se Pudo Preparar El Cuentagotas");
      clearImagen();
      return;
    }

    setDisplaySize({ w, h });
  }

  function handleFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Archivo No Válido", {
        description: "Elegí una imagen (JPG, PNG, WEBP, etc.).",
      });
      return;
    }

    revokeObjectUrl();
    onColorChange(null);
    sampleCanvasRef.current = null;

    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    setDisplaySize({ w: 0, h: 0 });
  }

  function clientPointToNatural(
    clientX: number,
    clientY: number,
  ): { x: number; y: number } | null {
    const img = previewImgRef.current;
    const nw = img?.naturalWidth ?? 0;
    const nh = img?.naturalHeight ?? 0;
    if (!img || nw <= 0 || nh <= 0) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
      return null;
    }

    return {
      x: (localX / rect.width) * nw,
      y: (localY / rect.height) * nh,
    };
  }

  function handleImageClick(e: ReactMouseEvent<HTMLImageElement>) {
    e.preventDefault();
    const canvas = sampleCanvasRef.current;
    if (!canvas) {
      toast.error("Imagen No Lista", {
        description: "Esperá a que cargue la imagen e intentá de nuevo.",
      });
      return;
    }
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const pt = clientPointToNatural(e.clientX, e.clientY);
    if (!pt) return;

    const sampled = promedioRgbEnPunto(
      ctx,
      pt.x,
      pt.y,
      canvas.width,
      canvas.height,
      RADIO_MUESTRA,
    );
    if (!sampled) {
      toast.error("No Se Pudo Leer El Color");
      return;
    }

    const imagenDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    onColorChange(sampled);
    onColorPicked?.(sampled, {
      x: pt.x,
      y: pt.y,
      imagenDataUrl,
      imagenNaturalW: canvas.width,
      imagenNaturalH: canvas.height,
    });
  }

  const hex = color ? rgbToHex(color) : null;
  const tieneImagen = previewUrl != null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <Button
          type="button"
          className="h-10 px-4"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Abrir Imagen Muestra
        </Button>
        {tieneImagen ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={clearImagen}
          >
            <X className="h-4 w-4" aria-hidden />
            Quitar Imagen
          </Button>
        ) : null}
      </div>

      {tieneImagen ? (
        <>
          <p className="text-sm text-muted-foreground">
            <Pipette className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden />
            Hacé clic en la parte de la imagen donde deseás buscar el color.
          </p>

          <div className="flex flex-wrap items-start gap-4">
            {/* Preview local ObjectURL: next/image no aplica. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={previewImgRef}
              src={previewUrl}
              alt="Imagen muestra para tomar color"
              className="cursor-crosshair rounded-md border border-border object-contain"
              style={
                displaySize.w > 0
                  ? { width: displaySize.w, height: displaySize.h }
                  : { maxWidth: MAX_PREVIEW, maxHeight: MAX_PREVIEW }
              }
              draggable={false}
              onLoad={handlePreviewLoad}
              onError={() => {
                toast.error("No Se Pudo Mostrar La Imagen");
                clearImagen();
              }}
              onClick={handleImageClick}
            />

            <div className="flex min-w-[12rem] flex-col gap-2">
              <p className="text-sm font-medium text-foreground">Color Muestra</p>
              {color && hex ? (
                <>
                  <div
                    className="h-16 w-full rounded-md border border-border"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                  <p className="text-sm tabular-nums text-foreground">
                    RGB: {formatRgbTuple(color)}
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground">
                    HEX: {hex}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin color seleccionado.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
