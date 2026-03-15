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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type {
  ReposicionData,
  ItemReposicion,
  SucursalReposicion,
  FormaPedirReposicionOption,
} from "@/actions/reposicion";
import { upsertReglaReposicion, deleteReglaReposicion } from "@/actions/reposicion";

const FORMA_PEDIR_OPTIONS: { value: FormaPedirReposicionOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "CANT_MAXIMA", label: "CANT. MAX." },
  { value: "CANT_FIJA", label: "CANT. FIJA" },
];

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
  const [editing, setEditing] = useState<Record<string, { puntoReposicion?: number; cant?: number }>>({});
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

  const handleSave = useCallback(
    async (item: ItemReposicion, updates: { formaPedir?: FormaPedirReposicionOption; puntoReposicion?: number; cant?: number }) => {
      if (!sucursalActual || !item.idProveedor) return;
      const formaPedir = updates.formaPedir ?? item.formaPedir;
      const puntoReposicion = updates.puntoReposicion ?? item.puntoReposicion;
      const cant = updates.cant ?? item.cant;
      const key = `${item.idListaTienda}:${item.codExt}`;
      setSavingId(key);
      const res = await upsertReglaReposicion({
        idProveedor: item.idProveedor,
        sucursalCodigo: sucursalActual,
        codExt: item.codExt,
        formaPedir: formaPedir || undefined,
        puntoReposicion,
        cant,
      });
      setSavingId(null);
      if (res.ok) {
        setEditing((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        router.refresh();
        return;
      }
      toast.error(res.error ?? "Error al guardar.");
    },
    [sucursalActual, router]
  );

  const sucursalSeleccionada = sucursalActual !== null;

  useEffect(() => {
    if (onFiltradosCountChange) onFiltradosCountChange(items.length);
  }, [items.length, onFiltradosCountChange]);

  return (
    <div className="flex-1 overflow-auto rounded-lg border border-border bg-card">
      {!sucursalSeleccionada ? (
        <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Seleccioná una sucursal para ver los ítems.
        </div>
      ) : (
        <Table variant="compact" className="table-fixed">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-3 py-2 text-xs" style={{ width: "45%" }}>
                DESCRIPCIÓN
              </TableHead>
              <TableHead className="px-3 py-2 text-xs" style={{ width: "25%" }}>
                FORMA PEDIR
              </TableHead>
              <TableHead className="px-3 py-2 text-xs" style={{ width: "10%" }}>
                PUNTO REPOSICIÓN
              </TableHead>
              <TableHead className="px-3 py-2 text-xs" style={{ width: "10%" }}>
                CANT. REPOSICIÓN
              </TableHead>
              <TableHead className="px-3 py-2 text-xs" style={{ width: "7.5%" }}>
                STOCK
              </TableHead>
              <TableHead className="px-3 py-2 text-xs" style={{ width: "7.5%" }}>
                CANT. A PEDIR
              </TableHead>
              <TableHead className="px-1 py-2 text-xs w-0" style={{ width: "5%" }} aria-hidden />
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
              const puedeEditar = !!item.idProveedor;
              const formaElegida = !!item.formaPedir;
              const isSaving = savingId === key;
              const editPunto = editing[key]?.puntoReposicion;
              const editCant = editing[key]?.cant;
              const tieneRegla = item.idReposicion != null;
              const puntoVal =
                editPunto !== undefined
                  ? editPunto
                  : tieneRegla
                    ? item.puntoReposicion
                    : "";
              const cantVal =
                editCant !== undefined
                  ? editCant
                  : tieneRegla
                    ? item.cant
                    : "";
              const cantAPedirVal = tieneRegla ? item.cantPedir : "";

              return (
                <TableRow key={key}>
                  <TableCell className="px-3 py-2 text-xs">
                    {item.descripcionTienda ?? "—"}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {puedeEditar ? (
                      <Select
                        value={item.formaPedir || "none"}
                        onValueChange={(v) => {
                          const val = v === "none" ? "" : (v as FormaPedirReposicionOption);
                          handleSave(item, { formaPedir: val });
                        }}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          side="bottom"
                          align="start"
                          className="select-content-filtro"
                        >
                          {FORMA_PEDIR_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value || "none"}
                              value={opt.value || "none"}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {puedeEditar ? (
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-center text-xs tabular-nums"
                        value={puntoVal}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setEditing((prev) => ({ ...prev, [key]: { ...prev[key], puntoReposicion: undefined } }));
                            return;
                          }
                          const n = parseInt(raw, 10);
                          if (!Number.isNaN(n) && n >= 0) {
                            setEditing((prev) => ({ ...prev, [key]: { ...prev[key], puntoReposicion: n } }));
                          }
                        }}
                        onBlur={(e) => {
                          if (!formaElegida) return;
                          const raw = e.target.value;
                          const n = raw === "" ? 0 : parseInt(raw, 10);
                          if (Number.isNaN(n) || n < 0) return;
                          const prevVal = tieneRegla ? item.puntoReposicion : 0;
                          if (n !== prevVal) {
                            handleSave(item, { puntoReposicion: n });
                          }
                        }}
                        disabled={!formaElegida || isSaving}
                        placeholder=""
                      />
                    ) : (
                      ""
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {puedeEditar ? (
                      <Input
                        type="number"
                        min={0}
                        className="h-8 text-center text-xs tabular-nums"
                        value={cantVal}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setEditing((prev) => ({ ...prev, [key]: { ...prev[key], cant: undefined } }));
                            return;
                          }
                          const n = parseInt(raw, 10);
                          if (!Number.isNaN(n) && n >= 0) {
                            setEditing((prev) => ({ ...prev, [key]: { ...prev[key], cant: n } }));
                          }
                        }}
                        onBlur={(e) => {
                          if (!formaElegida) return;
                          const raw = e.target.value;
                          const n = raw === "" ? 0 : parseInt(raw, 10);
                          if (Number.isNaN(n) || n < 0) return;
                          const prevVal = tieneRegla ? item.cant : 0;
                          if (n !== prevVal) {
                            handleSave(item, { cant: n });
                          }
                        }}
                        disabled={!formaElegida || isSaving}
                        placeholder=""
                      />
                    ) : (
                      ""
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums">
                    {item.stock}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs tabular-nums">
                    {cantAPedirVal === "" ? "" : cantAPedirVal}
                  </TableCell>
                  <TableCell className="px-1 py-2 text-xs" style={{ width: "5%" }}>
                    {item.idReposicion ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
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
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
