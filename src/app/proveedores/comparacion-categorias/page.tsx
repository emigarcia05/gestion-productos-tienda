import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getArbolCategorias } from "@/services/categoriasComparacion.service";
import ComparacionCategoriasClient from "@/components/proveedores/ComparacionCategoriasClient";

export const dynamic = "force-dynamic";

export default async function ComparacionCategoriasPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    redirect("/gestion-productos/proveedores/sugeridos");
  }

  const arbol = await getArbolCategorias();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ComparacionCategoriasClient arbolInicial={arbol} rol={rol} />
    </div>
  );
}
