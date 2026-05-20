"use client";

import { useCallback, useEffect, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Users } from "lucide-react";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import FiltrosCompetenciaPrecios from "@/components/proveedores/competencia-precios/FiltrosCompetenciaPrecios";
import CompetenciaPreciosTabla from "@/components/proveedores/competencia-precios/CompetenciaPreciosTabla";
import GestionCompetidoresModal from "@/components/proveedores/competencia-precios/GestionCompetidoresModal";
import SincronizarCompetenciaModal from "@/components/proveedores/competencia-precios/SincronizarCompetenciaModal";
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
              onClick={() => setSyncOpen(true)}
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              Comparar Precios Competencia
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
