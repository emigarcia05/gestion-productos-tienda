import { redirect } from "next/navigation";
import { GP_ROUTES } from "@/lib/gestionProductosRoutes";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getArbolCategorias } from "@/services/categoriasComparacion.service";
import GestionCategoriasPageClient from "@/components/proveedores/comparacion-categorias/GestionCategoriasPageClient";

export const dynamic = "force-dynamic";

export default async function CategoriasComparacionPage() {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.editar)) {
    redirect(GP_ROUTES.analisisPrecios.compCategorias.comparacion);
  }

  const arbol = await getArbolCategorias();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <GestionCategoriasPageClient arbolInicial={arbol} esEditor={rol === "editor"} />
    </div>
  );
}
