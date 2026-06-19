"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppModal from "@/components/shared/AppModal";
import CrearEditarReglaDescuentoListaPrecioModal from "@/components/proveedores/CrearEditarReglaDescuentoListaPrecioModal";
import EliminarReglaDescuentoListaPrecioModal from "@/components/proveedores/EliminarReglaDescuentoListaPrecioModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
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

/** Anchos de columna (suma 100 %) para lectura cómoda en modal ancho. */
const COL_WIDTHS_PCT = [14, 8, 54, 8, 16] as const;

interface Props {
  onSuccess?: () => void;
}

export default function ReglasDescuentosListaPrecioModal({ onSuccess }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (!open) return;
    void cargarDatos();
  }, [open, cargarDatos]);

  const handleSuccess = useCallback(() => {
    void cargarDatos();
    router.refresh();
    onSuccess?.();
  }, [cargarDatos, onSuccess, router]);

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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="default"
            size="default"
            className="btn-primario-gestion gap-2 shrink-0"
          >
            <Percent className="h-4 w-4 shrink-0" aria-hidden />
            Reglas Descuentos
          </Button>
        </DialogTrigger>

        <AppModal
          title="Reglas Descuentos"
          size="xl"
          className="sm:max-w-[72rem]"
          padding="sm"
          bodyShellClassName="p-2 sm:p-3"
          bodyClassName="flex min-h-0 flex-col"
          scrollBody
          hideBodyScrollbars
          actions={
            <>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
              <Button type="button" variant="default" className="gap-2" onClick={abrirCrear}>
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                Nueva Regla
              </Button>
            </>
          }
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <p className="shrink-0 text-sm text-muted-foreground">
              Los descuentos y el costo de transporte de cada ítem se calculan automáticamente según
              estas reglas. No se pueden editar manualmente en la grilla de lista precios.
            </p>

            <div className="contenedor-tabla-gestion min-h-0 max-h-[min(58vh,32rem)] flex-1">
              <Table variant="compact" className="tabla-vinculos-modal w-full min-w-0">
                <colgroup>
                  {COL_WIDTHS_PCT.map((pct, i) => (
                    <col key={i} style={{ width: `${pct}%` }} />
                  ))}
                </colgroup>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>CAMPO</TableHead>
                    <TableHead className="text-right">VALOR</TableHead>
                    <TableHead>CONDICIONES</TableHead>
                    <TableHead className="text-center">ESPEC.</TableHead>
                    <TableHead className="text-center">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="celda-datos text-center text-sm text-muted-foreground"
                      >
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
                        <TableCell className="celda-datos whitespace-normal break-words">
                          {fmtCondicionesReglaDescuento(regla)}
                        </TableCell>
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
        </AppModal>
      </Dialog>

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
    </>
  );
}
