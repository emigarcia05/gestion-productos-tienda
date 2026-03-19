"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generarPdfEnviarPedidoAction } from "@/actions/pedidos";

interface Props {
  proveedorId: string;
  sucursal: string;
  tipos: string[];
}

function descargarPdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EnviarPedidoButton({
  proveedorId,
  sucursal,
  tipos,
}: Props) {
  const [loading, setLoading] = useState(false);

  const puedeEnviar = proveedorId && sucursal && tipos.length > 0;

  async function handleClick() {
    if (!puedeEnviar) {
      toast.error("Seleccioná proveedor, sucursal y tipo(s) de pedido.");
      return;
    }
    setLoading(true);
    try {
      const result = await generarPdfEnviarPedidoAction({
        proveedorId,
        sucursal,
        tipos,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { pdfBase64, filename, sentViaWhatsApp } = result.data!;
      if (sentViaWhatsApp) {
        toast.success("Pedido generado y enviado al proveedor.");
        return;
      }
      descargarPdf(pdfBase64, filename);
      toast.success(`PDF generado: ${filename}`);
    } finally {
      setLoading(false);
    }
  }

  if (!puedeEnviar) return null;

  return (
    <Button
      type="button"
      variant="default"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      Generar Pedido
    </Button>
  );
}
