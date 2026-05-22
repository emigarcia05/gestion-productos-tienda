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
  const [difPromedio, setDifPromedio] = useState("");
  const [provCaroCompetenciaId, setProvCaroCompetenciaId] = useState("");
  const [provBaratoCompetenciaId, setProvBaratoCompetenciaId] = useState("");
  const [configurado, setConfigurado] = useState("");
  const [pagina, setPagina] = useState(1);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCompetenciaPreciosListAction({
        q,
        difPromedio,
        provCaroCompetenciaId: provCaroCompetenciaId || undefined,
        provBaratoCompetenciaId: provBaratoCompetenciaId || undefined,
        configurado,
        pagina: String(pagina),
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [q, difPromedio, provCaroCompetenciaId, provBaratoCompetenciaId, configurado, pagina]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const handleReload = useCallback(() => {
    void cargar();
  }, [cargar]);

  return (
    <ClassicFilteredTableLayout
      title="Px Competencia"
      actions={
        puedeEditar ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              className="btn-primario-gestion gap-2"
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
            difPromedio={difPromedio}
            provCaroCompetenciaId={provCaroCompetenciaId}
            provBaratoCompetenciaId={provBaratoCompetenciaId}
            configurado={configurado}
            competencias={data?.competencias ?? []}
            total={data?.total ?? 0}
            loading={loading}
            onQChange={(v) => {
              setQ(v);
              setPagina(1);
            }}
            onDifPromedioChange={(v) => {
              setDifPromedio(v);
              setPagina(1);
            }}
            onProvCaroCompetenciaIdChange={(v) => {
              setProvCaroCompetenciaId(v);
              setPagina(1);
            }}
            onProvBaratoCompetenciaIdChange={(v) => {
              setProvBaratoCompetenciaId(v);
              setPagina(1);
            }}
            onConfiguradoChange={(v) => {
              setConfigurado(v);
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
