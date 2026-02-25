import Link from "next/link";
import { Package, Upload, Building2, ShoppingBag } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navLinks = [
  { href: "/proveedores", label: "Proveedores", icon: Building2 },
  { href: "/tienda", label: "TiendaColor", icon: ShoppingBag },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/productos", label: "Productos", icon: Package },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-6">
          <Link href="/proveedores" className="flex items-center gap-2 font-semibold">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold tracking-tight">GestiónPro</span>
          </Link>

          <Separator orientation="vertical" className="h-5" />

          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
