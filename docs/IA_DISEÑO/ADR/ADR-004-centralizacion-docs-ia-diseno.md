# ADR-004: Centralización en `docs/` y renombre a `IA_DISEÑO`

## Estado

Aceptado — 2026-07-27

## Problema

Las guías de retroalimentación IA (`FRONTEND_GUIDELINES`, `BACKEND_GUIDELINES`, `AGENTEIA_GUIDELINES`) y el módulo `IA_COLORES/` vivían dispersas en la raíz del monorepo, dificultando el descubrimiento y el control documental. Además, el nombre de sección de negocio acordado es **IA_DISEÑO**, no `IA_COLORES`.

## Alternativas

1. Mantener guías en raíz y solo renombrar `IA_COLORES` → `IA_DISEÑO`.
2. Carpeta `DOCUMENTACION/` en español con el mismo contenido.
3. Carpeta `docs/` con las tres guías + subcarpeta `IA_DISEÑO/` (datos, scripts, ADRs, prompt).

## Decisión tomada

Opción **3**: centralizar en **`docs/`** y renombrar el módulo a **`docs/IA_DISEÑO/`**. README del módulo: `README_PROYECTO_IA_DISENO.md`.

## Motivos

- Un único punto de entrada documental para la IA (`docs/README.md`).
- Alinea el nombre de carpeta con la sección de producto **IA_DISEÑO**.
- `docs/` es convención clara en monorepos y herramientas.

## Consecuencias

- Actualizar rutas en `.cursorrules`, reglas Cursor, `package.json`, scraper y scripts de build.
- ADR-003 queda como histórico (salida en `IA_COLORES/`); la ubicación vigente es la de este ADR.
- Salida del scraper: `docs/IA_DISEÑO/`.
- Pipeline npm: `ia-diseno:pipeline`.
