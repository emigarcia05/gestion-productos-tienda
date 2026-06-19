"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Percent } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import ConvertirPdfListaPreciosModal from "@/components/proveedores/ConvertirPdfListaPreciosModal";
import CrearProductoListaPreciosModal from "@/components/proveedores/CrearProductoListaPreciosModal";
import EdicionMasivaListaPreciosModal from "@/components/proveedores/EdicionMasivaListaPreciosModal";
import ExportarListaPreciosButton, {
  type ListaPreciosFiltrosExportSnapshot,
} from "@/components/proveedores/ExportarListaPreciosButton";
import ListaPreciosTablaConFiltros from "@/components/proveedores/ListaPreciosTablaConFiltros";
import { Button } from "@/components/ui/button";
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
  const [reloadNonce, setReloadNonce] = useState(0);
  const [filtrosExportSnapshot, setFiltrosExportSnapshot] =
    useState<ListaPreciosFiltrosExportSnapshot>({
      filtros: null,
      hasFilterActive: false,
      total: 0,
    });

  const handleEdicionSuccess = useCallback(() => {
    setReloadNonce((n) => n + 1);
    router.refresh();
  }, [router]);

  const handleFiltrosExportSnapshotChange = useCallback(
    (snapshot: ListaPreciosFiltrosExportSnapshot) => {
      setFiltrosExportSnapshot(snapshot);
    },
    []
  );

  const p = PERMISOS.listaPrecios;
  const puedeImportar = puede(rol, p.acciones.importarLista);
  const puedeEdicionMasiva = puede(rol, p.acciones.edicionMasiva);
  const puedeGestionarReglas = puede(rol, p.acciones.gestionarReglasDescuentos);

  const actions =
    puedeImportar || puedeEdicionMasiva || puedeGestionarReglas ? (
      <div className="flex items-center gap-2">
        {puedeGestionarReglas && (
          <Button type="button" variant="outline" size="default" className="gap-2 shrink-0" asChild>
            <Link href="/gestion-productos/proveedores/lista-precios/reglas-descuentos">
              <Percent className="h-4 w-4 shrink-0" />
              Reglas Descuentos
            </Link>
          </Button>
        )}
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
            filtrosSnapshot={filtrosExportSnapshot}
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
        onFiltrosExportSnapshotChange={handleFiltrosExportSnapshotChange}
      />
    </ClassicFilteredTableLayout>
  );
}
