"use client";

import { useEffect, useState, startTransition } from "react";
import { Info } from "lucide-react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import FilterBar, {
  FilaFiltrosDesplegables,
  FilterRowSearch,
  FilterRowSelection,
  FiltroIndividualContainer,
  FILTER_COUNT_CLASS,
  FILTER_SELECT_WRAPPER_CLASS,
  INPUT_FILTER_CLASS,
  LimpiarFiltrosButton,
  SELECT_TRIGGER_FILTER_CLASS,
} from "@/components/FilterBar";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ToolbarActionButton from "@/components/shared/ToolbarActionButton";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";
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

const FILTRO_TODOS = "none";
const DEBOUNCE_BUSQUEDA_MS = 350;

/** Solo dígitos (enteros ≥ 0); vacío permitido. */
function sanitizeTiempoStockeoInput(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Módulo **Pedido A Fáb.** (pilar sidebar Administración).
 * Filtros 1: **PROVEEDOR** + **TIEMPO STOCKEO**.
 * Filtros 2: **MARCA** | **RUBRO** | **SUB-RUBRO** + buscar por descripción.
 */
export default function PedidoAFabricaPageClient({
  proveedoresFabrica,
  sucursalesPedido,
}: Props) {
  const [proveedorId, setProveedorId] = useState<string>("");
  const [tiempoStockeo, setTiempoStockeo] = useState<string>("");
  const [marca, setMarca] = useState(FILTRO_TODOS);
  const [rubro, setRubro] = useState(FILTRO_TODOS);
  const [subRubro, setSubRubro] = useState(FILTRO_TODOS);
  const [qDebounced, setQDebounced] = useState("");
  const [pagina, setPagina] = useState(1);
  const [sucursales, setSucursales] =
    useState<SucursalPedidoAFabrica[]>(sucursalesPedido);
  const [productos, setProductos] = useState<ProductoPedidoAFabricaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [rubros, setRubros] = useState<string[]>([]);
  const [subRubros, setSubRubros] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [infoPromedioOpen, setInfoPromedioOpen] = useState(false);
  const [cantAPedirByCodExt, setCantAPedirByCodExt] = useState<
    Record<string, string>
  >({});

  const {
    q,
    setQ,
    ref: inputBusquedaRef,
    handleQChange,
    isDebouncing,
  } = useFiltrosConBusqueda({
    qActual: qDebounced,
    debounceMs: DEBOUNCE_BUSQUEDA_MS,
    onDebouncedSearch: (value) => {
      setQDebounced(value);
      setPagina(1);
    },
  });

  const proveedorActivo = proveedorId !== "";
  const tiempoStockeoActivo = tiempoStockeo !== "";
  const marcaActiva = marca !== FILTRO_TODOS;
  const rubroActivo = rubro !== FILTRO_TODOS;
  const subRubroActivo = subRubro !== FILTRO_TODOS;
  const busquedaActiva = qDebounced.trim() !== "";
  const hayFiltrosCatalogo =
    marcaActiva || rubroActivo || subRubroActivo || busquedaActiva || q !== "";

  const proveedorSeleccionado = proveedoresFabrica.find(
    (p) => p.id === proveedorId
  );
  const tiempoEntregaEnDias =
    proveedorSeleccionado?.tiempoEntregaEnDias ?? null;
  const tiempoStockeoNumero =
    tiempoStockeo === "" ? null : Number(tiempoStockeo);

  function resetFiltrosCatalogo() {
    setMarca(FILTRO_TODOS);
    setRubro(FILTRO_TODOS);
    setSubRubro(FILTRO_TODOS);
    setQ("");
    setQDebounced("");
  }

  function handleProveedorChange(value: string) {
    setProveedorId(value);
    setPagina(1);
    setCantAPedirByCodExt({});
    resetFiltrosCatalogo();
  }

  function handleLimpiarProveedor() {
    setProveedorId("");
    setPagina(1);
    setProductos([]);
    setTotal(0);
    setTotalPaginas(0);
    setSucursales(sucursalesPedido);
    setMarcas([]);
    setRubros([]);
    setSubRubros([]);
    setCantAPedirByCodExt({});
    resetFiltrosCatalogo();
  }

  function handleTiempoStockeoChange(raw: string) {
    setTiempoStockeo(sanitizeTiempoStockeoInput(raw));
  }

  function handleMarcaChange(value: string) {
    setMarca(value);
    setRubro(FILTRO_TODOS);
    setSubRubro(FILTRO_TODOS);
    setPagina(1);
  }

  function handleRubroChange(value: string) {
    setRubro(value);
    setSubRubro(FILTRO_TODOS);
    setPagina(1);
  }

  function handleSubRubroChange(value: string) {
    setSubRubro(value);
    setPagina(1);
  }

  function limpiarFiltrosCatalogo() {
    resetFiltrosCatalogo();
    setPagina(1);
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
        setTotal(0);
        setTotalPaginas(0);
        setLoading(false);
        setSucursales(sucursalesPedido);
        setMarcas([]);
        setRubros([]);
        setSubRubros([]);
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
          marca: marcaActiva ? marca : undefined,
          rubro: rubroActivo ? rubro : undefined,
          subRubro: subRubroActivo ? subRubro : undefined,
          q: qDebounced.trim() || undefined,
        });
        if (cancelled) return;
        setSucursales(
          res.sucursales.length > 0 ? res.sucursales : sucursalesPedido
        );
        setProductos(res.productos);
        setTotal(res.total);
        setTotalPaginas(res.totalPaginas);
        setMarcas(res.marcas);
        setRubros(res.rubros);
        setSubRubros(res.subRubros);
        setLoading(false);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [
    proveedorId,
    pagina,
    marca,
    rubro,
    subRubro,
    marcaActiva,
    rubroActivo,
    subRubroActivo,
    qDebounced,
    sucursalesPedido,
  ]);

  return (
    <>
      <ClassicFilteredTableLayout
        title="PEDIDO A FÁB."
        subtitle="Pedido A Fáb."
        contentWidth="full"
        actions={
          <ToolbarActionButton
            type="button"
            label="Info Formulas"
            icon={<Info aria-hidden />}
            className="h-10 px-4"
            onClick={() => setInfoPromedioOpen(true)}
          />
        }
        filters={
          <div className="flex flex-col gap-2">
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
                              ? `[${p.prefijo}] ${p.nombre}`.toLocaleUpperCase(
                                  "es"
                                )
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
                      onChange={(e) =>
                        handleTiempoStockeoChange(e.target.value)
                      }
                      className={cn(INPUT_FILTER_CLASS, "w-full")}
                    />
                  </FiltroIndividualContainer>
                </FilaFiltrosDesplegables>
              </FilterRowSelection>
            </FilterBar>

            <FilterBar className="filtros-contenedor-tienda bg-card">
              <FilterRowSelection>
                <FilaFiltrosDesplegables columnas={5}>
                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={marcaActiva}
                    onLimpiar={() => {
                      setMarca(FILTRO_TODOS);
                      setRubro(FILTRO_TODOS);
                      setSubRubro(FILTRO_TODOS);
                      setPagina(1);
                    }}
                  >
                    <Select
                      value={marca}
                      onValueChange={handleMarcaChange}
                      disabled={!proveedorActivo}
                    >
                      <SelectTrigger
                        className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                        aria-label="MARCA"
                      >
                        <SelectValue placeholder="MARCA" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        <SelectItem value={FILTRO_TODOS}>MARCA</SelectItem>
                        {marcas.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m.toLocaleUpperCase("es")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>

                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={rubroActivo}
                    onLimpiar={() => {
                      setRubro(FILTRO_TODOS);
                      setSubRubro(FILTRO_TODOS);
                      setPagina(1);
                    }}
                  >
                    <Select
                      value={rubro}
                      onValueChange={handleRubroChange}
                      disabled={!proveedorActivo}
                    >
                      <SelectTrigger
                        className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                        aria-label="RUBRO"
                      >
                        <SelectValue placeholder="RUBRO" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        <SelectItem value={FILTRO_TODOS}>RUBRO</SelectItem>
                        {rubros.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.toLocaleUpperCase("es")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>

                  <FiltroIndividualContainer
                    className={FILTER_SELECT_WRAPPER_CLASS}
                    activo={subRubroActivo}
                    onLimpiar={() => {
                      setSubRubro(FILTRO_TODOS);
                      setPagina(1);
                    }}
                  >
                    <Select
                      value={subRubro}
                      onValueChange={handleSubRubroChange}
                      disabled={!proveedorActivo}
                    >
                      <SelectTrigger
                        className={cn(SELECT_TRIGGER_FILTER_CLASS, "w-full")}
                        aria-label="SUB-RUBRO"
                      >
                        <SelectValue placeholder="SUB-RUBRO" />
                      </SelectTrigger>
                      <SelectContent
                        position="popper"
                        side="bottom"
                        align="start"
                        className="select-content-filtro"
                      >
                        <SelectItem value={FILTRO_TODOS}>SUB-RUBRO</SelectItem>
                        {subRubros.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.toLocaleUpperCase("es")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FiltroIndividualContainer>
                </FilaFiltrosDesplegables>
              </FilterRowSelection>

              <div className="flex items-center gap-3">
                <FilterRowSearch className="flex-1">
                  <FiltroBusquedaInput
                    id="filtro-pedido-a-fabrica-descripcion"
                    placeholder="Buscar por descripción..."
                    value={q}
                    onChange={handleQChange}
                    isDebouncing={isDebouncing}
                    inputRef={inputBusquedaRef}
                    disabled={!proveedorActivo}
                  />
                </FilterRowSearch>
                <LimpiarFiltrosButton
                  visible={hayFiltrosCatalogo}
                  onClick={limpiarFiltrosCatalogo}
                />
                <span className={cn(FILTER_COUNT_CLASS, "ml-auto")}>
                  {total.toLocaleString("es-AR")} PRODUCTO
                  {total === 1 ? "" : "S"}
                </span>
              </div>
            </FilterBar>
          </div>
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
