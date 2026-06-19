"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearEditarReglaDescuentoListaPrecioModal from "@/components/proveedores/CrearEditarReglaDescuentoListaPrecioModal";
import EliminarReglaDescuentoListaPrecioModal from "@/components/proveedores/EliminarReglaDescuentoListaPrecioModal";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyTableRow,
} from "@/components/ui/table";
import {
  listarReglasDescuentosListaPrecioAction,
  listarCatalogosReglasDescuentosAction,
  type ReglaDescuentoListaPrecio,
  type CatalogosReglasDescuentosListaPrecio,
} from "@/actions/descuentosListaPrecioReglas";
import {
  fmtCondicionesReglaDescuento,
  labelCampoReglaDescuento,
} from "@/lib/descuentosListaPrecioReglasUi";
import { fmtPorcentajeTabla } from "@/lib/format";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const CATALOGOS_VACIOS: CatalogosReglasDescuentosListaPrecio = {
  proveedores: [],
  marcas: [],
  rubros: [],
};

export default function ReglasDescuentosListaPrecioPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reglas, setReglas] = useState<ReglaDescuentoListaPrecio[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosReglasDescuentosListaPrecio>(CATALOGOS_VACIOS);

  const [crearEditarOpen, setCrearEditarOpen] = useState(false);
  const [modoModal, setModoModal] = useState<"crear" | "editar">("crear");
  const [reglaEdit, setReglaEdit] = useState<ReglaDescuentoListaPrecio | null>(null);

  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [reglaEliminar, setReglaEliminar] = useState<ReglaDescuentoListaPrecio | null>(null);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [resReglas, resCatalogos] = await Promise.all([
        listarReglasDescuentosListaPrecioAction(),
        listarCatalogosReglasDescuentosAction(),
      ]);

      if (!resReglas.ok) {
        toast.error(resReglas.error ?? "No se pudieron cargar las reglas.");
        setReglas([]);
      } else {
        setReglas(resReglas.data);
      }

      if (!resCatalogos.ok) {
        toast.error(resCatalogos.error ?? "No se pudieron cargar los catálogos.");
        setCatalogos(CATALOGOS_VACIOS);
      } else {
        setCatalogos(resCatalogos.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const handleSuccess = useCallback(() => {
    void cargarDatos();
    router.refresh();
  }, [cargarDatos, router]);

  function abrirCrear() {
    setModoModal("crear");
    setReglaEdit(null);
    setCrearEditarOpen(true);
  }

  function abrirEditar(regla: ReglaDescuentoListaPrecio) {
    setModoModal("editar");
    setReglaEdit(regla);
    setCrearEditarOpen(true);
  }

  function abrirEliminar(regla: ReglaDescuentoListaPrecio) {
    setReglaEliminar(regla);
    setEliminarOpen(true);
  }

  const actions = (
    <Button
      type="button"
      variant="default"
      size="default"
      className="btn-primario-gestion gap-2 shrink-0"
      onClick={abrirCrear}
    >
      <Plus className="h-4 w-4 shrink-0" />
      Nueva Regla
    </Button>
  );

  return (
    <ClassicFilteredTableLayout
      title="Lista Proveedores"
      subtitle="Reglas Descuentos"
      actions={actions}
    >
      <div className="flex flex-col gap-3 min-h-0 flex-1">
        <p className="text-sm text-muted-foreground shrink-0">
          Los descuentos y el costo de transporte de cada ítem se calculan automáticamente según estas
          reglas. No se pueden editar manualmente en la grilla de lista precios.
        </p>

        <div className="contenedor-tabla-gestion flex-1 min-h-0">
          <Table variant="compact">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[10rem]">CAMPO</TableHead>
                <TableHead className="w-[6rem] text-right">VALOR</TableHead>
                <TableHead>CONDICIONES</TableHead>
                <TableHead className="w-[6rem] text-center">ESPEC.</TableHead>
                <TableHead className="w-[7rem] text-center">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="celda-datos text-center text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Cargando reglas…
                    </span>
                  </TableCell>
                </TableRow>
              ) : reglas.length === 0 ? (
                <EmptyTableRow colSpan={5} message="No hay reglas de descuento configuradas." />
              ) : (
                reglas.map((regla) => (
                  <TableRow key={regla.id}>
                    <TableCell className="celda-datos font-medium">
                      {labelCampoReglaDescuento(regla.campo)}
                    </TableCell>
                    <TableCell className="celda-datos text-right tabular-nums">
                      {fmtPorcentajeTabla(regla.valor)}
                    </TableCell>
                    <TableCell className="celda-datos">{fmtCondicionesReglaDescuento(regla)}</TableCell>
                    <TableCell className="celda-datos text-center tabular-nums">
                      {regla.especificidad}
                    </TableCell>
                    <TableCell className="celda-datos celda-datos--accion-relleno-fila p-0">
                      <div
                        className={cn(
                          TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
                          "justify-center gap-0.5"
                        )}
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label="Editar regla"
                          onClick={() => abrirEditar(regla)}
                        >
                          <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                          aria-label="Eliminar regla"
                          onClick={() => abrirEliminar(regla)}
                        >
                          <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CrearEditarReglaDescuentoListaPrecioModal
        open={crearEditarOpen}
        onOpenChange={setCrearEditarOpen}
        modo={modoModal}
        regla={reglaEdit}
        catalogos={catalogos}
        onSuccess={handleSuccess}
      />

      <EliminarReglaDescuentoListaPrecioModal
        open={eliminarOpen}
        onOpenChange={setEliminarOpen}
        regla={reglaEliminar}
        onSuccess={handleSuccess}
      />
    </ClassicFilteredTableLayout>
  );
}
