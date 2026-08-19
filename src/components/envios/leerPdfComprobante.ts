"use client";

import { toast } from "sonner";
import { ENVIOS_PDF_MAX_BYTES } from "@/lib/envios";

export async function leerPdfComprobante(
  file: File
): Promise<{ nombre: string; base64: string } | null> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    toast.error("El archivo debe ser un PDF.");
    return null;
  }
  if (file.size > ENVIOS_PDF_MAX_BYTES) {
    toast.error("El PDF supera el tamaño máximo (5 MB).");
    return null;
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return { nombre: file.name, base64: btoa(binary) };
}
