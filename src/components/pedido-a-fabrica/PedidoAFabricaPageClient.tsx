"use client";

import { useEffect, useState, startTransition } from "react";
import { Info } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FilterBar, {
  FilaFiltrosDesplegables,
  FilterRowSelection,
  FiltroIndividualContainer,
  INPUT_FILTER_CLASS,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ToolbarActionButton from "@/components/shared/ToolbarActionButton";
import { cn } from "@/lib/utils";
import { getProductosPedidoAFabricaAction } from "@/actions/pedidoAFabrica";
import type {
  ProductoPedidoAFabricaItem,
  SucursalPedidoAFabrica,
} from "@/services/pedidoAFabrica.service";
import TablaPedidoAFabrica from "@/components/pedido-a-fabrica/TablaPedidoAFabrica";
import InfoPromedioPedidoAFabricaModal from "@/components/pedido-a-fabrica/InfoPromedioPedidoAFabricaModal";

export type ProveedorFabricaOption = {
  id: string;
  nombre: string;
  prefijo: string;
  /** `global_proveedores.tiempo_entrega_en_dias` (nullable). */
  tiempoEntregaEnDias: number | null;
};

interface Props {
  proveedoresFabrica: ProveedorFabricaOption[];
  sucursalesPedido: SucursalPedidoAFabrica[];
}

/** Solo dígitos (enteros ≥ 0); vacío permitido. */
function sanitizeTiempoStockeoInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Módulo **Pedido A Fáb.** (pilar sidebar Administración).
 * Filtros: **PROVEEDOR** (`es_fabrica = true`) + **TIEMPO STOCKEO** (enteros).
 * Tabla: **DESCRIPCIÓN** + por sucursal `pedido = true`: **STOCK ACTUAL** | **PROM. VTA.**
 * + **TOTAL**: **CANT. SUGERIDA** | **CANT. A PEDIR** | tilde.
 */
export default function PedidoAFabricaPageClient({
  proveedoresFabrica,
  sucursalesPedido,
}: Props) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [tiempoStockeo, setTiempoStockeo] = useState<string>("");
  const [pagina, setPagina] = useState(1);
  const [sucursales, setSucursales] =
    useState<SucursalPedidoAFabrica[]>(sucursalesPedido);
  const [productos, setProductos] = useState<ProductoPedidoAFabricaItem[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [infoPromedioOpen, setInfoPromedioOpen] = useState(false);
  const [cantAPedirByCodExt, setCantAPedirByCodExt] = useState<
    Record<string, string>
  >({});

  const proveedorActivo = proveedorId !== "";
  const tiempoStockeoActivo = tiempoStockeo !== "";
  const proveedorSeleccionado = proveedoresFabrica.find(
    (p) => p.id === proveedorId
  );
  const tiempoEntregaEnDias =
    proveedorSeleccionado?.tiempoEntregaEnDias ?? null;
  const tiempoStockeoNumero =
    tiempoStockeo === "" ? null : Number(tiempoStockeo);

  function handleProveedorChange(value: string) {
    setProveedorId(value);
    setPagina(1);
    setCantAPedirByCodExt({});
  }

  function handleLimpiarProveedor() {
    setProveedorId("");
    setPagina(1);
    setProductos([]);
    setTotalPaginas(0);
    setSucursales(sucursalesPedido);
    setCantAPedirByCodExt({});
  }

  function handleTiempoStockeoChange(raw: string) {
    setTiempoStockeo(sanitizeTiempoStockeoInput(raw));
  }

  function handleCantAPedirChange(codExt: string, value: string) {
    setCantAPedirByCodExt((prev) => {
      if (value === "") {
        if (!(codExt in prev)) return prev;
        const next = { ...prev };
        delete next[codExt];
        return next;
      }
      return { ...prev, [codExt]: value };
    });
  }

  function handleAplicarCantSugerida(codExt: string, cantSugerida: number) {
    setCantAPedirByCodExt((prev) => ({
      ...prev,
      [codExt]: String(cantSugerida),
    }));
  }

  useEffect(() => {
    if (!proveedorId) {
      queueMicrotask(() => {
        setProductos([]);
        setTotalPaginas(0);
        setLoading(false);
        setSucursales(sucursalesPedido);
      });
      return;
    }

    let cancelled = false;
    queueMicrotask(() => setLoading(true));

    startTransition(() => {
      void (async () => {
        const res = await getProductosPedidoAFabricaAction({
          proveedorId,
          pagina,
        });
        if (cancelled) return;
        setSucursales(
          res.sucursales.length > 0 ? res.sucursales : sucursalesPedido
        );
        setProductos(res.productos);
        setTotalPaginas(res.totalPaginas);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [proveedorId, pagina, sucursalesPedido]);

  return (
    <>
      <ClassicFilteredTableLayout
        title="PEDIDO A FÁB."
        subtitle="Pedido A Fáb."
        contentWidth="full"
        actions={
          <ToolbarActionButton
            type="button"
            label="Info Promedio"
            icon={<Info aria-hidden />}
            className="h-10 px-4"
            onClick={() => setInfoPromedioOpen(true)}
          />
        }
        filters={
          <FilterBar className="filtros-contenedor-tienda bg-card">
            <FilterRowSelection>
              <FilaFiltrosDesplegables columnas={5}>
                <FiltroIndividualContainer
                  activo={proveedorActivo}
                  onLimpiar={handleLimpiarProveedor}
                >
                  <Select
                    value={proveedorId || undefined}
                    onValueChange={handleProveedorChange}
                  >
                    <SelectTrigger
                      className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                      aria-label="PROVEEDOR"
                    >
                      <SelectValue placeholder="PROVEEDOR" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="start"
                      className="select-content-filtro"
                    >
                      {proveedoresFabrica.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.prefijo
                            ? `[${p.prefijo}] ${p.nombre}`.toLocaleUpperCase("es")
                            : p.nombre.toLocaleUpperCase("es")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FiltroIndividualContainer>

                <FiltroIndividualContainer
                  activo={tiempoStockeoActivo}
                  onLimpiar={() => setTiempoStockeo("")}
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="TIEMPO STOCKEO"
                    aria-label="TIEMPO STOCKEO"
                    value={tiempoStockeo}
                    onChange={(e) => handleTiempoStockeoChange(e.target.value)}
                    className={cn(INPUT_FILTER_CLASS, "w-full")}
                  />
                </FiltroIndividualContainer>
              </FilaFiltrosDesplegables>
            </FilterRowSelection>
          </FilterBar>
        }
      >
        {proveedorActivo ? (
          <TablaPedidoAFabrica
            sucursales={sucursales}
            productos={productos}
            pagina={pagina}
            totalPaginas={totalPaginas}
            onPaginaChange={setPagina}
            loading={loading}
            emptyMessage="Este proveedor no tiene productos en la lista de precios."
            tiempoEntregaEnDias={tiempoEntregaEnDias}
            tiempoStockeo={
              tiempoStockeoNumero != null &&
              Number.isFinite(tiempoStockeoNumero)
                ? tiempoStockeoNumero
                : null
            }
            cantAPedirByCodExt={cantAPedirByCodExt}
            onCantAPedirChange={handleCantAPedirChange}
            onAplicarCantSugerida={handleAplicarCantSugerida}
          />
        ) : (
          <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-border bg-card p-6 shadow-sm">
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Seleccioná un proveedor de fábrica para ver sus productos.
            </p>
          </div>
        )}
      </ClassicFilteredTableLayout>

      <InfoPromedioPedidoAFabricaModal
        open={infoPromedioOpen}
        onOpenChange={setInfoPromedioOpen}
      />
    </>
  );
}
