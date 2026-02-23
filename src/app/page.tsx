import Link from "next/link";
import { Building2, ShoppingBag } from "lucide-react";
import SelectorRol from "@/components/SelectorRol";
import { getRol } from "@/lib/sesion";

export default async function HomePage() {
  const rol = await getRol();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Selector de rol — centrado en la parte superior */}
      <div className="flex justify-center pt-6">
        <SelectorRol rolActual={rol} />
      </div>

      {/* Botones de navegación — centrados verticalmente en el resto */}
      <div className="flex-1 flex items-center justify-center gap-6">

        <Link
          href="/proveedores"
          className="flex flex-col items-center justify-between w-44 h-56 rounded-2xl border border-border/60 bg-card/80 hover:bg-card hover:border-border hover:shadow-lg transition-all duration-200 p-5 group"
        >
          <div className="flex-1 flex items-center justify-center w-full">
            <Building2 className="w-16 h-16 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
            Lista de Proveedores
          </span>
        </Link>

        <Link
          href="/tienda"
          className="flex flex-col items-center justify-between w-44 h-56 rounded-2xl border border-border/60 bg-card/80 hover:bg-card hover:border-border hover:shadow-lg transition-all duration-200 p-5 group"
        >
          <div className="flex-1 flex items-center justify-center w-full">
            <ShoppingBag className="w-16 h-16 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
            Lista TiendaColor
          </span>
        </Link>

      </div>
    </div>
  );
}
