import type { ReactNode } from "react";
import PageSectionHeader from "@/components/shared/PageSectionHeader";

interface Props {
  /** Nombre del módulo (h1). */
  titulo: string;
  /** Submódulo 1 (negrita). */
  subtitulo?: string;
  /** Submódulo 2 (normal), tras " - ". */
  subtituloSecundario?: string;
  /** Botones de acción a la derecha; tamaño uniforme obligatorio (h-10 px-4) */
  actions?: ReactNode;
}

/**
 * Encabezado de sección (API histórica en español).
 * @see PageSectionHeader — implementación única con CVA.
 */
export default function SectionHeader({
  titulo,
  subtitulo,
  subtituloSecundario,
  actions,
}: Props) {
  return (
    <PageSectionHeader
      title={titulo}
      subtitle={subtitulo}
      subtitleSecondary={subtituloSecundario}
      actions={actions}
    />
  );
}
