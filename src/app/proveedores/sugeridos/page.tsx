import SectionHeader from "@/components/SectionHeader";

export const dynamic = "force-dynamic";

export default function PxVtaSugeridosPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <SectionHeader
        titulo="Proveedores"
        subtitulo="Px Vta. Sugeridos"
      />
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        Contenido de Px Vta. Sugeridos en desarrollo.
      </div>
    </div>
  );
}
