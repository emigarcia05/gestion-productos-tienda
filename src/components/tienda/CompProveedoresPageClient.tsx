"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import TablaTienda from "@/components/tienda/TablaTienda";
import FiltrosTienda from "@/components/tienda/FiltrosTienda";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ItemTiendaParaTabla, ProveedorTintoLts } from "@/actions/tienda";
import { cambiarAProveedorMenorCostoAction } from "@/actions/tienda";
import { TIMEZONE_ARGENTINA } from "@/lib/fechaArgentina";
import type { Rol } from "@/lib/permisos";

interface Props {
  items: ItemTiendaParaTabla[];
  total: number;
  totalPaginas: number;
  proveedores: ProveedorTintoLts[];
  marcas: Array<{ marca: string }>;
  rubros: Array<{ rubro: string }>;
  subRubros: Array<{ subRubro: string }>;
  rol: Rol;
  hasFiltros: boolean;
  q: string;
  rubro: string;
  subRubro: string;
  marca: string;
  proveedor: string;
  mejorPrecio: string;
  paginaNum: number;
}

function getActTimestampParts(date: Date) {
  const dtf = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIMEZONE_ARGENTINA,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    dd: get("day"),
    mm: get("month"),
    hh: get("hour"),
    min: get("minute"),
  };
}

function exportarActProveedorExcel(
  rows: Array<{
    codigoTienda: string;
    codigoExterno: string;
    proveedor: string;
    costo: number;
  }>
) {
  import("xlsx").then((XLSX) => {
    const data = rows.map((r) => ({
      "CODIGO TIENDA": r.codigoTienda,
      "CODIGO EXTERNO": r.codigoExterno,
      "PROVEEDOR": r.proveedor,
      "COSTO": Number(r.costo.toFixed(2)),
    }));
    const hoja = XLSX.utils.json_to_sheet(data);
    hoja["!cols"] = [{ wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 12 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Act. Proveedor");
    const { dd, mm, hh, min } = getActTimestampParts(new Date());
    XLSX.writeFile(libro, `Act. Proveedor ${dd}-${mm} ${hh}_${min}.xls`, { bookType: "xls" });
  });
}

function exportarActMargenExcel(
  rows: Array<{
    codigoTienda: string;
    margen: number;
  }>
) {
  import("xlsx").then((XLSX) => {
    const data = rows.map((r) => ({
      "CODIGO TIENDA": r.codigoTienda,
      "MARGEN": Number(r.margen.toFixed(2)),
    }));
    const hoja = XLSX.utils.json_to_sheet(data);
    hoja["!cols"] = [{ wch: 16 }, { wch: 12 }];
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Act. Margen");
    const { dd, mm, hh, min } = getActTimestampParts(new Date());
    XLSX.writeFile(libro, `Act. Margen ${dd}-${mm} ${hh}-${min}.xls`, { bookType: "xls" });
  });
}

export default function CompProveedoresPageClient({
  items,
  total,
  totalPaginas,
  proveedores,
  marcas,
  rubros,
  subRubros,
  rol,
  hasFiltros,
  q,
  rubro,
  subRubro,
  marca,
  proveedor,
  mejorPrecio,
  paginaNum,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const canBulkChange = rol === "editor";

  const visibleIds = useMemo(() => items.map((i) => i.id), [items]);
  const selectedCount = useMemo(
    () => visibleIds.filter((id) => selectedIds.has(id)).length,
    [selectedIds, visibleIds]
  );

  function toggleItem(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function handleCambiarMenorCosto() {
    if (!canBulkChange) return;
    const ids = visibleIds.filter((id) => selectedIds.has(id));
    if (ids.length === 0) {
      toast.error("Seleccioná al menos un producto.");
      return;
    }
    startTransition(async () => {
      const res = await cambiarAProveedorMenorCostoAction({ itemTiendaIds: ids });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const { proveedorRows, margenRows, actualizados, omitidos } = res.data;
      if (actualizados === 0) {
        toast.error("No hubo actualizaciones: no se encontró un proveedor habilitado con menor costo.");
        return;
      }

      exportarActProveedorExcel(proveedorRows);
      exportarActMargenExcel(margenRows);

      const resumenOmitidos =
        omitidos > 0 ? ` Se omitieron ${omitidos.toLocaleString()} ítem(s).` : "";
      toast.success(`Actualizados ${actualizados.toLocaleString()} ítem(s).${resumenOmitidos}`);
      setTimeout(() => window.location.reload(), 1500);
    });
  }

  const actions = canBulkChange ? (
    <Button
      type="button"
      className="h-10 px-4"
      onClick={handleCambiarMenorCosto}
      disabled={isPending || selectedCount === 0}
      title="Cambiar A Prov. Menor Costo"
    >
      Cambiar A Prov. Menor Costo
    </Button>
  ) : undefined;

  const filters = (
    <FiltrosTienda
      marcas={marcas.map((m) => m.marca)}
      rubros={rubros.map((r) => r.rubro)}
      subRubros={subRubros.map((s) => s.subRubro)}
      proveedores={proveedores}
      totalItems={total}
      qActual={q}
      marcaActual={marca}
      rubroActual={rubro}
      subRubroActual={subRubro}
      proveedorActual={proveedor}
      mejorPrecioActual={mejorPrecio}
    />
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gris">
      <ClassicFilteredTableLayout
        title="Lista Tienda"
        subtitle="Comp. Proveedores"
        actions={actions}
        filters={filters}
      >
        <div className="flex flex-col h-full min-h-0 gap-0.5">
          <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
            <TablaTienda
              items={items}
              rol={rol}
              sinFiltros={!hasFiltros}
              selectedIds={selectedIds}
              onToggleSelected={toggleItem}
              onToggleAllVisible={toggleAllVisible}
              canBulkSelect={canBulkChange}
            />
          </div>
          {hasFiltros && totalPaginas > 1 && (
            <div className="flex justify-end pt-2 shrink-0">
              <PaginacionTabla
                basePath="/gestion-productos/tienda/comp-proveedores"
                params={{ q, rubro, subRubro, marca, proveedor, mejorPrecio }}
                paginaActual={paginaNum}
                totalPaginas={totalPaginas}
                total={total}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
