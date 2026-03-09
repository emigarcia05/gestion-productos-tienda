# Sistema de diseño — Tema único de marca (Tailwind CSS 4 + shadcn/ui)

**Declaración:** Esta aplicación utiliza un **Sistema de Marca Único**. No hay modo oscuro ni selectores de tema: el diseño es un tema claro y coherente alineado con la identidad de marca en todas las pantallas.

**Objetivo:** Garantizar que `@/app` y `@/components` respeten estrictamente `globals.css` y `components.json`, para que al pedir "crea un módulo nuevo siguiendo el estilo de X" el diseño sea idéntico.

---

## 1. Paleta y tokens de marca

| Uso | Token / valor | Dónde se usa |
|-----|----------------|--------------|
| **Primary** | `#0072BB` / `--primary` | Botones principales, sidebar, encabezados de tablas, enlaces, foco |
| **Accent (urgente)** | `#FFC107` / `--accent2` | Indicadores críticos (ej. Pedido Urgente), alertas |
| **Background** | Blanco / slate muy claro | Contenido principal (`--background`: `#f8fafc`), cards (`--card`: `#ffffff`) |
| **Sidebar** | `#0072BB` / `--sidebar` | Barra lateral siempre azul; texto e iconos blancos (`--sidebar-foreground`: `#ffffff`) |

- **No hardcodear:** Usar siempre variables del tema (`bg-primary`, `text-primary-foreground`, `text-foreground`, `text-muted-foreground`, `border-border`, `border-card-border`, `bg-background`, `bg-card`, `text-accent2`) en lugar de hex o clases arbitrarias (evitar `border-slate-200`, `text-black`, etc.).
- **Consistencia:** Primary en botones de acción principal, sidebar y títulos de tablas; accent2 solo para elementos urgentes o de alerta.
- **Tipografía:** Fuente por defecto Geist (`--font-sans` / `--font-geist-sans`). Códigos y referencias técnicas: `font-mono` (Geist Mono).

---

## 2. Uso de variantes (CVA) — Botones

- Los botones deben usar el componente `Button` de `@/components/ui/button` y `buttonVariants` (CVA).
- No añadir padding o color manualmente; en headers de sección usar las constantes `ACTION_BUTTON_PRIMARY` o `ACTION_BUTTON_SECONDARY` de `@/lib/actionButtons` cuando corresponda.
- Botones del header de sección: tamaño uniforme `h-10 px-4` (SectionHeader lo aplica con `[&_button]:!h-10 [&_button]:!px-4`).

### Estándar oficial: botón de acción principal (solo icono)

Para botones que representan una **acción principal o de limpieza** con solo icono (ej. «Limpiar todos los filtros»), usar la variante **`primaryIcon`** y el tamaño **`icon-lg`**:

- **Variante:** `variant="primaryIcon"` en `@/components/ui/button`.
- **Tamaño:** `size="icon-lg"` (equivale a `h-10` / 2.5rem).
- **Tokens aplicados vía variante:**
  - Fondo: `var(--primary)` (#0072BB) → clase `bg-primary`.
  - Texto/icono: `var(--primary-foreground)` (#fff) → clase `text-primary-foreground` (el SVG hereda el color).
  - Bordes: `var(--radius)` (0.625rem) → clase `rounded-lg` (mapea a `--radius-lg` del tema).
  - Sombra: `shadow-sm`, en hover `shadow-md`.
  - Tipografía: `font-semibold`, `text-sm` (base del componente).
- **Restricción:** No modificar estilos del SVG interno; el contenedor y el color del icono se controlan con las clases del `Button` (el icono usa `[&_svg]:text-primary-foreground` en la variante).
- **Ejemplo:** `LimpiarFiltrosButton` en `FilterBar` usa `<Button variant="primaryIcon" size="icon-lg">` para reutilizar este estándar en todos los módulos con filtros.

---

## 3. Card contenedor (estándar para listados)

- **Card con borde azul tenue** es el estándar para todos los listados de la aplicación. Unifica la identidad visual con la sidebar (primary #0072BB).
- **Componente:** Usar `Card` > `CardContent` > `Table` (o `<table className="tabla-global">`) de shadcn. No invertir la jerarquía.
- **Tokens del Card (en `@/components/ui/card.tsx`):**
  - Fondo: `var(--card)` (#fff) → clase `bg-card`.
  - Borde: `1px solid rgba(0, 114, 187, 0.25)` → variable `--card-border`, clase `border border-card-border`.
  - Radio: `var(--radius)` (0.625rem) → clase `rounded-lg`.
  - Sombra: `shadow-sm` con `transition-shadow duration-150` (tokens de transición y elevación).
- **No hardcodear:** Evitar `border-slate-200` u otros grises; usar siempre `border-card-border` para el contenedor de listados.

---

## 4. Tablas

- Todas las tablas usan el componente `Table` de `@/components/ui/table` (que aplica `tabla-global`) o `<table className="tabla-global w-full text-sm">`.
- **Header (thead th):** Fondo `var(--primary)` (#0072BB), texto `text-primary-foreground` (blanco), negrita, alineación centrada.
- **Celdas (td):** Texto `var(--foreground)` → clase `text-foreground`, `text-sm`. Para códigos dentro de celdas usar `font-mono` en el elemento `<code>`.
- **Filas (tr):** Efecto zebra: impares `bg-card`, pares `bg-blue-50/50`. Borde `border-border`. Hover suave de marca: `bg-primary/10`. Transición `transition-colors duration-150`.
- **Tipografía:** El texto hereda la fuente del sistema (Geist vía `--font-sans` / `--font-geist-sans`). Códigos y referencias técnicas: `font-mono`.
- No añadir estilos propios a `thead`, `tbody`, `tr`, `th`, `td`; los estilos madre están en `globals.css` (`.tabla-global`) y en los componentes `Table*` de `@/components/ui/table`.

---

## 5. Layout y espaciado

- **SectionHeader:** Título + opcional subtítulo + acciones a la derecha; botones con `h-10 px-4`.
- **FilterBar:** FilterRowSelection (Selects) + FilterRowSearch (input al 75%) + LimpiarFiltrosButton. Usar `INPUT_FILTER_CLASS`, `SELECT_TRIGGER_FILTER_CLASS`, `FILTER_SELECT_WRAPPER_CLASS`. **Fila de Selects:** siempre 5 columnas en toda la app (`fila-filtros-5 grid grid-cols-5`); los módulos usan de 1 a 5 filtros y los slots no usados quedan vacíos (detalle en **COMPONENTES_ESTILOS.md**). **Contenedor de filtros:** el `FilterBar` debe llevar `bg-card` (fondo blanco) en todas las pantallas con filtros (Lista Precios, Sugeridos, Tienda); ej. `className="filtros-contenedor-tienda bg-card"`.
- **Main:** Fondo `bg-background` (slate muy claro). Cards con `bg-card` (blanco).

---

## 6. Sidebar — Identidad de marca y jerarquía visual

La Sidebar tiene una **jerarquía visual específica** que debe respetarse en toda la app:

| Elemento | Token / valor | Uso |
|----------|----------------|-----|
| **Fondo** | `--sidebar: #0072BB` | Fondo azul de marca (siempre). |
| **Texto e iconos** | `--sidebar-foreground: #FFFFFF` | Todos los textos de enlaces y iconos Lucide en blanco puro. Sin opacidad (`/70`, `/80`, `/90`); lectura clara sobre el azul. |
| **Indicadores de navegación** | `--sidebar-indicator: #FFC107` (`--accent2`) | Amarillo de acento para: flechas de acordeón (chevron-down), línea vertical de jerarquía en submenús (`border-l-2`), y borde izquierdo del ítem activo. |

- **Variables en `globals.css`:** `--sidebar-foreground: #ffffff`; `--sidebar-indicator: #FFC107` (alias de acento para indicadores). En componentes usar `text-sidebar-foreground`, `text-sidebar-indicator`, `border-sidebar-indicator`.
- **Contraste máximo:** No usar `text-sidebar-foreground/70` ni similares; solo `text-sidebar-foreground` (blanco puro).
- Acentos de hover/estado: `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` (tonos blancos semitransparentes).
- No existe variante oscura; la sidebar mantiene este aspecto en toda la app.

---

## 7. Componentes UI (shadcn)

- Los componentes en `@/components/ui` no incluyen variantes `dark:`; el diseño está pensado solo para el tema único claro.
- Toasts (Sonner) usan `theme="light"` fijo; no hay dependencia de `next-themes` ni ThemeProvider para el tema.

---

## 8. Referencia rápida para nuevos módulos

- **Colores:** `primary`, `primary-foreground`, `foreground`, `muted-foreground`, `background`, `card`, `border`, `input`, `accent`, `accent-foreground`, `destructive`, `sidebar`, `sidebar-foreground`, `accent2`.
- **Botones:** Siempre `<Button>` con `variant` y `size`; en headers usar `ACTION_BUTTON_PRIMARY` / `ACTION_BUTTON_SECONDARY` cuando aplique. Para botones solo icono de acción principal/limpieza: `variant="primaryIcon"` y `size="icon-lg"`.
- **Card listados:** `Card` > `CardContent` > `Table`; borde `border-card-border` (azul tenue de marca), sin clases tipo `border-slate-200`.
- **Tablas:** `Table` de `@/components/ui/table` o `<table className="tabla-global w-full text-sm">`. Celdas `text-foreground text-sm`; códigos con `font-mono`.
- **Header de sección:** `SectionHeader` con título, opcional subtítulo y acciones a la derecha.
- **Filtros:** `FilterBar` > `FilterRowSelection` + `FilterRowSearch` + `LimpiarFiltrosButton`.
- **Utilidad:** `cn()` de `@/lib/utils` para combinar clases; no hardcodear hex cuando exista variable.

---

## 9. Cambios aplicados (Tema único de marca)

- **globals.css:** Eliminado bloque `.dark` y variante `@custom-variant dark`. Sidebar configurada con `--sidebar: #0072BB`, `--sidebar-foreground: #ffffff` y acentos/bordes en blanco semitransparente. Tokens de marca solo en `:root`. Eliminadas variantes `.dark .tabla-global`.
- **Sonner:** Tema fijo `theme="light"`; eliminada dependencia de `useTheme` (next-themes).
- **Componentes UI (button, tabs, badge, switch, input, select):** Eliminadas todas las clases `dark:` para un diseño coherente en el tema único.
- **Documentación:** Declarado Sistema de Marca Único; eliminadas todas las menciones al soporte de modo oscuro.

Resultado: interfaz coherente, profesional y alineada con los colores de la marca (#0072BB, #FFC107, fondo claro) en todas las pantallas.

---

## 10. Estándar de botón «primary icon» (limpieza / acción principal)

- **Variante:** `primaryIcon` en `buttonVariants` (`@/components/ui/button.tsx`): fondo primary, texto/icono primary-foreground, `rounded-lg`, `shadow-sm` → `hover:shadow-md`, `font-semibold`.
- **Uso:** Botones que muestran solo un icono y representan una acción principal o de limpieza (ej. Limpiar filtros). Usar `<Button variant="primaryIcon" size="icon-lg">`; el SVG interno no requiere clases de color (hereda `text-primary-foreground`).
- **LimpiarFiltrosButton:** Actualizado para usar `variant="primaryIcon"` y `size="icon-lg"` en lugar de clases manuales; referencia oficial para este patrón en la app.

---

## 11. Card + Tabla (listados) — Cambios aplicados

- **globals.css:** Añadido `--card-border: rgba(0, 114, 187, 0.25)` y `--color-card-border` en `@theme`. Estilos `.tabla-global` actualizados: thead th con `text-primary-foreground`; tbody td con `text-foreground text-sm`; tr con `border-border`, zebra `bg-card` / `bg-blue-50/50`, hover `bg-primary/10`.
- **Card (`@/components/ui/card.tsx`):** Borde con `border-card-border`, radio `rounded-lg` (0.625rem), `transition-shadow duration-150`. Sin clases `dark:`; sin `border-slate-200`.
- **Table (`@/components/ui/table.tsx`):** TableRow con `border-border`, `odd:bg-card`, `hover:bg-primary/10`. TableHead con `text-primary-foreground`. TableCell con `text-foreground text-sm`. Códigos en celdas: usar clase `font-mono` en el elemento `<code>`.
- **Regla de oro:** Todo listado debe usar la jerarquía Card > CardContent > Table y el Card con borde azul tenue (`border-card-border`), para replicación futura idéntica.

---

## 12. Sidebar — Contraste e indicadores amarillos (cambios aplicados)

- **globals.css:** Añadido `--sidebar-indicator: #FFC107` y `--color-sidebar-indicator` en `@theme`. `--sidebar-foreground` se mantiene en `#ffffff` (blanco puro).
- **Sidebar (`@/components/layout/Sidebar.tsx`):** Textos e iconos en blanco puro: eliminadas opacidades (`text-sidebar-foreground/90`, `[&_svg]:text-sidebar-foreground/70`, `[&_button]:!text-sidebar-foreground/80`). Iconos de módulo con `[&>span:first-child_svg]:text-sidebar-foreground`. Flechas de acordeón (ChevronDown) con `text-sidebar-indicator` (#FFC107). Línea de jerarquía vertical en submenús: `border-l-2 border-sidebar-indicator`. Ítem activo: `border-sidebar-indicator` (borde izquierdo amarillo) y `[&_svg]:text-sidebar-foreground`. Perfil: botones con `!text-sidebar-foreground` sin opacidad.
- **Regla de oro:** Sidebar = Fondo azul, texto blanco, indicadores de navegación en amarillo (#FFC107).
