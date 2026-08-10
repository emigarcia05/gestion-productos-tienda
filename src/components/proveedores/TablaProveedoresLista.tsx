"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import ProveedorModal, { type ProveedorParaModal } from "./ProveedorModal";
import { eliminarProveedor } from "@/actions/proveedores";
import type { ProveedorListItem } from "@/services/proveedor.service";

interface Props {
  proveedores: ProveedorListItem[];
  /** Alta/edición/baja (mismo gate que `PERMISOS.proveedores.acciones.nuevoProveedor`). */
  puedeMutar?: boolean;
}

export default function TablaProveedoresLista({
  proveedores,
  puedeMutar = false,
}: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProveedor, setModalProveedor] = useState<ProveedorParaModal | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, startDeleteTransition] = useTransition();

  function openEdit(prov: ProveedorListItem) {
    setModalProveedor({
      id: prov.id,
      nombre: prov.nombre,
      prefijo: prov.prefijo,
      idProveedorDux: prov.idProveedorDux ?? undefined,
      whatsapp: prov.whatsapp ?? undefined,
      coeficienteTintometrico: prov.coeficienteTintometrico,
      plazosPagos: prov.plazosPagos ?? undefined,
      proveedorMercaderia: prov.proveedorMercaderia,
      iva: prov.iva,
    });
    setModalOpen(true);
  }

  function handleSuccess() {
    setModalOpen(false);
    setModalProveedor(null);
    router.refresh();
  }

  function handleEliminar(prov: ProveedorListItem) {
    const ok = window.confirm(
      `¿Eliminar al proveedor "${prov.nombre}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    setDeletingId(prov.id);
    startDeleteTransition(async () => {
      try {
        const result = await eliminarProveedor(prov.id);
        if (result.ok) {
          toast.success(`Proveedor "${prov.nombre}" eliminado.`);
          router.refresh();
        } else {
          toast.error(result.error);
        }
      } finally {
        setDeletingId(null);
      }
    });
  }

  return (
    <>
      <div className="flex flex-col h-full min-h-0 gap-0.5">
        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <Table variant="compact" scrollX={false}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="min-w-0">PROVEEDOR</TableHead>
                <TableHead className="w-24">PREFIJO</TableHead>
                <TableHead className="w-28">CANT. PRODUCTOS</TableHead>
                <TableHead className="w-36">CANT. VINCULADOS</TableHead>
                {puedeMutar ? (
                  <TableHead
                    className={cn(
                      "w-24 text-center",
                      "tabla-bloque-secundario-head-divider"
                    )}
                  >
                    ACCIONES
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((prov) => {
                const isDeleting = pendingDelete && deletingId === prov.id;
                return (
                  <TableRow key={prov.id}>
                    <TableCell className="celda-datos min-w-0 truncate">
                      {prov.nombre}
                    </TableCell>
                    <TableCell className="celda-datos celda-mono whitespace-nowrap">
                      {prov.prefijo}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero">
                      {prov.cantProductos.toLocaleString()}
                    </TableCell>
                    <TableCell className="celda-datos celda-numero">
                      {prov.cantVinculados.toLocaleString()}
                    </TableCell>
                    {puedeMutar ? (
                      <TableCell
                        className={cn(
                          "celda-datos celda-datos--accion-relleno-fila",
                          "tabla-bloque-secundario-cell-divider"
                        )}
                      >
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
                            aria-label={`Editar ${prov.nombre}`}
                            disabled={isDeleting}
                            onClick={() => openEdit(prov)}
                          >
                            <Pencil
                              className={TABLE_ROW_ACTION_ICON_CLASS}
                              aria-hidden
                            />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            aria-label={`Eliminar ${prov.nombre}`}
                            disabled={isDeleting}
                            onClick={() => handleEliminar(prov)}
                          >
                            {isDeleting ? (
                              <Loader2
                                className={cn(
                                  TABLE_ROW_ACTION_ICON_CLASS,
                                  "animate-spin"
                                )}
                                aria-hidden
                              />
                            ) : (
                              <Trash2
                                className={TABLE_ROW_ACTION_ICON_CLASS}
                                aria-hidden
                              />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <ProveedorModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          proveedor={modalProveedor}
          onSuccess={handleSuccess}
        />
      </Dialog>
    </>
  );
}
