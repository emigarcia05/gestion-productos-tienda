import { getProveedores } from "@/actions/proveedores";
import SectionHeader from "@/components/SectionHeader";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ImportarListaPreciosModal from "@/components/proveedores/ImportarListaPreciosModal";
import { prisma } from "@/lib/prisma";
import { fmtPrecio, fmtNumero } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol] = await Promise.all([getProveedores(), getRol()]);
  const p = PERMISOS.listaPrecios;

  const filas = await prisma.listaPrecioProveedor.findMany({
    include: { proveedor: true },
    orderBy: { codExt: "asc" },
  });

  const acciones =
    puede(rol, p.acciones.importarLista) ? (
      <ImportarListaPreciosModal proveedores={proveedores} />
    ) : undefined;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <SectionHeader
        titulo="Lista Proveedores"
        subtitulo="Lista Px Proveedores"
        actions={acciones}
      />
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
        <div className="h-full overflow-auto rounded-lg border bg-white shadow-sm">
          <table className="tabla-global w-full text-sm">
            <thead>
              <tr>
                <th className="w-24">PROVEEDOR</th>
                <th className="w-32">PX LISTA</th>
                <th className="w-40">DESC. POR PRODUCTO</th>
                <th className="w-44">DESC. POR CANTIDAD</th>
                <th className="w-56">CX APROX. TRANSPORTE</th>
                <th className="w-40">CX. COMPRA FINAL</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td className="py-2 px-3 text-xs font-mono">
                    {fila.proveedor?.sufijo ?? "—"}
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs whitespace-nowrap">
                    ${fmtPrecio(Number(fila.pxListaProveedor))}
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs whitespace-nowrap">
                    {fmtNumero(fila.dtoProducto)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs whitespace-nowrap">
                    {fmtNumero(fila.dtoCantidad)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs whitespace-nowrap">
                    {fmtNumero(fila.cxAproxTransporte)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs font-bold whitespace-nowrap">
                    ${fmtPrecio(Number(fila.pxCompraFinal ?? 0))}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td className="py-6 px-3 text-xs text-muted-foreground text-center" colSpan={6}>
                    No hay datos de lista de precios para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
