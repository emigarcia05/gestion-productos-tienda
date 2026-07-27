# Scraper Alba — carta de colores

Extrae la carta completa desde la API interna de Alba (prioridad) y el JSON SSR de la pared de colores. Playwright se usa como cliente HTTP/navegación; **no** se scrapean cajas HTML si la API responde.

## Fuentes de datos

| Prioridad | Fuente | Contenido |
|-----------|--------|-----------|
| 1 | `POST /bin/api/colorPopUp` | ~3180 colores, familia, HEX, label |
| 2 | `script.js-carousel-data` | 384 colores con `href` + `colorId` |
| 3 | Playwright | Verificación DOM + mismo TLS |

Campos oficiales que **hoy Alba no publica** en API/JSON/ficha (`descripcion_alba`, `superficies`, `subfamilia`) quedan vacíos (no se inventan).

`ambientes` se completa solo cuando existe `colorId` (set oficial de habitaciones del CDN de imágenes inspiracionales).

## Salida (canónica)

Por defecto escribe en **`IA_COLORES/`** en la raíz del monorepo (ADR-003):

```
IA_COLORES/
  colores_alba.csv
  colores_alba_tip_diseno.csv
  imagenes/
    14RR12349.jpg
  scraper-report.json
```

Override: `npx tsx src/index.ts --out-dir ./output`

Tras el scrape, regenerar capa 3:

```bash
npm run build:colores-ia
```

O pipeline completo desde la raíz:

```bash
npm run ia-colores:pipeline
```

## Uso

```bash
cd scripts/alba-scraper
npm install
npm run scrape
```

Por defecto **no descarga Chromium**: usa `playwright.request` contra la API/JSON (rápido).

Verificación DOM opcional (requiere browser):

```bash
npx playwright install chromium
npx tsx src/index.ts --verify-dom
```

Desde la raíz del monorepo:

```bash
npm run scrape:alba
```

Opciones:

```bash
npx tsx src/index.ts --out-dir ./output
```

## Re-ejecución

Volvé a correr `npm run scrape` para actualizar CSV e imágenes con el catálogo vigente.
