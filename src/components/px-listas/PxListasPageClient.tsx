"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Users } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { Button } from "@/components/ui/button";
import ExportarPxButton from "@/components/px-listas/ExportarPxButton";
import FiltrosPxListas from "@/components/px-listas/FiltrosPxListas";
import TablaPxListas from "@/components/px-listas/TablaPxListas";
import ListaCompetidoresPxListas from "@/components/px-listas/ListaCompetidoresPxListas";
import GestionCompetidoresModal from "@/components/precios-competencia/GestionCompetidoresModal";
import SincronizarCompetenciaModal from "@/components/precios-competencia/SincronizarCompetenciaModal";
import CompetenciaSyncProgresoBanner from "@/components/precios-competencia/CompetenciaSyncProgresoBanner";
import { PAGE_SIZE } from "@/lib/pagination";
import type {
  FiltroPxPromedioPxListas,
  OrdenMarcacionPxListas,
} from "@/lib/pxListasFiltros";
import type { ItemPxListasParaTabla } from "@/lib/pxListas";
import type { CompetidorFiltroPxListas } from "@/services/pxListasPage.service";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

const BASE_PATH = "/gestion-productos/tienda/cx-px-tienda";

interface Props {
  items: ItemPxListasParaTabla[];
  total: number;
  totalPaginas: number;
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  competidores: CompetidorFiltroPxListas[];
  competencias: CompetenciaParaCliente[];
  rol: Rol;
  q: string;
  rubro: string;
  marca: string;
  detPrecio: string;
  filtroPxPromedio: FiltroPxPromedioPxListas;
  ordenMarcacion: OrdenMarcacionPxListas;
  paginaNum: number;
}

export default function PxListasPageClient({
  items,
  total,
  totalPaginas,
  marcas,
  rubros,
  competidores,
  competencias,
  rol,
  q,
  rubro,
  marca,
  detPrecio,
  filtroPxPromedio,
  ordenMarcacion,
  paginaNum,
}: Props) {
  const router = useRouter();
  const [gestionCompetidoresOpen, setGestionCompetidoresOpen] = useState(false);
  const [syncCompetenciaOpen, setSyncCompetenciaOpen] = useState(false);
  const puedeEditar = puede(rol, PERMISOS.cxPxTienda.acceso);
  const puedeEditarEnlaces = puede(rol, PERMISOS.competenciaPrecios.editar);
  const puedeGestionarCompetidores = puede(rol, PERMISOS.competenciaPrecios.editar);

  const headerActions =
    puedeEditar || puedeGestionarCompetidores ? (
      <div className="flex flex-wrap items-center justify-end gap-2">
        {puedeGestionarCompetidores ? (
          <>
            <Button
              type="button"
              variant="default"
              className="btn-primario-gestion gap-2 shrink-0"
              onClick={() => setGestionCompetidoresOpen(true)}
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              Gestionar Competidores
            </Button>
            <Button
              type="button"
              variant="default"
              className="btn-primario-gestion gap-2 shrink-0"
              onClick={() => setSyncCompetenciaOpen(true)}
            >
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              Comparar Precios Competencia
            </Button>
          </>
        ) : null}
        {puedeEditar ? <ExportarPxButton /> : null}
      </div>
    ) : undefined;
  const filters = (
    <div className="flex w-full min-w-0 flex-col gap-0.5">
      {puedeGestionarCompetidores ? <CompetenciaSyncProgresoBanner /> : null}
      <FiltrosPxListas
        marcas={marcas.map((m) => m.marca)}
        rubros={rubros.map((r) => r.rubro)}
        competidores={competidores}
        totalItems={total}
        qActual={q}
        marcaActual={marca}
        rubroActual={rubro}
        detPrecioActual={detPrecio}
        filtroPxPromedioActual={filtroPxPromedio}
        ordenMarcacionActual={ordenMarcacion}
      />
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout
        title="Px Listas"
        filters={filters}
        actions={headerActions}
        contentWidth="full"
      >
        <div className="flex h-full min-h-0 flex-1 gap-3">
          <ListaCompetidoresPxListas
            competencias={competencias}
            puedeActualizar={puedeGestionarCompetidores}
            onActualizado={() => router.refresh()}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-0.5">
            <div className="contenedor-tabla-gestion no-scroll-x min-h-0 flex-1">
              <TablaPxListas
                items={items}
                competencias={competencias}
                puedeEditar={puedeEditar}
                puedeEditarEnlaces={puedeEditarEnlaces}
              />
            </div>
            {totalPaginas > 1 ? (
              <div className="flex shrink-0 justify-end pt-2">
                <PaginacionTabla
                  basePath={BASE_PATH}
                  params={{ q, rubro, marca, detPrecio, filtroPxPromedio, ordenMarcacion }}
                  paginaActual={paginaNum}
                  totalPaginas={totalPaginas}
                  total={total}
                  pageSize={PAGE_SIZE}
                />
              </div>
            ) : null}
          </div>
        </div>
      </ClassicFilteredTableLayout>
      {puedeGestionarCompetidores ? (
        <>
          <GestionCompetidoresModal
            open={gestionCompetidoresOpen}
            onOpenChange={setGestionCompetidoresOpen}
            onChanged={() => router.refresh()}
          />
          <SincronizarCompetenciaModal
            open={syncCompetenciaOpen}
            onOpenChange={setSyncCompetenciaOpen}
            onCompletado={() => router.refresh()}
          />
        </>
      ) : null}
    </div>
  );
}
