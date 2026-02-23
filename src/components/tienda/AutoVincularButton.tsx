"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wand2, Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  secret: string;
}

export default function AutoVincularButton({ secret }: Props) {
  const [pending, setPending] = useState(false);
  const [pendingLimpiar, setPendingLimpiar] = useState(false);
  const [progreso, setProgreso] = useState("");

  async function handleLimpiar() {
    if (!confirm("¿Limpiar vínculos múltiples? Para cada item con más de un producto vinculado, se conservará solo el que coincida exactamente con el código externo.")) return;
    setPendingLimpiar(true);
    toast.loading("Limpiando vínculos múltiples...", { id: "limpiar" });
    try {
      const res = await fetch(`/api/auto-vincular-masivo?secret=${encodeURIComponent(secret)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Limpieza completada — ${data.limpiados} vínculos eliminados en ${data.itemsAfectados} items`, { id: "limpiar", duration: 8000 });
        window.location.reload();
      } else {
        toast.error(`Error: ${data.error}`, { id: "limpiar" });
      }
    } catch {
      toast.error("Error de conexión.", { id: "limpiar" });
    } finally {
      setPendingLimpiar(false);
    }
  }

  async function handleAutoVincular() {
    if (!confirm("¿Ejecutar auto-vínculo masivo? Este proceso vincula todos los items de Tienda con productos de Proveedores por código externo. Solo necesitás hacerlo una vez.")) return;

    setPending(true);
    toast.loading("Iniciando auto-vínculo masivo...", { id: "avmasivo", duration: Infinity });

    let offset = 0;
    let totalVinculos = 0;
    let totalProcesados = 0;

    try {
      while (true) {
        const res = await fetch(`/api/auto-vincular-masivo?secret=${encodeURIComponent(secret)}&offset=${offset}`);
        const data = await res.json();

        if (!data.ok) {
          toast.error(`Error: ${data.error}`, { id: "avmasivo" });
          return;
        }

        totalVinculos   += data.vinculosCreados;
        totalProcesados  = data.procesados;
        setProgreso(`${totalProcesados} / ${data.total}`);
        toast.loading(`Auto-vinculando... ${totalProcesados} / ${data.total} items`, { id: "avmasivo", duration: Infinity });

        if (!data.hayMas) break;
        offset = data.siguienteOffset;
      }

      toast.success(
        `Auto-vínculo completado — ${totalProcesados} items procesados, ${totalVinculos} vínculos creados`,
        { id: "avmasivo", duration: 8000 }
      );
      window.location.reload();
    } catch {
      toast.error("Error de conexión.", { id: "avmasivo" });
    } finally {
      setPending(false);
      setProgreso("");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleLimpiar}
        disabled={pendingLimpiar || pending}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {pendingLimpiar
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Scissors className="h-4 w-4" />
        }
        {pendingLimpiar ? "Limpiando..." : "Limpiar vínculos múltiples"}
      </Button>
      <Button
        onClick={handleAutoVincular}
        disabled={pending || pendingLimpiar}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {pending
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Wand2 className="h-4 w-4" />
        }
        {pending
          ? progreso ? `Vinculando ${progreso}...` : "Iniciando..."
          : "Auto-vincular masivo"
        }
      </Button>
    </div>
  );
}
