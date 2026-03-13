"use client";

import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import SugeridosTablaConFiltros from "@/components/proveedores/SugeridosTablaConFiltros";
import { getListaPreciosConOpcionesAction } from "@/actions/listaPrecios";

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

interface Props {
  proveedores: ProveedorParaCliente[];
  marcas: MarcaOption[];
}

export default function SugeridosPageClient({ proveedores, marcas }: Props) {
  return (
    <ClassicFilteredTableLayout
      title="Lista Proveedores"
      subtitle="Px. Vta. Sugeridos"
    >
      <SugeridosTablaConFiltros
        proveedores={proveedores}
        marcas={marcas}
        fetchListaPreciosConOpcionesAction={getListaPreciosConOpcionesAction}
      />
    </ClassicFilteredTableLayout>
  );
}
