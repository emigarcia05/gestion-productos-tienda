"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AppModal from "@/components/shared/AppModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SelectorProductosReposicionModal from "./SelectorProductosReposicionModal";
import type { ItemReposicion, SucursalReposicion, FormaPedirReposicionOption } from "@/actions/reposicion";
import { upsertReglaReposicion } from "@/actions/reposicion";
import type { ItemSelectorReposicion } from "@/actions/reposicion";

const FORMA_PEDIR_OPTIONS: { value: FormaPedirReposicionOption; label: string }[] = [
  { value: "", label: "—" },
  { value: "CANT_MAXIMA", label: "CANT. MAX." },
  { value: "CANT_FIJA", label: "CANT. FIJA" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemReposicion;
  sucursal: SucursalReposicion;
}

export default function ConfigurarReposicionModal({
  open,
  onOpenChange,
  item,
  sucursal,
}: Props) {
  const router = useRouter();
  const [formaPedir, setFormaPedir] = useState<FormaPedirReposicionOption>(item.formaPedir || "");
  const [puntoReposicion, setPuntoReposicion] = useState(item.puntoReposicion);
  const [cant, setCant] = useState(item.cant);
  const [productosAdicionales, setProductosAdicionales] = useState<ItemSelectorReposicion[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (open) {
      setFormaPedir(item.formaPedir || "");
      setPuntoReposicion(item.puntoReposicion);
      setCant(item.cant);
      setProductosAdicionales([]);
    }
  }, [open, item.idListaTienda, item.codExt, item.formaPedir, item.puntoReposicion, item.cant]);

  const nombreProducto = item.descripcionTienda ?? "—";
  const tituloCant =
    formaPedir
      ? FORMA_PEDIR_OPTIONS.find((o) => o.value === formaPedir)?.label ?? ""
      : "";
  const tieneConfigInicial = Boolean(item.idReposicion) || Boolean(item.formaPedir);
  const puntoValido = Math.max(0, Math.floor(Number(puntoReposicion) || 0)) > 0;
  const mostrarPunto = tieneConfigInicial || Boolean(formaPedir);
  const mostrarCant = tieneConfigInicial || (Boolean(formaPedir) && puntoValido);
  const invisPunto = !mostrarPunto;
  const invisCant = !mostrarCant;

  const handleAgregarProductos = (seleccionados: ItemSelectorReposicion[]) => {
    setProductosAdicionales((prev) => {
      const keys = new Set(prev.map((p) => `${p.idListaTienda}:${p.codExt}`));
      const nuevos = seleccionados.filter((p) => !keys.has(`${p.idListaTienda}:${p.codExt}`));
      return [...prev, ...nuevos];
    });
  };

  const handleEliminarProductoAdicional = (producto: ItemSelectorReposicion) => {
    setProductosAdicionales((prev) =>
      prev.filter(
        (p) =>
          !(
            p.idListaTienda === producto.idListaTienda &&
            p.codExt === producto.codExt
          )
      )
    );
  };

  const handleGuardar = async () => {
    if (!item.idProveedor) {
      toast.error("Este producto no tiene proveedor asignado.");
      return;
    }
    if (!formaPedir) {
      toast.error("Seleccioná Forma Pedir.");
      return;
    }
    const punto = Math.max(0, Math.floor(Number(puntoReposicion)) || 0);
    const cantNum = Math.max(0, Math.floor(Number(cant)) || 0);
    if (punto <= 0) {
      toast.error("Completá Punto Reposición.");
      return;
    }
    if (cantNum <= 0) {
      toast.error("Completá Cant. Reposición.");
      return;
    }

    setGuardando(true);
    try {
      const todos: { idProveedor: string; codExt: string }[] = [
        { idProveedor: item.idProveedor, codExt: item.codExt },
        ...productosAdicionales.map((p) => ({ idProveedor: p.idProveedor, codExt: p.codExt })),
      ];
      for (const t of todos) {
        const res = await upsertReglaReposicion({
          idProveedor: t.idProveedor,
          sucursalCodigo: sucursal,
          codExt: t.codExt,
          formaPedir: formaPedir as "CANT_MAXIMA" | "CANT_FIJA",
          puntoReposicion: punto,
          cant: cantNum,
        });
        if (!res.ok) {
          toast.error(res.error ?? "Error al guardar.");
          return;
        }
      }
      toast.success(
        productosAdicionales.length > 0
          ? `Configuración guardada para ${todos.length} producto(s).`
          : "Configuración guardada."
      );
      onOpenChange(false);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppModal
          title="Configurar Reposición"
          className="sm:max-w-[40rem] max-h-[100vh]"
          actions={
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              <Button type="button" onClick={handleGuardar} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-6 items-stretch text-center">
            <div className="flex flex-col items-center gap-2 w-full">
              <p className="text-sm text-foreground font-medium">{nombreProducto}</p>
              <div className="w-full h-px bg-[#0072BB]" />
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex flex-col items-center gap-1">
                <Label className="text-xs font-medium text-foreground text-center">
                  FORMA PEDIR
                </Label>
                <Select
                  value={formaPedir || "none"}
                  onValueChange={(v) =>
                    {
                      if (v === "none") {
                        setFormaPedir("");
                        setPuntoReposicion(0);
                        setCant(0);
                        return;
                      }
                      setFormaPedir(v as FormaPedirReposicionOption);
                    }
                  }
                >
                  <SelectTrigger className="w-full text-center">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" align="start">
                    {FORMA_PEDIR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value || "none"} value={opt.value || "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className={[
                  "flex flex-col items-center gap-1",
                  invisPunto ? "invisible pointer-events-none select-none" : "",
                ].join(" ")}
                aria-hidden={invisPunto}
              >
                <Label className="text-xs font-medium text-foreground text-center">
                  PUNTO REPOSICIÓN
                </Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={puntoReposicion}
                  onChange={(e) => setPuntoReposicion(parseInt(e.target.value, 10) || 0)}
                  className="tabular-nums text-center"
                  tabIndex={invisPunto ? -1 : 0}
                />
              </div>

              <div
                className={[
                  "flex flex-col items-center gap-1",
                  invisCant ? "invisible pointer-events-none select-none" : "",
                ].join(" ")}
                aria-hidden={invisCant}
              >
                <Label className="text-xs font-medium text-foreground text-center">
                  {tituloCant}
                </Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={cant}
                  onChange={(e) => setCant(parseInt(e.target.value, 10) || 0)}
                  className="tabular-nums text-center"
                  aria-label="Cantidad reposición"
                  tabIndex={invisCant ? -1 : 0}
                />
              </div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <span className="text-sm text-foreground">
                Agregar esta configuración a estos productos
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setSelectorOpen(true)}
                aria-label="Abrir selector de productos"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {productosAdicionales.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-muted-foreground text-center">
                  {productosAdicionales.length} producto(s) agregado(s) para aplicar la misma configuración.
                </div>
                <div className="border border-border rounded-lg overflow-auto max-h-64">
                  <Table variant="compact" scrollX={false} className="w-full tabla-gestion-compacta">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/50">
                        <TableHead className="text-xs text-center">DESCRIPCIÓN</TableHead>
                        <TableHead className="w-10 text-xs text-center" aria-label="Acciones" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productosAdicionales.map((p) => (
                        <TableRow key={`${p.idListaTienda}:${p.codExt}`}>
                          <TableCell className="text-xs py-2 text-left">
                            {p.descripcionTienda ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs py-2 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-foreground hover:text-destructive"
                              aria-label="Quitar producto de la configuración"
                              onClick={() => handleEliminarProductoAdicional(p)}
                            >
                              <Plus className="hidden" aria-hidden="true" />
                              {/* Reutilizamos el icono de basura para indicar eliminar */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-4 h-4"
                                aria-hidden="true"
                              >
                                <path
                                  d="M9 3h6a1 1 0 0 1 .993.883L16 4v1h4a1 1 0 1 1 0 2h-1.07l-.845 11.037A2 2 0 0 1 16.093 20H7.907a2 2 0 0 1-1.992-1.963L5.07 7H4a1 1 0 1 1 0-2h4V4a1 1 0 0 1 .883-.993L9 3Zm6 4H9l-.8 10.4a0 0 0 0 0 0 0h7.6a0 0 0 0 0 0 0L15 7Zm-3 2a1 1 0 0 1 .993.883L13 10v6a1 1 0 0 1-1.993.117L11 16v-6a1 1 0 0 1 1-1Z"
                                  fill="currentColor"
                                />
                              </svg>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </AppModal>
      </Dialog>

      <SelectorProductosReposicionModal
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        sucursal={sucursal}
        onConfirmar={handleAgregarProductos}
        excludeIds={[item.idListaTienda]}
      />
    </>
  );
}
