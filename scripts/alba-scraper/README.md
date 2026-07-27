# Scraper Alba — carta de colores

API `colorPopUp` (prioridad) + JSON SSR de la pared. Playwright solo con `--verify-dom`. No inventa campos que Alba no publique.

## Salida

Por defecto → `docs/IA_DISEÑO/` (`colores_alba.csv`, `colores_alba_tip_diseno.csv`, `imagenes/`, `scraper-report.json`). Luego: `npm run build:colores-ia` o `npm run ia-diseno:pipeline`.

## Uso

```bash
cd scripts/alba-scraper && npm install && npm run scrape
# o desde la raíz:
npm run scrape:alba
npx tsx src/index.ts --out-dir ./output   # override
npx tsx src/index.ts --verify-dom        # requiere Chromium
```
