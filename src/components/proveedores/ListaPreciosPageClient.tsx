"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import ConvertirPdfListaPreciosModal from "@/components/proveedores/ConvertirPdfListaPreciosModal";
import EdicionMasivaListaPreciosModal from "@/components/proveedores/EdicionMasivaListaPreciosModal";
import ListaPreciosTablaConFiltros from "@/components/proveedores/ListaPreciosTablaConFiltros";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

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

import type { ListaPreciosConOpcionesResult, ListaPreciosFiltrosLecturaInput } from "@/actions/listaPrecios";

type FetchListaPreciosConOpcionesAction = (
  params: ListaPreciosFiltrosLecturaInput
) => Promise<ListaPreciosConOpcionesResult>;

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
  const [reloadNonce, setReloadNonce] = useState(0);

  const handleEdicionSuccess = useCallback(() => {
    setReloadNonce((n) => n + 1);
    router.refresh();
  }, [router]);

  const handleFilteredIdsChange = useCallback((ids: string[]) => {
    setFilteredIds(ids);
  }, []);

  const p = PERMISOS.listaPrecios;
  const puedeImportar = puede(rol, p.acciones.importarLista);
  const puedeEdicionMasiva = puede(rol, p.acciones.edicionMasiva);

  const actions =
    puedeImportar || puedeEdicionMasiva ? (
      <div className="flex items-center gap-2">
        {puedeImportar && (
          <>
            <ImportarListaPreciosModal proveedores={proveedores} />
            <ConvertirPdfListaPreciosModal proveedores={proveedores} />
          </>
        )}
        {puedeEdicionMasiva && (
          <EdicionMasivaListaPreciosModal
            filteredIds={filteredIds}
            marcas={marcas}
            rubros={rubros}
            onSuccess={handleEdicionSuccess}
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
        rubros={rubros}
        puedeEdicionMasiva={puedeEdicionMasiva}
        reloadNonce={reloadNonce}
        onEdicionSuccess={handleEdicionSuccess}
        onFilteredIdsChange={handleFilteredIdsChange}
        fetchListaPreciosConOpcionesAction={fetchListaPreciosConOpcionesAction}
      />
    </ClassicFilteredTableLayout>
  );
}
