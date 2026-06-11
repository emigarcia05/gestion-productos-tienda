"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import GestionCategoriasModal from "@/components/proveedores/comparacion-categorias/GestionCategoriasModal";
import type { CategoriaComparacionTree } from "@/services/categoriasComparacion.service";

interface Props {
  arbolInicial: CategoriaComparacionTree[];
}

export default function GestionCategoriasPageClient({ arbolInicial }: Props) {
  const router = useRouter();
  const [arbol, setArbol] = useState(arbolInicial);

  useEffect(() => {
    setArbol(arbolInicial);
  }, [arbolInicial]);

  const onSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <ClassicFilteredTableLayout title="Lista Proveedores" subtitle="Categorias">
      <GestionCategoriasModal
        variant="page"
        open
        onOpenChange={() => {}}
        arbol={arbol}
        onSuccess={onSuccess}
      />
    </ClassicFilteredTableLayout>
  );
}
