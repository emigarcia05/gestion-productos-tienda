import PageSectionHeader, {
  type PageSectionHeaderProps,
} from "@/components/shared/PageSectionHeader";

export type ClassicPageHeaderProps = Omit<PageSectionHeaderProps, "tone">;

/**
 * Encabezado global compartido para páginas con layout clásico.
 * @see PageSectionHeader — núcleo con CVA (`tone` refuerza `bg-card`).
 */
export default function ClassicPageHeader(props: ClassicPageHeaderProps) {
  return <PageSectionHeader {...props} tone="card" />;
}
