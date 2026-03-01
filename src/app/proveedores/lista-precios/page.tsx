import { getProveedores } from "@/actions/proveedores";
import { getRol } from "@/lib/sesion";
import ListaPreciosPageClient from "@/components/proveedores/ListaPreciosPageClient";
import { getListaPreciosConTienda } from "@/services/listaPrecios.service";

export const dynamic = "force-dynamic";

export default async function ListaPreciosPage() {
  const [proveedores, rol, filasParaCliente] = await Promise.all([
    getProveedores(),
    getRol(),
    getListaPreciosConTienda(),
  ]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ListaPreciosPageClient
        filas={filasParaCliente}
        proveedores={proveedores}
        rol={rol}
      />
    </div>
  );
}
