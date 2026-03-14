"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import EdicionMasivaListaPreciosModal from "@/components/proveedores/EdicionMasivaListaPreciosModal";
import ListaPreciosTablaConFiltros from "@/components/proveedores/ListaPreciosTablaConFiltros";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";

interface ProveedorParaCliente {
  id: string;
  nombre: string;
  prefijo: string;
  codigoUnico: string;
}

interface MarcaOption {
  id: string;
  nombre: string;
}

interface RubroOption {
  id: string;
  nombre: string;
}

type FetchListaPreciosConOpcionesAction = (
  proveedorId: string | undefined,
  marcaNombre: string | undefined,
  rubroNombre: string | undefined,
  busqueda: string | undefined,
  habilitado: boolean | undefined,
  opciones?: { soloPxSugerido?: boolean },
  pagina?: number
) => Promise<{
  filas: FilaListaPrecioParaCliente[];
  total: number;
  totalPaginas: number;
  proveedoresDisponibles: { id: string; nombre: string; prefijo: string }[];
  marcasDisponibles: { id: string; nombre: string }[];
  rubrosDisponibles: { id: string; nombre: string }[];
}>;

interface Props {
  proveedores: ProveedorParaCliente[];
  marcas: MarcaOption[];
  rubros: RubroOption[];
  rol: Rol;
  fetchListaPreciosConOpcionesAction: FetchListaPreciosConOpcionesAction;
}

export default function ListaPreciosPageClient({
  proveedores,
  marcas,
  rubros,
  rol,
  fetchListaPreciosConOpcionesAction,
}: Props) {
  const router = useRouter();
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  const handleFilteredIdsChange = useCallback((ids: string[]) => {
    setFilteredIds(ids);
  }, []);

  const p = PERMISOS.listaPrecios;
  const puedeImportar = puede(rol, p.acciones.importarLista);
  const puedeEdicionMasiva = puede(rol, p.acciones.edicionMasiva);

  const actions =
    puedeImportar || puedeEdicionMasiva ? (
      <div className="flex items-center gap-2">
        {puedeImportar && <ImportarListaPreciosModal proveedores={proveedores} />}
        {puedeEdicionMasiva && (
          <EdicionMasivaListaPreciosModal
            filteredIds={filteredIds}
            marcas={marcas}
            rubros={rubros}
            onSuccess={() => router.refresh()}
          />
        )}
      </div>
    ) : undefined;

  return (
    <ClassicFilteredTableLayout
      title="Lista Proveedores"
      subtitle="Lista Precios"
      actions={actions}
    >
      <ListaPreciosTablaConFiltros
        proveedores={proveedores}
        marcas={marcas}
        onFilteredIdsChange={handleFilteredIdsChange}
        fetchListaPreciosConOpcionesAction={fetchListaPreciosConOpcionesAction}
      />
    </ClassicFilteredTableLayout>
  );
}
