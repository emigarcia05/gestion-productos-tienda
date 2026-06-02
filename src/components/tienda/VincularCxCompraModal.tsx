"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Link2, Loader2, Tag, Trash2 } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import SeleccionarProductoModal, {
  type ProductoConProveedor,
} from "@/components/tienda/SeleccionarProductoModal";
import { setProductoPropioTiendaAction } from "@/actions/tienda";
import {
  desvincularProducto,
  establecerCostoListaTiendaAction,
  getVinculos,
  vincularProducto,
} from "@/actions/vinculos";
import type { ItemTiendaParaTabla } from "@/actions/tienda";
import { fmtPrecio } from "@/lib/format";
import {
  calcPxBaseVinculosTienda,
  labelVariacionVsBase,
  ordenarFilasVinculosTienda,
  type ProductoVinculoTienda,
} from "@/lib/vinculosTiendaUi";
import {
  TABLE_ROW_ACTION_ICON_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemTiendaParaTabla;
  idsProveedoresYaVinculados: string[];
  puedeEditar: boolean;
  onChanged: () => void;
}

function lineaMarcaRubro(item: ItemTiendaParaTabla): string {
  return [item.marca, item.rubro, item.subRubro]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" - ");
}

function CeldaVariacionModal({
  px,
  pxBase,
  esBase,
}: {
  px: number;
  pxBase: number | null;
  esBase: boolean;
}) {
  if (esBase) {
    return <span className="variacion-costo--neutra text-xs">0%</span>;
  }
  const v = labelVariacionVsBase(px, pxBase);
  if (v.kind === "empty" || v.kind === "neutral") {
    return <span className="variacion-costo--neutra text-xs">{v.kind === "empty" ? "—" : v.text}</span>;
  }
  if (v.kind === "up") {
    return (
      <span className="variacion-costo--positiva flex items-center justify-center gap-0.5 text-xs">
        <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {v.text}
      </span>
    );
  }
  return (
    <span className="variacion-costo--negativa flex items-center justify-center gap-0.5 text-xs">
      <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {v.text}
    </span>
  );
}

export default function VincularCxCompraModal({
  open,
  onOpenChange,
  item,
  idsProveedoresYaVinculados,
  puedeEditar,
  onChanged,
}: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [esPropio, setEsPropio] = useState(item.esProductoPropio);
  const [vinculados, setVinculados] = useState<ProductoVinculoTienda[]>([]);
  const [codExtBase, setCodExtBase] = useState<string | null>(null);
  const [seleccionarOpen, setSeleccionarOpen] = useState(false);
  const [togglePending, startToggle] = useTransition();
  const [vinculoPending, startVinculo] = useTransition();

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const result = await getVinculos(item.codItem);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setVinculados(result.data.productos as ProductoVinculoTienda[]);
      setCodExtBase(result.data.costoCompraCodExt);
      setEsPropio(result.data.esProductoPropio);
    } finally {
      setCargando(false);
    }
  }, [item.codItem]);

  useEffect(() => {
    if (!open) return;
    setEsPropio(item.esProductoPropio);
    void cargar();
  }, [open, item.esProductoPropio, cargar]);

  const filasOrdenadas = useMemo(
    () => ordenarFilasVinculosTienda(vinculados, item.proveedorDux ?? ""),
    [vinculados, item.proveedorDux]
  );
  const pxBase = useMemo(
    () => calcPxBaseVinculosTienda(filasOrdenadas, codExtBase),
    [filasOrdenadas, codExtBase]
  );

  const lineaContexto = lineaMarcaRubro(item);

  const handleTogglePropio = () => {
    if (!puedeEditar) return;
    const siguiente = !esPropio;
    startToggle(async () => {
      const res = await setProductoPropioTiendaAction({
        codTienda: item.codItem,
        esProductoPropio: siguiente,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setEsPropio(res.data.esProductoPropio);
      toast.success(
        res.data.esProductoPropio
          ? "Marcado como producto propio TiendaColor."
          : "Ya no es producto propio."
      );
      router.refresh();
      onChanged();
    });
  };

  const handleToggleBase = (producto: ProductoVinculoTienda) => {
    if (!puedeEditar) return;
    const yaEraBase = codExtBase === producto.codigoExterno;
    const nuevoValor = yaEraBase ? null : producto.codigoExterno;
    const previo = codExtBase;
    setCodExtBase(nuevoValor);
    startVinculo(async () => {
      const res = await establecerCostoListaTiendaAction(item.codItem, nuevoValor);
      if (res.ok) {
        router.refresh();
        onChanged();
      } else {
        setCodExtBase(previo);
        toast.error(res.error);
      }
    });
  };

  const handleDesvincular = (producto: ProductoVinculoTienda) => {
    startVinculo(async () => {
      const res = await desvincularProducto(item.codItem, producto.id);
      if (res.ok) {
        setVinculados((prev) => prev.filter((p) => p.id !== producto.id));
        if (codExtBase === producto.codigoExterno) {
          setCodExtBase(null);
        }
        router.refresh();
        onChanged();
        toast.success(`Desvinculado: ${producto.codigoExterno}`);
      } else {
        toast.error(res.error);
      }
    });
  };

  const handleSeleccionar = (producto: ProductoConProveedor) => {
    startVinculo(async () => {
      const res = await vincularProducto(item.id, producto.id);
      if (res.ok) {
        toast.success(`Vinculado: ${producto.codigoExterno}`);
        setSeleccionarOpen(false);
        await cargar();
        router.refresh();
        onChanged();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppModal
          size="lg"
          title="Vínculos Con Proveedores"
          bodyShellClassName="p-2"
          actions={
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex shrink-0 flex-col gap-1 pb-1 text-center">
              <p className="text-sm font-semibold text-foreground break-words">
                {item.descripcion}
              </p>
              {lineaContexto ? (
                <p className="text-xs text-muted-foreground">{lineaContexto}</p>
              ) : null}
              <p className="text-xs text-muted-foreground font-mono">{item.codItem}</p>
            </div>

            {puedeEditar && !esPropio ? (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="default"
                  className="btn-primario-gestion gap-2"
                  disabled={togglePending || vinculoPending}
                  onClick={() => setSeleccionarOpen(true)}
                >
                  <Link2 className="h-4 w-4 shrink-0" aria-hidden />
                  Vincular Nuevo Producto
                </Button>
              </div>
            ) : null}

            {cargando ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
                Cargando vínculos...
              </div>
            ) : esPropio ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-10 text-center">
                <Tag className="h-8 w-8 text-primary shrink-0" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  Producto propio TiendaColor
                </p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Este ítem está marcado como producto propio y no admite vínculos con la lista
                  de proveedores.
                </p>
                {puedeEditar ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-2"
                    disabled={togglePending}
                    onClick={() => handleTogglePropio()}
                  >
                    Quitar Producto Propio
                  </Button>
                ) : null}
              </div>
            ) : filasOrdenadas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sin vínculos con proveedores. Usá «Vincular Nuevo Producto» para agregar uno.
              </p>
            ) : (
              <div className="max-h-[45vh] overflow-auto rounded-md border border-border">
                <Table variant="compact" scrollX={false} className="tabla-vinculos-modal w-full">
                  <colgroup>
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "38%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "6%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-center">BASE</TableHead>
                      <TableHead>DESCRIPCIÓN</TableHead>
                      <TableHead className="text-center">PREFIJO</TableHead>
                      <TableHead className="text-right">PX. FINAL</TableHead>
                      <TableHead className="text-center">VARIAC.</TableHead>
                      <TableHead className="text-center">
                        <span className="sr-only">Desvincular</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filasOrdenadas.map(({ producto, px }) => {
                      const esBase = codExtBase === producto.codigoExterno;
                      return (
                        <TableRow key={producto.id} className="hover:bg-transparent">
                          <TableCell className="celda-datos text-center p-1">
                            {puedeEditar ? (
                              <input
                                type="checkbox"
                                checked={esBase}
                                disabled={vinculoPending}
                                className="h-4 w-4 accent-primary"
                                aria-label={`Base de comparación — ${producto.proveedor.prefijo}`}
                                onChange={() => handleToggleBase(producto)}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {esBase ? "✓" : ""}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="celda-datos max-w-0">
                            <span className="block truncate text-xs" title={producto.descripcion}>
                              {producto.descripcion}
                            </span>
                          </TableCell>
                          <TableCell className="celda-datos text-center text-xs font-medium">
                            {producto.proveedor.prefijo}
                          </TableCell>
                          <TableCell className="celda-datos text-right tabular-nums text-xs">
                            {fmtPrecio(px)}
                          </TableCell>
                          <TableCell className="celda-datos text-center">
                            <CeldaVariacionModal px={px} pxBase={pxBase} esBase={esBase} />
                          </TableCell>
                          <TableCell className="celda-datos p-1">
                            {puedeEditar ? (
                              <div className="flex justify-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  disabled={vinculoPending}
                                  className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                                  aria-label={`Desvincular ${producto.proveedor.prefijo}`}
                                  title="Desvincular"
                                  onClick={() => handleDesvincular(producto)}
                                >
                                  <Trash2
                                    className={TABLE_ROW_ACTION_ICON_CLASS}
                                    aria-hidden
                                  />
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </AppModal>
      </Dialog>

      {seleccionarOpen ? (
        <SeleccionarProductoModal
          open
          onClose={() => setSeleccionarOpen(false)}
          onSeleccionar={handleSeleccionar}
          excluirItemTiendaId={item.id}
          idsProveedoresYaVinculados={idsProveedoresYaVinculados}
          itemDescripcion={item.descripcion}
          marca={item.marca}
          rubro={item.rubro}
          subRubro={item.subRubro}
          puedeEditar={puedeEditar}
          esProductoPropio={esPropio}
          onProductoPropioChanged={() => {
            void cargar();
            onChanged();
            setSeleccionarOpen(false);
            onOpenChange(false);
          }}
        />
      ) : null}
    </>
  );
}
