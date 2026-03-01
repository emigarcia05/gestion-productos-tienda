"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import SectionHeader from "@/components/SectionHeader";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import EdicionMasivaListaPreciosModal from "@/components/proveedores/EdicionMasivaListaPreciosModal";
import ListaPreciosTablaConFiltros from "@/components/proveedores/ListaPreciosTablaConFiltros";
import type { FilaListaPrecioParaCliente } from "@/services/listaPrecios.service";
import { PERMISOS, puede, type Rol } from "@/lib/permisos";

interface ProveedorParaCliente {
  id: string;
  nombre: string;
  prefijo: string;
  codigoUnico: string;
}

interface Props {
  filas: FilaListaPrecioParaCliente[];
  proveedores: ProveedorParaCliente[];
  rol: Rol;
}

export default function ListaPreciosPageClient({ filas, proveedores, rol }: Props) {
  const router = useRouter();
  const [filteredIds, setFilteredIds] = useState<string[]>([]);

  const handleFilteredIdsChange = useCallback((ids: string[]) => {
    setFilteredIds(ids);
  }, []);

  const p = PERMISOS.listaPrecios;
  const puedeImportar = puede(rol, p.acciones.importarLista);
  const puedeEdicionMasiva = puede(rol, p.acciones.edicionMasiva);

  const acciones =
    puedeImportar || puedeEdicionMasiva ? (
      <div className="flex items-center gap-2">
        {puedeImportar && <ImportarListaPreciosModal proveedores={proveedores} />}
        {puedeEdicionMasiva && (
          <EdicionMasivaListaPreciosModal
            filteredIds={filteredIds}
            onSuccess={() => router.refresh()}
          />
        )}
      </div>
    ) : undefined;

  return (
    <>
      <SectionHeader
        titulo="Lista Proveedores"
        subtitulo="Lista Px Proveedores"
        actions={acciones}
        compact
      />
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-1.5">
        <ListaPreciosTablaConFiltros
          filas={filas}
          proveedores={proveedores}
          onFilteredIdsChange={handleFilteredIdsChange}
        />
      </div>
    </>
  );
}
