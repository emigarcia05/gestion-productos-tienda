import { prisma } from "@/lib/prisma";
import { filtroTexto } from "@/lib/busqueda";
import CrearProveedorModal from "@/components/proveedores/CrearProveedorModal";
import ImportarModal from "@/components/proveedores/ImportarModal";
import TablaProductosFiltrada from "@/components/proveedores/TablaProductosFiltrada";
import TablaListaPreciosConPedido from "@/components/proveedores/TablaListaPreciosConPedido";
import FiltrosProductos from "@/components/proveedores/FiltrosProductos";
import BuscadorSimple from "@/components/proveedores/BuscadorSimple";
import PaginacionProductos from "@/components/proveedores/PaginacionProductos";
import AccionMasivaModal from "@/components/proveedores/AccionMasivaModal";
import PageHeader from "@/components/PageHeader";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { Package } from "lucide-react";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ q?: string; proveedor?: string; pagina?: string }>;
}

export default async function ProveedoresPage({ searchParams }: Props) {
  const { q = "", proveedor = "", pagina = "1" } = await searchParams;
  const paginaNum = Math.max(1, parseInt(pagina) || 1);
  const skip = (paginaNum - 1) * PAGE_SIZE;
  const rol = await getRol();
  const p = PERMISOS.proveedores;
  const esEditor = rol === "editor";

  const where = {
    ...(proveedor ? { proveedorId: proveedor } : {}),
    ...(q ? filtroTexto(q, ["descripcion", "codExt", "codProdProv"]) : {}),
  };

  // Vista simple: solo productos con precio sugerido, ordenados por proveedor
  const whereSimple = {
    precioVentaSugerido: { gt: 0 },
    ...(q ? filtroTexto(q, ["descripcion"]) : {}),
  };

  const [proveedores, productos, total] = await Promise.all([
    prisma.proveedor.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    }),
    esEditor
      ? prisma.producto.findMany({
          where,
          orderBy: { codExt: "asc" },
          skip,
          take: PAGE_SIZE,
          include: { proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } } },
        })
      : prisma.producto.findMany({
          where: whereSimple,
          orderBy: [{ proveedor: { nombre: "asc" } }, { descripcion: "asc" }],
          skip,
          take: PAGE_SIZE,
          include: { proveedor: { select: { id: true, nombre: true, codigoUnico: true, sufijo: true } } },
        }),
    esEditor
      ? prisma.producto.count({ where })
      : prisma.producto.count({ where: whereSimple }),
  ]);

  const totalPaginas = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PageHeader
        volverHref="/"
        titulo={esEditor ? "Lista Proveedores" : "Consulta Px Sugeridos"}
        subtitulo={`${total.toLocaleString()} producto${total !== 1 ? "s" : ""}`}
        tabs={[{ label: esEditor ? "Lista Proveedores" : "Consulta Px Sugeridos", active: true, icon: <Package className="h-3.5 w-3.5 text-accent2" /> }]}
        accionesBarra={
          esEditor ? (
            <>
              {puede(rol, p.acciones.nuevoProveedor) && <CrearProveedorModal />}
              {puede(rol, p.acciones.importarLista) && <ImportarModal proveedores={proveedores} />}
            </>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-3 pb-2">
        {esEditor ? (
          <FiltrosProductos
            proveedores={proveedores}
            totalProductos={total}
            qActual={q}
            proveedorActual={proveedor}
            accionMasivaSlot={
              puede(rol, p.acciones.accionMasiva) ? (
                <AccionMasivaModal
                  proveedores={proveedores}
                  filtroProveedorActual={proveedor}
                  filtroBusquedaActual={q}
                  totalFiltrado={total}
                />
              ) : undefined
            }
          />
        ) : (
          <BuscadorSimple qActual={q} totalProductos={total} />
        )}
      </div>

      {/* Tabla con scroll interno */}
      <div className="flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-3 pt-3">
        {esEditor
          ? <TablaProductosFiltrada productos={productos} rol={rol} />
          : <TablaListaPreciosConPedido productos={productos} />
        }
      </div>

      {/* Paginación fija abajo */}
      <div className="shrink-0 border-t border-border/50 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
        <PaginacionProductos
          paginaActual={paginaNum}
          totalPaginas={totalPaginas}
          total={total}
          pageSize={PAGE_SIZE}
          q={q}
          proveedor={esEditor ? proveedor : ""}
        />
      </div>
    </div>
  );
}
