"use client";

import { useEffect, useState } from "react";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GenerarPedidoToolbarButton from "@/components/pedidos/GenerarPedidoToolbarButton";
import TablaPedidoUrgente from "@/components/pedidos/TablaPedidoUrgente";
import PaginacionTabla from "@/components/shared/PaginacionTabla";
import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ProductoPedidoUrgente } from "@/components/pedidos/TablaPedidoUrgente";
import CantidadPedidoUrgenteModal, {
  type ProductoPedidoUrgenteModal,
} from "@/components/pedidos/CantidadPedidoUrgenteModal";
import { toast } from "sonner";
import { upsertPedidoUrgenteMercaderiaItemAction } from "@/actions/pedidos";

interface Props {
  filters: React.ReactNode;
  productos: ProductoPedidoUrgente[];
  proveedores: { id: string; nombre: string; prefijo: string }[];
  sucursalValida: "" | "guaymallen" | "maipu";
  /** True cuando no hay sucursal seleccionada (único filtro obligatorio para listar). */
  sinFiltros: boolean;
  pedidoValida: "cualquier" | "urgente" | "reposicion" | "";
  total: number;
  totalPaginas: number;
  paginaNum: number;
  proveedor: string;
  q: string;
}

const MENSAJE_SIN_FILTROS =
  "Seleccioná una sucursal para ver los productos.";

interface SugerenciaProveedorMenorCosto {
  /** `prod_precios_provee.cod_ext` del proveedor recomendado (menor precio comparable). */
  listaPrecioProveedorIdMenorCosto: string;
  /** `prod_precios_provee.cod_ext` de la fila sobre la que el usuario hizo doble clic (proveedor elegido en tabla). */
  listaPrecioProveedorIdOriginal: string;
  proveedorNombre: string;
  costo: number;
  descripcion: string;
}

export default function PedidoUrgentePageClient({
  filters,
  productos,
  proveedores,
  sucursalValida,
  sinFiltros,
  pedidoValida,
  total,
  totalPaginas,
  paginaNum,
  proveedor,
  q,
}: Props) {
  const [cantPorId, setCantPorId] = useState<Record<string, string>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] =
    useState<ProductoPedidoUrgenteModal | null>(null);
  const [modalSugerenciaOpen, setModalSugerenciaOpen] = useState(false);
  const [sugerenciaProveedorMenorCosto, setSugerenciaProveedorMenorCosto] =
    useState<SugerenciaProveedorMenorCosto | null>(null);
  const [modalElegirProveedorOpen, setModalElegirProveedorOpen] = useState(false);
  const [grupoParaElegirProveedor, setGrupoParaElegirProveedor] =
    useState<ProductoPedidoUrgente | null>(null);

  useEffect(() => {
    if (productos.length === 0) return;
    queueMicrotask(() => {
      setCantPorId((prev) => {
        const next = { ...prev };
        for (const p of productos) {
          const ids =
            p.miembrosAgrupacion && p.miembrosAgrupacion.length > 0
              ? p.miembrosAgrupacion.map((m) => m.codExt)
              : [p.id];
          for (const id of ids) {
            if (next[id] !== undefined) continue;
            let cant = 0;
            if (p.miembrosAgrupacion && p.miembrosAgrupacion.length > 0) {
              const miembro = p.miembrosAgrupacion.find((m) => m.codExt === id);
              cant = Math.max(0, Math.floor(Number(miembro?.cantPedidaUrgente) || 0));
            } else {
              cant = Math.max(0, Math.floor(Number(p.cantPedidaUrgente) || 0));
            }
            next[id] = cant > 0 ? String(cant) : "";
          }
        }
        return next;
      });
    });
  }, [productos]);

  const actions = (
    <GenerarPedidoToolbarButton
      proveedores={proveedores}
      defaultSucursal={sucursalValida}
      defaultProveedor={proveedor}
      defaultTipos={[]}
      modulo="urgente"
    />
  );

  function productoDesdeMiembroGrupo(
    grupo: ProductoPedidoUrgente,
    miembro: NonNullable<ProductoPedidoUrgente["miembrosAgrupacion"]>[number]
  ): ProductoPedidoUrgente {
    return {
      id: miembro.codExt,
      codExt: miembro.codExt,
      prefijo: miembro.prefijo,
      descripcion: grupo.descripcion,
      pxCompraFinalSinIva: miembro.pxCompraFinalSinIva,
      cantPedidaUrgente: miembro.cantPedidaUrgente,
      confReposicion: grupo.confReposicion,
      cantReposicion: grupo.cantReposicion,
      estaVinculadoTienda: miembro.estaVinculadoTienda,
      sugerenciaProveedorMenorCosto: miembro.sugerenciaProveedorMenorCosto,
    };
  }

  function abrirModalCantidadDirecto(
    prod: ProductoPedidoUrgente,
    listaPrecioProveedorIdOverride?: string
  ) {
    setProductoSeleccionado({
      id: listaPrecioProveedorIdOverride ?? prod.id,
      descripcion: prod.descripcion,
    });
    setModalOpen(true);
  }

  function abrirModalCantidad(prod: ProductoPedidoUrgente) {
    if (prod.miembrosAgrupacion && prod.miembrosAgrupacion.length > 1) {
      setGrupoParaElegirProveedor(prod);
      setModalElegirProveedorOpen(true);
      return;
    }
    const sugerencia = prod.sugerenciaProveedorMenorCosto;
    if (prod.estaVinculadoTienda && sugerencia) {
      setSugerenciaProveedorMenorCosto({
        listaPrecioProveedorIdMenorCosto: sugerencia.listaPrecioProveedorId,
        listaPrecioProveedorIdOriginal: prod.id,
        proveedorNombre: sugerencia.proveedorNombre,
        costo: sugerencia.costo,
        descripcion: prod.descripcion,
      });
      setModalSugerenciaOpen(true);
      return;
    }
    abrirModalCantidadDirecto(prod);
  }

  /** Abre cantidad para el proveedor sugerido (menor costo). */
  function pedirAlProveedorMenorCostoSugerido() {
    if (!sugerenciaProveedorMenorCosto) return;
    const s = sugerenciaProveedorMenorCosto;
    const fakeProd: ProductoPedidoUrgente = {
      id: s.listaPrecioProveedorIdMenorCosto,
      codExt: "",
      prefijo: "",
      descripcion: s.descripcion,
      pxCompraFinalSinIva: s.costo,
      cantPedidaUrgente: 0,
      confReposicion: false,
      cantReposicion: 0,
      estaVinculadoTienda: true,
      sugerenciaProveedorMenorCosto: null,
    };
    setModalSugerenciaOpen(false);
    abrirModalCantidadDirecto(fakeProd, s.listaPrecioProveedorIdMenorCosto);
  }

  /** Mantiene la fila que el usuario eligió en la tabla (doble clic). */
  function continuarConProveedorSeleccionado() {
    if (!sugerenciaProveedorMenorCosto) return;
    const origId = sugerenciaProveedorMenorCosto.listaPrecioProveedorIdOriginal;
    setModalSugerenciaOpen(false);
    const prodOriginal = productos.find((p) => p.id === origId);
    if (prodOriginal) {
      abrirModalCantidadDirecto(prodOriginal);
      return;
    }
    const s = sugerenciaProveedorMenorCosto;
    const fakeProd: ProductoPedidoUrgente = {
      id: origId,
      codExt: "",
      prefijo: "",
      descripcion: s.descripcion,
      pxCompraFinalSinIva: null,
      cantPedidaUrgente: 0,
      confReposicion: false,
      cantReposicion: 0,
      estaVinculadoTienda: true,
      sugerenciaProveedorMenorCosto: null,
    };
    abrirModalCantidadDirecto(fakeProd);
  }

  async function borrarCantidad(prod: ProductoPedidoUrgente) {
    if (!sucursalValida) {
      toast.error("Seleccioná una sucursal para guardar.");
      return;
    }
    const codExtsABorrar =
      prod.miembrosAgrupacion && prod.miembrosAgrupacion.length > 0
        ? prod.miembrosAgrupacion
            .map((m) => m.codExt)
            .filter((ce) => Number(cantPorId[ce] || 0) > 0)
        : [prod.id];
    if (codExtsABorrar.length === 0) return;

    const prevValues: Record<string, string> = {};
    for (const ce of codExtsABorrar) {
      prevValues[ce] = cantPorId[ce] ?? "";
    }
    setCantPorId((prev) => {
      const next = { ...prev };
      for (const ce of codExtsABorrar) {
        next[ce] = "";
      }
      return next;
    });

    for (const ce of codExtsABorrar) {
      const res = await upsertPedidoUrgenteMercaderiaItemAction({
        sucursal: sucursalValida,
        listaPrecioProveedorId: ce,
        cant: 0,
      });
      if (!res.ok) {
        setCantPorId((prev) => {
          const next = { ...prev };
          for (const c of codExtsABorrar) {
            next[c] = prevValues[c] ?? "";
          }
          return next;
        });
        toast.error(res.error ?? "Error al borrar.");
        return;
      }
    }
    toast.success(codExtsABorrar.length > 1 ? "Ítems borrados." : "Ítem borrado.");
  }

  async function confirmarCantidad(cantidad: number) {
    if (!productoSeleccionado) return;
    if (!sucursalValida) {
      toast.error("Seleccioná una sucursal para guardar.");
      return;
    }
    const id = productoSeleccionado.id;
    const prevValue = cantPorId[id];
    setCantPorId((prev) => ({ ...prev, [id]: cantidad > 0 ? String(cantidad) : "" }));

    const res = await upsertPedidoUrgenteMercaderiaItemAction({
      sucursal: sucursalValida,
      listaPrecioProveedorId: id,
      cant: cantidad,
    });
    if (!res.ok) {
      setCantPorId((prev) => ({ ...prev, [id]: prevValue ?? "" }));
      toast.error(res.error ?? "Error al guardar.");
      return;
    }
    toast.success("Ítem guardado.");
  }

  return (
    <ClassicFilteredTableLayout
      title="Pedido Mercadería"
      subtitle="Pedido Urgente"
      actions={actions}
      filters={filters}
    >
      <div className="flex h-full min-h-0 flex-col gap-0.5">
        <div className="contenedor-tabla-gestion no-scroll-x flex-1 min-h-0">
          <TablaPedidoUrgente
            productos={productos}
            sinFiltros={sinFiltros}
            mensajeSinSucursal={MENSAJE_SIN_FILTROS}
            cantPorId={cantPorId}
            onRowDoubleClick={abrirModalCantidad}
            onRowDeleteClick={borrarCantidad}
          />
        </div>
        {!sinFiltros && sucursalValida && totalPaginas > 1 ? (
          <div className="flex justify-end pt-2 shrink-0">
            <PaginacionTabla
              basePath="/gestion-productos/pedidos/urgente"
              params={{
                sucursal: sucursalValida,
                proveedor,
                q,
                pedido: pedidoValida,
              }}
              paginaActual={paginaNum}
              totalPaginas={totalPaginas}
              total={total}
              pageSize={PAGE_SIZE}
            />
          </div>
        ) : null}
        <CantidadPedidoUrgenteModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          producto={productoSeleccionado}
          onConfirmar={confirmarCantidad}
        />
        <Dialog
          open={modalElegirProveedorOpen}
          onOpenChange={(open) => {
            setModalElegirProveedorOpen(open);
            if (!open) setGrupoParaElegirProveedor(null);
          }}
        >
          <AppModal
            title="Elegir Proveedor"
            size="md"
            actions={
              <div className="flex w-full justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalElegirProveedorOpen(false);
                    setGrupoParaElegirProveedor(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-1 text-sm text-foreground">
              <p className="text-muted-foreground">
                Elegí proveedor para cargar o editar la cantidad pedida.
              </p>
              <ul className="flex flex-col divide-y divide-border border border-border rounded-md overflow-hidden">
                {grupoParaElegirProveedor?.miembrosAgrupacion?.map((m, idx) => (
                  <li key={m.codExt} className="bg-card">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">Proveedor {idx + 1}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {m.prefijo || m.codExt}
                        </div>
                      </div>
                      <Button
                        type="button"
                        className="btn-primario-gestion shrink-0"
                        onClick={() => {
                          const g = grupoParaElegirProveedor;
                          setModalElegirProveedorOpen(false);
                          setGrupoParaElegirProveedor(null);
                          if (!g) return;
                          abrirModalCantidad(productoDesdeMiembroGrupo(g, m));
                        }}
                      >
                        Pedir A Este Proveedor
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </AppModal>
        </Dialog>
        <Dialog open={modalSugerenciaOpen} onOpenChange={setModalSugerenciaOpen}>
          <AppModal
            title="Proveedor Recomendado"
            size="md"
            actions={
              <div className="flex w-full justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setModalSugerenciaOpen(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={continuarConProveedorSeleccionado}>
                  Continuar Con Proveedor Seleccionado
                </Button>
              </div>
            }
          >
            <div className="flex flex-col gap-4 text-sm text-foreground">
              <p>En estos momentos, para este producto tiene prioridad el proveedor</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-foreground">
                  {sugerenciaProveedorMenorCosto?.proveedorNombre ?? ""}
                </span>
                <Button
                  type="button"
                  className="btn-primario-gestion"
                  onClick={pedirAlProveedorMenorCostoSugerido}
                >
                  Pedir a Este Proveedor
                </Button>
              </div>
            </div>
          </AppModal>
        </Dialog>
      </div>
    </ClassicFilteredTableLayout>
  );
}
