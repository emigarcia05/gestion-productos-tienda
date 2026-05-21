"use client";

import { useCallback, useEffect, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users } from "lucide-react";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import FiltrosCompetenciaPrecios from "@/components/precios-competencia/FiltrosCompetenciaPrecios";
import CompetenciaPreciosTabla from "@/components/precios-competencia/CompetenciaPreciosTabla";
import GestionCompetidoresModal from "@/components/precios-competencia/GestionCompetidoresModal";
import SincronizarCompetenciaModal from "@/components/precios-competencia/SincronizarCompetenciaModal";
import CompetenciaSyncProgresoBanner from "@/components/precios-competencia/CompetenciaSyncProgresoBanner";
import { getCompetenciaPreciosListAction } from "@/actions/competenciaPrecios";
import type { CompetenciaPreciosListResult } from "@/services/competenciaPreciosList.service";

interface Props {
  rol: Rol;
}

export default function CompetenciaPreciosPageClient({ rol }: Props) {
  const puedeEditar = puede(rol, PERMISOS.competenciaPrecios.editar);
  const [gestionOpen, setGestionOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [data, setData] = useState<CompetenciaPreciosListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [marca, setMarca] = useState("");
  const [rubro, setRubro] = useState("");
  const [competenciaId, setCompetenciaId] = useState("");
  const [estadoVinculo, setEstadoVinculo] = useState("");
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCompetenciaPreciosListAction({
        q,
        marca,
        rubro,
        competenciaId: competenciaId || undefined,
        estadoVinculo,
        pagina: String(pagina),
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [q, marca, rubro, competenciaId, estadoVinculo, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleReload = useCallback(() => {
    void cargar();
  }, [cargar]);

  return (
    <ClassicFilteredTableLayout
      title="Precios Competencia"
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
              onClick={() => setSyncOpen(true)}
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              Comparar Precios Competencia
            </Button>
          </div>
        ) : undefined
      }
      filters={
        <div className="flex w-full min-w-0 flex-col gap-0.5">
          {puedeEditar ? <CompetenciaSyncProgresoBanner /> : null}
          <FiltrosCompetenciaPrecios
          q={q}
          marca={marca}
          rubro={rubro}
          competenciaId={competenciaId}
          estadoVinculo={estadoVinculo}
          competencias={data?.competencias ?? []}
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
          onCompetenciaIdChange={(v) => {
            setCompetenciaId(v);
            setPagina(1);
          }}
          onEstadoVinculoChange={(v) => {
            setEstadoVinculo(v);
            setPagina(1);
          }}
          onBuscar={() => void cargar()}
        />
        </div>
      }
    >
      <CompetenciaPreciosTabla
        data={data}
        loading={loading}
        pagina={pagina}
        puedeEditar={puedeEditar}
        onPaginaChange={setPagina}
        onReload={handleReload}
      />
      {puedeEditar && (
        <>
          <GestionCompetidoresModal
            open={gestionOpen}
            onOpenChange={setGestionOpen}
            onChanged={() => void cargar()}
          />
          <SincronizarCompetenciaModal
            open={syncOpen}
            onOpenChange={setSyncOpen}
            onCompletado={() => void cargar()}
          />
        </>
      )}
    </ClassicFilteredTableLayout>
  );
}
