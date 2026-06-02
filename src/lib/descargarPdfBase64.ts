/** Descarga en el navegador un PDF desde bytes (p. ej. jsPDF en cliente). */
export function descargarPdfBytes(bytes: Uint8Array, filename: string): void {
  if (!bytes?.length) {
    throw new Error("PDF vacío.");
  }
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Descarga en el navegador un PDF representado en base64 (mismo patrón que Generar Pedido). */
export function descargarPdfBase64(base64: string, filename: string): void {
  if (!base64?.trim()) {
    throw new Error("PDF vacío.");
  }
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  descargarPdfBytes(bytes, filename);
}
