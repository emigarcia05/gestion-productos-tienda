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
                <th className="w-20">PROVEEDOR</th>
                <th className="w-32">COD. EXT.</th>
                <th className="min-w-[20rem]">DESCRIPCION</th>
                <th className="w-28">PX LISTA</th>
                <th className="w-28">DESC. PROD.</th>
                <th className="w-28">DESC. CANT.</th>
                <th className="w-32">CX. APROX TRANSPORTE</th>
                <th className="w-32">PX COMPRA FINAL</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.id}>
                  <td className="py-2 px-3 text-xs font-mono">
                    {fila.proveedor?.sufijo ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-xs font-mono whitespace-nowrap">
                    {fila.codExt}
                  </td>
                  <td className="py-2 px-3 text-xs">
                    {fila.descripcionProveedor}
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                    ${fmtPrecio(Number(fila.pxListaProveedor))}
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                    {fmtNumero(fila.dtoProducto)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                    {fmtNumero(fila.dtoCantidad)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs text-right whitespace-nowrap">
                    {fmtNumero(fila.cxAproxTransporte)}%
                  </td>
                  <td className="py-2 px-3 tabular-nums text-xs font-bold text-right whitespace-nowrap">
                    ${fmtPrecio(Number(fila.pxCompraFinal ?? 0))}
                  </td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td
                    className="py-6 px-3 text-xs text-muted-foreground text-center"
                    colSpan={8}
                  >
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
