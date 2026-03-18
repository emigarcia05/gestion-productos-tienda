"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { ReposicionData, ItemReposicion, SucursalReposicion } from "@/actions/reposicion";
import { deleteReglaReposicion } from "@/actions/reposicion";
import ConfigurarReposicionModal from "./ConfigurarReposicionModal";
import { fmtCelda } from "@/lib/format";

function formaPedirLabel(formaPedir: string): string {
  if (formaPedir === "CANT_MAXIMA") return "CANT. MAX.";
  if (formaPedir === "CANT_FIJA") return "CANT. FIJA";
  return "";
}

interface Props {
  data: ReposicionData;
  sucursalActual: SucursalReposicion | null;
  onFiltradosCountChange?: (count: number) => void;
}

export default function TablaReposicion({
  data,
  sucursalActual,
  onFiltradosCountChange,
}: Props) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<ItemReposicion | null>(null);
  const items = data.items;

  const handleDelete = useCallback(
    async (item: ItemReposicion) => {
      if (!item.idReposicion) return;
      setSavingId(`${item.idListaTienda}:${item.codExt}`);
      const res = await deleteReglaReposicion({ id: item.idReposicion });
      setSavingId(null);
      if (res.ok) {
        router.refresh();
      } else {
        toast.error(res.error ?? "Error al eliminar.");
      }
    },
    [router]
  );

  const sucursalSeleccionada = sucursalActual !== null;

  useEffect(() => {
    if (onFiltradosCountChange) onFiltradosCountChange(items.length);
  }, [items.length, onFiltradosCountChange]);

  return (
    <div className="contenedor-tabla-gestion no-scroll-x">
      {!sucursalSeleccionada ? (
        <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Seleccioná una sucursal para ver los ítems.
        </div>
      ) : (
        <Table variant="compact" className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {/* Información principal */}
              <TableHead className="px-3 py-2 text-xs w-[50%]">
                DESCRIPCIÓN
              </TableHead>
              <TableHead className="px-3 py-2 text-xs w-[12%]">
                FORMA PEDIR
              </TableHead>
              <TableHead className="px-3 py-2 text-xs w-[8%]">
                PUNTO REPOSIC.
              </TableHead>
              <TableHead className="px-3 py-2 text-xs w-[8%]">
                CANT. REPOSIC.
              </TableHead>
              <TableHead
                className="px-1 py-2 text-xs text-center bg-muted/30 text-foreground w-[8%]"
              >
                <div className="flex items-center justify-center w-full">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </div>
              </TableHead>
              {/* Información secundaria */}
              <TableHead className="px-3 py-2 text-xs tabla-bloque-secundario-head-divider w-[7%]">
                STOCK
              </TableHead>
              <TableHead className="px-3 py-2 text-xs tabla-bloque-secundario-head w-[7%]">
                CANT. A PEDIR
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-xs text-muted-foreground py-10"
                >
                  Sin resultados
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => {
              const key = `${item.idListaTienda}:${item.codExt}`;
              const isSaving = savingId === key;
              const tieneRegla = item.idReposicion != null;
              const puntoVal = tieneRegla ? item.puntoReposicion : "";
              const cantVal = tieneRegla ? item.cant : "";
              const cantAPedirVal = tieneRegla ? item.cantPedir : "";

              return (
                <TableRow
                  key={key}
                  className="cursor-pointer"
                  onDoubleClick={(e) => {
                    if ((e.target as HTMLElement).closest("button[aria-label='Eliminar regla de reposición']")) return;
                    setModalItem(item);
                  }}
                >
                  {/* Principal */}
                  <TableCell className="px-3 py-2 text-xs">
                    {fmtCelda(item.descripcionTienda)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {item.formaPedir ? formaPedirLabel(item.formaPedir) : fmtCelda(null)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums">
                    {puntoVal === "" ? "" : puntoVal}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums">
                    {cantVal === "" ? "" : cantVal}
                  </TableCell>
                  <TableCell className="px-1 py-2 text-xs text-center bg-muted/30">
                    {item.idReposicion ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item)}
                        disabled={isSaving}
                        aria-label="Eliminar regla de reposición"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span className="inline-block w-8" aria-hidden />
                    )}
                  </TableCell>
                  {/* Secundaria */}
                  <TableCell className="px-3 py-2 text-xs tabular-nums tabla-bloque-secundario-cell-divider">
                    {item.stock}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums tabla-bloque-secundario-cell">
                    {cantAPedirVal === "" ? "" : cantAPedirVal}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {sucursalActual && modalItem && (
        <ConfigurarReposicionModal
          open={!!modalItem}
          onOpenChange={(open) => !open && setModalItem(null)}
          item={modalItem}
          sucursal={sucursalActual}
        />
      )}
    </div>
  );
}
