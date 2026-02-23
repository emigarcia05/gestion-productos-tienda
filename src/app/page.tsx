import Link from "next/link";
import { Building2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import SelectorRol from "@/components/SelectorRol";
import { getRol } from "@/lib/sesion";

export default async function HomePage() {
  const rol = await getRol();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <SelectorRol rolActual={rol} />
      <Button asChild size="lg" className="gap-2 text-base px-8">
        <Link href="/proveedores">
          <Building2 className="h-5 w-5" />
          Lista de Proveedores
        </Link>
      </Button>
      <Button asChild size="lg" variant="outline" className="gap-2 text-base px-8">
        <Link href="/tienda">
          <ShoppingBag className="h-5 w-5" />
          Lista TiendaColor
        </Link>
      </Button>
    </div>
  );
}
