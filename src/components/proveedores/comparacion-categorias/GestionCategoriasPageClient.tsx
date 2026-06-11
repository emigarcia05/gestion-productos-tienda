"use client";

import ComparacionCategoriasCatalogoPageClient from "@/components/proveedores/comparacion-categorias/ComparacionCategoriasCatalogoPageClient";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";

interface Props {
  arbolInicial: CategoriaComparacionTree[];
  esEditor: boolean;
}

export default function GestionCategoriasPageClient({ arbolInicial, esEditor }: Props) {
  return (
    <ComparacionCategoriasCatalogoPageClient arbolInicial={arbolInicial} esEditor={esEditor} />
  );
}
