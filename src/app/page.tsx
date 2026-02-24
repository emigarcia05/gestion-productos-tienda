import Link from "next/link";
import Image from "next/image";
import { Handshake, ShoppingBag, ClipboardList, PackageSearch } from "lucide-react";
import SelectorRol from "@/components/SelectorRol";
import { getRol } from "@/lib/sesion";
import { PERMISOS, puede } from "@/lib/permisos";

export default async function HomePage() {
  const rol = await getRol();

  const tarjeta = "flex flex-col items-center justify-between w-44 h-56 rounded-2xl border-2 border-brand bg-card/80 hover:shadow-lg hover:shadow-brand/20 hover:scale-105 transition-all duration-200 p-5 group";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Selector de rol — centrado en la parte superior */}
      <div className="flex justify-center pt-6">
        <SelectorRol rolActual={rol} />
      </div>

      {/* Botones de navegación — centrados verticalmente en el resto */}
      <div className="flex-1 flex items-center justify-center gap-6 flex-wrap px-6">

        {/* 1. Lista Proveedores — simple y editor */}
        <Link href="/proveedores" className={tarjeta}>
          <div className="flex-1 flex items-center justify-center w-full">
            <Handshake className="w-16 h-16 text-brand transition-colors" />
          </div>
          <span className="text-base font-medium text-accent2 text-center leading-tight">
            Lista Proveedores
          </span>
        </Link>

        {/* 2. Lista TiendaColor — solo editor */}
        {puede(rol, PERMISOS.tienda.acceso) && (
          <Link href="/tienda" className={tarjeta}>
            <div className="flex-1 flex items-center justify-center w-full">
              <ShoppingBag className="w-16 h-16 text-brand transition-colors" />
            </div>
            <span className="text-base font-medium text-accent2 text-center leading-tight">
              Lista TiendaColor
            </span>
          </Link>
        )}

        {/* 3. Control Stock — simple y editor */}
        {puede(rol, PERMISOS.stock.acceso) && (
          <Link href="/stock" className={tarjeta}>
            <div className="flex-1 flex items-center justify-center w-full">
              <PackageSearch className="w-16 h-16 text-brand transition-colors" />
            </div>
            <span className="text-base font-medium text-accent2 text-center leading-tight">
              Control Stock
            </span>
          </Link>
        )}

        {/* 4. Pedidos a Proveedores — simple y editor */}
        <Link href="/pedidos" className={tarjeta}>
          <div className="flex-1 flex items-center justify-center w-full">
            <ClipboardList className="w-16 h-16 text-brand transition-colors" />
          </div>
          <span className="text-base font-medium text-accent2 text-center leading-tight">
            Pedidos a Proveedores
          </span>
        </Link>

      </div>

      {/* Logo — ocupa el espacio restante hasta el final, logo centrado */}
      <div className="flex-1 flex items-center justify-center">
        <Image
          src="/logo_tiendacolor_png.png"
          alt="TiendaColor"
          width={140}
          height={50}
          className="w-32 h-auto object-contain"
          priority
        />
      </div>
    </div>
  );
}
