import type { ReactNode } from "react";
import PageSectionHeader from "@/components/shared/PageSectionHeader";

interface Props {
  titulo: string;
  /** Nombre del submódulo actual (menor jerarquía, debajo del título) */
  subtitulo?: string;
  /** Botones de acción a la derecha; tamaño uniforme obligatorio (h-10 px-4) */
  actions?: ReactNode;
  /** @deprecated El espaciado es siempre el mismo (clase global .section-header) */
  compact?: boolean;
}

/**
 * Encabezado de sección (API histórica en español).
 * @see PageSectionHeader — implementación única con CVA.
 */
export default function SectionHeader({ titulo, subtitulo, actions }: Props) {
  return (
    <PageSectionHeader title={titulo} subtitle={subtitulo} actions={actions} />
  );
}
