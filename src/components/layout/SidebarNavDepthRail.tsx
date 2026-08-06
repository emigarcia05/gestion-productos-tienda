/**
 * Línea vertical de jerarquía a la derecha del ícono del sidebar.
 * Usa la misma escala `.sidebar-nav-depth-1` / `-2` (mezcla #021D36 sobre #0072BB).
 */
export default function SidebarNavDepthRail({
  depth,
}: {
  depth: 1 | 2;
}) {
  return (
    <span
      className={depth === 1 ? "sidebar-nav-depth-1" : "sidebar-nav-depth-2"}
      aria-hidden
    />
  );
}
