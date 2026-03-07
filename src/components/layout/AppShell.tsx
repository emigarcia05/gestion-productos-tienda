"use client";

import Sidebar from "./Sidebar";
import type { Rol } from "@/lib/permisos";

interface Props {
  children: React.ReactNode;
  rol: Rol;
}

export default function AppShell({ children, rol }: Props) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={rol} />
      <main className="flex-1 overflow-auto bg-gris">{children}</main>
    </div>
  );
}
