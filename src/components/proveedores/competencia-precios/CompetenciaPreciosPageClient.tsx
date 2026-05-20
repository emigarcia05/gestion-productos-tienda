"use client";

import { useCallback, useEffect, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users } from "lucide-react";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import FiltrosCompetenciaPrecios from "@/components/proveedores/competencia-precios/FiltrosCompetenciaPrecios";
import CompetenciaPreciosTabla from "@/components/proveedores/competencia-precios/CompetenciaPreciosTabla";
import GestionCompetidoresModal from "@/components/proveedores/competencia-precios/GestionCompetidoresModal";
import { getCompetenciaPreciosListAction } from "@/actions/competenciaPrecios";
import type { CompetenciaPreciosListResult } from "@/services/competenciaPreciosList.service";

interface Props {
  rol: Rol;
}

export default function CompetenciaPreciosPageClient({ rol }: Props) {
  const puedeEditar = puede(rol, PERMISOS.competenciaPrecios.editar);
  const [gestionOpen, setGestionOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<CompetenciaPreciosListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [marca, setMarca] = useState("");
  const [rubro, setRubro] = useState("");
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCompetenciaPreciosListAction({
        q,
        marca,
        rubro,
        pagina: String(pagina),
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [q, marca, rubro, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleReload = useCallback(() => {
    void cargar();
  }, [cargar]);

  const handleSync = async () => {
    if (syncing) return;
    if (!data?.competencias.length) {
      toast.error("Registrá al menos un competidor antes de sincronizar.");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/sync-competencia-precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        encontrados?: number;
        vacios?: number;
      };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "No se pudo sincronizar precios de competencia.");
        return;
      }
      toast.success(
        `Sincronización finalizada. Encontrados: ${json.encontrados ?? 0}. Sin precio: ${json.vacios ?? 0}.`
      );
      await cargar();
    } catch {
      toast.error("Error de red al sincronizar.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ClassicFilteredTableLayout
      title="Lista Proveedores"
      subtitle="Comp. Competencia"
      contentWidth="full"
      actions={
        puedeEditar ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => setGestionOpen(true)}
            >
              <Users className="h-4 w-4 shrink-0" />
              Gestionar Competidores
            </Button>
            <Button
              type="button"
              variant="default"
              className="btn-primario-gestion gap-2"
              disabled={syncing}
              onClick={() => void handleSync()}
            >
              <RefreshCw className={cn("h-4 w-4 shrink-0", syncing && "animate-spin")} />
              Actualizar Precios Competencia
            </Button>
          </div>
        ) : undefined
      }
      filters={
        <FiltrosCompetenciaPrecios
          q={q}
          marca={marca}
          rubro={rubro}
          marcasDisponibles={data?.marcasDisponibles ?? []}
          rubrosDisponibles={data?.rubrosDisponibles ?? []}
          total={data?.total ?? 0}
          loading={loading}
          onQChange={(v) => {
            setQ(v);
            setPagina(1);
          }}
          onMarcaChange={(v) => {
            setMarca(v);
            setPagina(1);
          }}
          onRubroChange={(v) => {
            setRubro(v);
            setPagina(1);
          }}
          onBuscar={() => void cargar()}
        />
      }
    >
      <CompetenciaPreciosTabla
        data={data}
        loading={loading}
        pagina={pagina}
        onPaginaChange={setPagina}
        onReload={handleReload}
      />
      {puedeEditar && (
        <GestionCompetidoresModal
          open={gestionOpen}
          onOpenChange={setGestionOpen}
          onChanged={() => void cargar()}
        />
      )}
    </ClassicFilteredTableLayout>
  );
}
