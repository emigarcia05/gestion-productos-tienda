import Link from "next/link";
import { Building2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
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
