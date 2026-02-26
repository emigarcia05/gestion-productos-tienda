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

- **No hardcodear:** Usar siempre variables del tema (`bg-primary`, `text-primary-foreground`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-background`, `bg-card`, `text-accent2`) en lugar de hex o clases arbitrarias.
- **Consistencia:** Primary en botones de acción principal, sidebar y títulos de tablas; accent2 solo para elementos urgentes o de alerta.

---

## 2. Uso de variantes (CVA) — Botones

- Los botones deben usar el componente `Button` de `@/components/ui/button` y `buttonVariants` (CVA).
- No añadir padding o color manualmente; en headers de sección usar las constantes `ACTION_BUTTON_PRIMARY` o `ACTION_BUTTON_SECONDARY` de `@/lib/actionButtons` cuando corresponda.
- Botones del header de sección: tamaño uniforme `h-10 px-4` (SectionHeader lo aplica con `[&_button]:!h-10 [&_button]:!px-4`).

---

## 3. Tablas

- Todas las tablas usan el componente `Table` de `@/components/ui/table` (que aplica `tabla-global`) o `<table className="tabla-global w-full text-sm">`.
- Encabezados: color primario `bg-primary`, texto blanco (`text-white` / `text-primary-foreground`).
- Filas: zebra (blanco / blue-50), texto centrado, hover sutil. No añadir estilos propios a `thead`, `tbody`, `tr`, `th`, `td`.

---

## 4. Layout y espaciado

- **SectionHeader:** Título + opcional subtítulo + acciones a la derecha; botones con `h-10 px-4`.
- **FilterBar:** FilterRowSelection (Selects) + FilterRowSearch (input al 75%) + LimpiarFiltrosButton. Usar `INPUT_FILTER_CLASS`, `SELECT_TRIGGER_FILTER_CLASS`, `FILTER_SELECT_WRAPPER_CLASS`.
- **Main:** Fondo `bg-background` (slate muy claro). Cards con `bg-card` (blanco).

---

## 5. Sidebar — Identidad de marca

- La sidebar es **siempre azul** usando `--sidebar: #0072BB` (o `var(--primary)`).
- Texto e iconos: `--sidebar-foreground: #ffffff` para contraste.
- Acentos y bordes: `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring` definidos en `globals.css` para hover y estados activos (tonos blancos semitransparentes).
- No existe variante oscura; la sidebar mantiene este aspecto en toda la app.

---

## 6. Componentes UI (shadcn)

- Los componentes en `@/components/ui` no incluyen variantes `dark:`; el diseño está pensado solo para el tema único claro.
- Toasts (Sonner) usan `theme="light"` fijo; no hay dependencia de `next-themes` ni ThemeProvider para el tema.

---

## 7. Referencia rápida para nuevos módulos

- **Colores:** `primary`, `primary-foreground`, `foreground`, `muted-foreground`, `background`, `card`, `border`, `input`, `accent`, `accent-foreground`, `destructive`, `sidebar`, `sidebar-foreground`, `accent2`.
- **Botones:** Siempre `<Button>` con `variant` y `size`; en headers usar `ACTION_BUTTON_PRIMARY` / `ACTION_BUTTON_SECONDARY` cuando aplique.
- **Tablas:** `Table` de `@/components/ui/table` o `<table className="tabla-global w-full text-sm">`.
- **Header de sección:** `SectionHeader` con título, opcional subtítulo y acciones a la derecha.
- **Filtros:** `FilterBar` > `FilterRowSelection` + `FilterRowSearch` + `LimpiarFiltrosButton`.
- **Utilidad:** `cn()` de `@/lib/utils` para combinar clases; no hardcodear hex cuando exista variable.

---

## 8. Cambios aplicados (Tema único de marca)

- **globals.css:** Eliminado bloque `.dark` y variante `@custom-variant dark`. Sidebar configurada con `--sidebar: #0072BB`, `--sidebar-foreground: #ffffff` y acentos/bordes en blanco semitransparente. Tokens de marca solo en `:root`. Eliminadas variantes `.dark .tabla-global`.
- **Sonner:** Tema fijo `theme="light"`; eliminada dependencia de `useTheme` (next-themes).
- **Componentes UI (button, tabs, badge, switch, input, select):** Eliminadas todas las clases `dark:` para un diseño coherente en el tema único.
- **Documentación:** Declarado Sistema de Marca Único; eliminadas todas las menciones al soporte de modo oscuro.

Resultado: interfaz coherente, profesional y alineada con los colores de la marca (#0072BB, #FFC107, fondo claro) en todas las pantallas.
