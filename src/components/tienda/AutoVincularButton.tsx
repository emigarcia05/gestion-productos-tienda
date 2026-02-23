"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  secret: string;
}

export default function AutoVincularButton({ secret }: Props) {
  const [pending, setPending] = useState(false);
  const [progreso, setProgreso] = useState("");

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
    <Button
      onClick={handleAutoVincular}
      disabled={pending}
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
  );
}
