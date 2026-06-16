"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import ConvertirPdfListaPreciosModal from "@/components/proveedores/ConvertirPdfListaPreciosModal";
import CrearProductoListaPreciosModal from "@/components/proveedores/CrearProductoListaPreciosModal";
import EdicionMasivaListaPreciosModal from "@/components/proveedores/EdicionMasivaListaPreciosModal";
import ExportarListaPreciosButton, {
  type ListaPreciosFiltrosExportSnapshot,
} from "@/components/proveedores/ExportarListaPreciosButton";
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

interface Props {
  proveedores: ProveedorParaCliente[];
  marcas: MarcaOption[];
  rubros: RubroOption[];
  rol: Rol;
}

export default function ListaPreciosPageClient({
  proveedores,
  marcas,
  rubros,
  rol,
}: Props) {
  const router = useRouter();
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [filtrosExportSnapshot, setFiltrosExportSnapshot] =
    useState<ListaPreciosFiltrosExportSnapshot>({
      filtros: null,
      hasFilterActive: false,
    });

  const handleEdicionSuccess = useCallback(() => {
    setReloadNonce((n) => n + 1);
    router.refresh();
  }, [router]);

  const handleFilteredIdsChange = useCallback((ids: string[]) => {
    setFilteredIds(ids);
  }, []);

  const handleFiltrosExportSnapshotChange = useCallback(
    (snapshot: ListaPreciosFiltrosExportSnapshot) => {
      setFiltrosExportSnapshot(snapshot);
    },
    []
  );

  const p = PERMISOS.listaPrecios;
  const puedeImportar = puede(rol, p.acciones.importarLista);
  const puedeEdicionMasiva = puede(rol, p.acciones.edicionMasiva);

  const actions =
    puedeImportar || puedeEdicionMasiva ? (
      <div className="flex items-center gap-2">
        {puedeImportar && (
          <>
            <ExportarListaPreciosButton snapshot={filtrosExportSnapshot} />
            <CrearProductoListaPreciosModal
              proveedores={proveedores}
              marcas={marcas}
              onSuccess={handleEdicionSuccess}
            />
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
        onFiltrosExportSnapshotChange={handleFiltrosExportSnapshotChange}
      />
    </ClassicFilteredTableLayout>
  );
}
