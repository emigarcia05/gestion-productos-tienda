"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CrearEditarMktContenidoUrlDriveModal from "@/components/marketing/CrearEditarMktContenidoUrlDriveModal";
import GestionarMktContenidoDriveTipoModal from "@/components/marketing/GestionarMktContenidoDriveTipoModal";
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
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { eliminarMktContenidoUrlDriveAction } from "@/actions/mktContenidoUrlDrive";
import type {
  MktContenidoDriveTipoItem,
  MktContenidoUrlDriveItem,
} from "@/lib/mktContenidoUrlDrive";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";
import { FILTER_COUNT_CLASS } from "@/components/FilterBar";

interface Props {
  items: MktContenidoUrlDriveItem[];
  tipos: MktContenidoDriveTipoItem[];
  esEditor: boolean;
}

export default function MarketingBaseMultimediaPageClient({
  items,
  tipos,
  esEditor,
}: Props) {
  const router = useRouter();
  const [modalForm, setModalForm] = useState<
    | { open: false }
    | { open: true; modo: "crear" | "editar"; item?: MktContenidoUrlDriveItem }
  >({ open: false });
  const [modalTipos, setModalTipos] = useState(false);
  const [modalEliminar, setModalEliminar] = useState<
    { open: false } | { open: true; id: string; label: string }
  >({ open: false });
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function handleEliminar() {
    if (!modalEliminar.open || deleting) return;
    setDeleting(true);
    try {
      const res = await eliminarMktContenidoUrlDriveAction({ id: modalEliminar.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success("Registro eliminado.");
      setModalEliminar({ open: false });
      refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ClassicFilteredTableLayout
        title="Marketing"
        subtitle="Base Multimedia"
        contentWidth="full"
        actions={
          esEditor ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="default"
                className="h-10 gap-2 px-4"
                onClick={() => setModalTipos(true)}
              >
                <Settings2 className="size-4 shrink-0" aria-hidden />
                Gestionar Tipos
              </Button>
              <Button
                type="button"
                variant="default"
                className="h-10 gap-2 px-4"
                onClick={() => setModalForm({ open: true, modo: "crear" })}
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                Nuevo
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4 sm:px-6 lg:px-8">
          <p className={cn(FILTER_COUNT_CLASS, "shrink-0")}>
            {items.length} REGISTRO(S)
          </p>
          <div className="contenedor-tabla-gestion min-h-0 flex-1">
            <Table variant="compact" className="tabla-gestion-compacta w-full">
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "40%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>NOMBRE</TableHead>
                  <TableHead>TIPO DE CONTENIDO</TableHead>
                  <TableHead>DESCRIPCIÓN</TableHead>
                  <TableHead className="tabla-bloque-secundario-head-divider text-center">
                    ACCIONES
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <EmptyTableRow colSpan={4} message="No hay registros. Usá Nuevo para crear el primero." />
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium uppercase">{item.nombre}</TableCell>
                      <TableCell className="uppercase">{item.tipoNombre}</TableCell>
                      <TableCell>
                        <span className="line-clamp-2 whitespace-pre-wrap break-words text-sm">
                          {item.descripcion || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="tabla-bloque-secundario-cell-divider">
                        <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                            title="Ver"
                            aria-label={`Ver ${item.nombre}`}
                            onClick={() =>
                              window.open(item.url, "_blank", "noopener,noreferrer")
                            }
                          >
                            <Eye className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                          </Button>
                          {esEditor ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                title="Editar"
                                aria-label={`Editar ${item.nombre}`}
                                onClick={() =>
                                  setModalForm({ open: true, modo: "editar", item })
                                }
                              >
                                <Pencil className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                title="Eliminar"
                                aria-label={`Eliminar ${item.nombre}`}
                                onClick={() =>
                                  setModalEliminar({
                                    open: true,
                                    id: item.id,
                                    label: item.nombre,
                                  })
                                }
                              >
                                <Trash2 className={TABLE_ROW_ACTION_ICON_CLASS} aria-hidden />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </ClassicFilteredTableLayout>

      <CrearEditarMktContenidoUrlDriveModal
        open={modalForm.open}
        onOpenChange={(o) => !o && setModalForm({ open: false })}
        modo={modalForm.open ? modalForm.modo : "crear"}
        item={modalForm.open ? modalForm.item ?? null : null}
        tipos={tipos}
        onSuccess={refresh}
      />

      <GestionarMktContenidoDriveTipoModal
        open={modalTipos}
        onOpenChange={setModalTipos}
        itemsIniciales={tipos}
        esEditor={esEditor}
        onCatalogoChanged={refresh}
      />

      <Dialog
        open={modalEliminar.open}
        onOpenChange={(o) => {
          if (deleting && !o) return;
          if (!o) setModalEliminar({ open: false });
        }}
      >
        <AppModal
          title="Eliminar Contenido"
          size="sm"
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setModalEliminar({ open: false })}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={deleting} onClick={() => void handleEliminar()}>
                Eliminar
              </Button>
            </div>
          }
        >
          <p className="text-sm text-foreground">
            ¿Eliminar <span className="font-semibold">{modalEliminar.open ? modalEliminar.label : ""}</span>?
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
