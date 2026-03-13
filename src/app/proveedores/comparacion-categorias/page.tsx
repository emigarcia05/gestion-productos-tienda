import { redirect } from "next/navigation";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";
import { getArbolCategorias } from "@/services/categoriasComparacion.service";
import { getProveedores } from "@/actions/proveedores";
import ComparacionCategoriasClient from "@/components/proveedores/ComparacionCategoriasClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    proveedor?: string;
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

  const [arbol, listaProveedores] = await Promise.all([
    getArbolCategorias(),
    getProveedores(),
  ]);

  const proveedores = listaProveedores.map((p) => ({ id: p.id, nombre: p.nombre }));

  const { proveedor = "", categoriaId = "", subcategoriaId = "", presentacionId = "", q = "" } =
    await searchParams;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <ComparacionCategoriasClient
        arbolInicial={arbol}
        rol={rol}
        proveedores={proveedores}
        proveedorInicial={proveedor}
        categoriaIdInicial={categoriaId}
        subcategoriaIdInicial={subcategoriaId}
        presentacionIdInicial={presentacionId}
        qInicial={q}
      />
    </div>
  );
}
