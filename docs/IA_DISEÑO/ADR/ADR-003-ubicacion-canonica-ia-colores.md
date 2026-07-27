# ADR-003: Ubicación canónica de datos en IA_COLORES/

## Estado

Aceptado — 2026-07-27

## Problema

El scraper Alba escribía en `scripts/alba-scraper/output/`, separado del dominio documentado `IA_COLORES/`, duplicando rutas y confusión sobre la fuente de verdad.

## Alternativas

1. Mantener salida en `scripts/alba-scraper/output/` y copiar manualmente a `IA_COLORES/`.
2. Mover todo el scraper dentro de `IA_COLORES/scripts/`.
3. Dejar el scraper en `scripts/alba-scraper/` con **salida por defecto en `IA_COLORES/`**.

## Decisión tomada

Opción **3**: scraper en el monorepo existente; **`DEFAULT_OUT_DIR`** apunta a `IA_COLORES/` en la raíz del repo.

## Motivos

- Reutiliza `npm run scrape:alba` ya definido en `package.json`.
- Una sola carpeta canónica para CSV e imágenes según especificación del proyecto.
- Evita mover 20+ archivos del scraper en el bootstrap inicial.

## Consecuencias

- `IA_COLORES/` puede contener miles de imágenes; considerar `.gitignore` parcial o LFS si el repo crece.
- Scripts de build en `IA_COLORES/scripts/` leen rutas relativas a la carpeta padre.
