import SectionHeader from "@/components/SectionHeader";

export default function FinanzasPage() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <SectionHeader titulo="Finanzas" subtitulo="A construir" />
      <div className="flex-1 overflow-auto p-4">
        <p className="text-sm text-muted-foreground">
          Esta área está en desarrollo. Pronto vas a poder gestionar información financiera desde aquí.
        </p>
      </div>
    </div>
  );
}
