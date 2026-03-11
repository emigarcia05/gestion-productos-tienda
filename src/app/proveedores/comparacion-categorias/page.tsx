import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getArbolCategorias, getMarcasFromListaTienda } from "@/services/categoriasComparacion.service";
import ComparacionCategoriasClient from "@/components/proveedores/ComparacionCategoriasClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    marca?: string;
    categoriaId?: string;
    subcategoriaId?: string;
    presentacionId?: string;
    q?: string;
  }>;
}

export default async function ComparacionCategoriasPage({ searchParams }: Props) {
  const rol = await getRol();
  if (!puede(rol, PERMISOS.comparacionCategorias.acceso)) {
    redirect("/proveedores");
  }

  const [arbol, marcas] = await Promise.all([
    getArbolCategorias(),
    getMarcasFromListaTienda(),
  ]);

  const { marca = "", categoriaId = "", subcategoriaId = "", presentacionId = "", q = "" } =
    await searchParams;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ComparacionCategoriasClient
        arbolInicial={arbol}
        rol={rol}
        marcas={marcas}
        marcaInicial={marca}
        categoriaIdInicial={categoriaId}
        subcategoriaIdInicial={subcategoriaId}
        presentacionIdInicial={presentacionId}
        qInicial={q}
      />
    </div>
  );
}
