/**
 * Layout Comp. Categorias (Comparacion + Categorias): ~+50 % de área útil vs páginas `contentWidth="default"` (`max-w-7xl` + `px-8`).
 * @see FRONTEND_GUIDELINES — Comp. Categorias
 */

/** Ancho máximo de contenido en páginas del submódulo (`ClassicFilteredTableLayout` `contentWidth="wide150"`). */
export const COMP_CATEGORIAS_CONTENT_WIDTH = "wide150" as const;

/** Padding horizontal reducido para maximizar área de tablas Finder. */
export const COMP_CATEGORIAS_PAGE_CONTENT_CLASS = "!px-3 sm:!px-4 md:!px-5";

/** Selector Finder Comparacion: 4 columnas (Categoría → Subcategoría → Presentación → Referencia); altura +50 %. */
export const COMP_CATEGORIAS_SELECTOR_GRID_CLASS =
  "grid shrink-0 grid-cols-4 gap-3 min-h-[330px] max-h-[420px]";

/** Modal Asignar Productos: `ModalTablaConFiltros` base `max-w-[84rem]` × 1,5. */
export const MODAL_ASIGNAR_PRODUCTOS_MAX_WIDTH_CLASS = "max-w-[126rem]";
