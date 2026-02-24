import Link from "next/link";
import Image from "next/image";
import { Handshake, ShoppingBag } from "lucide-react";
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
          className="flex flex-col items-center justify-between w-44 h-56 rounded-2xl border-2 border-brand bg-card/80 hover:shadow-lg hover:shadow-brand/20 hover:scale-105 transition-all duration-200 p-5 group"
        >
          <div className="flex-1 flex items-center justify-center w-full">
            <Handshake className="w-16 h-16 text-brand transition-colors" />
          </div>
          <span className="text-base font-medium text-accent2 text-center leading-tight">
            Lista Proveedores
          </span>
        </Link>

        <Link
          href="/tienda"
          className="flex flex-col items-center justify-between w-44 h-56 rounded-2xl border-2 border-brand bg-card/80 hover:shadow-lg hover:shadow-brand/20 hover:scale-105 transition-all duration-200 p-5 group"
        >
          <div className="flex-1 flex items-center justify-center w-full">
            <ShoppingBag className="w-16 h-16 text-brand transition-colors" />
          </div>
          <span className="text-base font-medium text-accent2 text-center leading-tight">
            Lista TiendaColor
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
