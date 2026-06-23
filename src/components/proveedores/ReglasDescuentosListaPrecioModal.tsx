"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AppModal from "@/components/shared/AppModal";
import CrearEditarReglaDescuentoListaPrecioModal from "@/components/proveedores/CrearEditarReglaDescuentoListaPrecioModal";
import EliminarReglaDescuentoListaPrecioModal from "@/components/proveedores/EliminarReglaDescuentoListaPrecioModal";
import FilterBar, {
  FiltroIndividualContainer,
  FilterRowSelection,
  FilaFiltrosDesplegables,
  FILTER_COUNT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
} from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CAMPOS_REGLA_DESCUENTO_OPCIONES,
  celdaCondicionReglaDescuento,
  labelCampoReglaDescuento,
} from "@/lib/descuentosListaPrecioReglasUi";
import type { CampoReglaDescuentoListaPrecioInput } from "@/lib/validations/descuentosListaPrecioReglas";
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

/** Anchos de columna (suma 100 %): CAMPO · VALOR · PROV · MARCA · RUBRO · ESPEC · ACC. */
const COL_WIDTHS_PCT = [12, 7, 18, 18, 18, 8, 14] as const;
const COL_COUNT = COL_WIDTHS_PCT.length;

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

  const [filtroCampo, setFiltroCampo] = useState<CampoReglaDescuentoListaPrecioInput | "">("");
  const [filtroProveedorId, setFiltroProveedorId] = useState("");
  const [filtroMarcaId, setFiltroMarcaId] = useState("");
  const [filtroRubroId, setFiltroRubroId] = useState("");

  const limpiarFiltros = useCallback(() => {
    setFiltroCampo("");
    setFiltroProveedorId("");
    setFiltroMarcaId("");
    setFiltroRubroId("");
  }, []);

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
    limpiarFiltros();
    void cargarDatos();
  }, [open, cargarDatos, limpiarFiltros]);

  const reglasFiltradas = useMemo(() => {
    return reglas.filter((regla) => {
      if (filtroCampo && regla.campo !== filtroCampo) return false;
      if (filtroProveedorId && regla.idProveedor !== filtroProveedorId) return false;
      if (filtroMarcaId && regla.idMarca !== filtroMarcaId) return false;
      if (filtroRubroId && regla.idRubro !== filtroRubroId) return false;
      return true;
    });
  }, [reglas, filtroCampo, filtroProveedorId, filtroMarcaId, filtroRubroId]);

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
            Reglas Desc.
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
            <FilterBar className="filtros-contenedor-tienda shrink-0 bg-card">
              <FilterRowSelection>
                <FilaFiltrosDesplegables>
                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={Boolean(filtroCampo)}
                    onLimpiar={() => setFiltroCampo("")}
                  >
                    <Select
                      value={filtroCampo || undefined}
                      onValueChange={(v) =>
                        setFiltroCampo(v as CampoReglaDescuentoListaPrecioInput)
                      }
                    >
                      <SelectTrigger id="filtro-regla-campo" className="input-filtro-unificado">
                        <SelectValue placeholder="TIPO DESC." />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        {CAMPOS_REGLA_DESCUENTO_OPCIONES.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>

                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={Boolean(filtroProveedorId)}
                    onLimpiar={() => setFiltroProveedorId("")}
                  >
                    <Select
                      value={filtroProveedorId || undefined}
                      onValueChange={setFiltroProveedorId}
                    >
                      <SelectTrigger id="filtro-regla-proveedor" className="input-filtro-unificado">
                        <SelectValue placeholder="PROVEEDOR" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        {catalogos.proveedores.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.prefijo ? `[${p.prefijo}] ` : ""}
                            {p.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>

                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={Boolean(filtroMarcaId)}
                    onLimpiar={() => setFiltroMarcaId("")}
                  >
                    <Select value={filtroMarcaId || undefined} onValueChange={setFiltroMarcaId}>
                      <SelectTrigger id="filtro-regla-marca" className="input-filtro-unificado">
                        <SelectValue placeholder="MARCA" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        {catalogos.marcas.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>

                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={Boolean(filtroRubroId)}
                    onLimpiar={() => setFiltroRubroId("")}
                  >
                    <Select value={filtroRubroId || undefined} onValueChange={setFiltroRubroId}>
                      <SelectTrigger id="filtro-regla-rubro" className="input-filtro-unificado">
                        <SelectValue placeholder="RUBRO" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        {catalogos.rubros.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>

                  <div className="flex min-w-0 items-center justify-end">
                    <span className={cn(FILTER_COUNT_CLASS, "whitespace-nowrap")}>
                      {reglasFiltradas.length.toLocaleString()} REGLA
                      {reglasFiltradas.length !== 1 ? "S" : ""}
                    </span>
                  </div>
                </FilaFiltrosDesplegables>
              </FilterRowSelection>
            </FilterBar>

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
                    <TableHead>PROVEEDOR</TableHead>
                    <TableHead>MARCA</TableHead>
                    <TableHead>RUBRO</TableHead>
                    <TableHead className="text-center">ESPEC.</TableHead>
                    <TableHead className="text-center">ACCIONES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={COL_COUNT}
                        className="celda-datos text-center text-sm text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Cargando reglas…
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : reglas.length === 0 ? (
                    <EmptyTableRow colSpan={COL_COUNT} message="No hay reglas de descuento configuradas." />
                  ) : reglasFiltradas.length === 0 ? (
                    <EmptyTableRow colSpan={COL_COUNT} message="Ninguna regla coincide con los filtros." />
                  ) : (
                    reglasFiltradas.map((regla) => (
                      <TableRow key={regla.id}>
                        <TableCell className="celda-datos font-medium">
                          {labelCampoReglaDescuento(regla.campo)}
                        </TableCell>
                        <TableCell className="celda-datos text-right tabular-nums">
                          {fmtPorcentajeTabla(regla.valor)}
                        </TableCell>
                        <TableCell className="celda-datos whitespace-normal break-words">
                          {celdaCondicionReglaDescuento(regla, "proveedor")}
                        </TableCell>
                        <TableCell className="celda-datos whitespace-normal break-words">
                          {celdaCondicionReglaDescuento(regla, "marca")}
                        </TableCell>
                        <TableCell className="celda-datos whitespace-normal break-words">
                          {celdaCondicionReglaDescuento(regla, "rubro")}
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
