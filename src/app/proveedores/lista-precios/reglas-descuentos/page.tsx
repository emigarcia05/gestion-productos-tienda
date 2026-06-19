import { redirect } from "next/navigation";
import { getRol, esEditor } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import ReglasDescuentosListaPrecioPageClient from "@/components/proveedores/ReglasDescuentosListaPrecioPageClient";

export const dynamic = "force-dynamic";

export default async function ReglasDescuentosListaPrecioPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.proveedores.listaPrecios)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }
  if (!puede(rol, PERMISOS.listaPrecios.acciones.gestionarReglasDescuentos)) {
    redirect("/gestion-productos/proveedores/lista-precios");
  }
  if (!(await esEditor())) {
    redirect("/gestion-productos/proveedores/lista-precios");
  }

  return (
    <div className="area-page-shell">
      <ReglasDescuentosListaPrecioPageClient />
    </div>
  );
}
