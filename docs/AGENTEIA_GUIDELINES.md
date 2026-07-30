# Guía del Agente IA — IA_DISEÑO

Fuente operativa única para modificar datos, scripts o UI del asesor de colores. Complementa `docs/FRONTEND_GUIDELINES.md` y `docs/BACKEND_GUIDELINES.md`. Índice general: [`docs/README.md`](./README.md).

**Lectura mínima antes de cambiar IA Diseño**

1. Este documento
2. [`IA_DISEÑO/REGLAS_NEGOCIO.md`](./IA_DISEÑO/REGLAS_NEGOCIO.md) (si afecta comportamiento del asesor)
3. ADRs vigentes: `001`, `002`, `004` (y `005` docs). `003` es histórico.
4. [`PROMPT_GPT_ASESOR_DISENO_COLORES.md`](./IA_DISEÑO/PROMPT_GPT_ASESOR_DISENO_COLORES.md) solo si se cambia el prompt del GPT

---

## Capas y artefactos

| Capa | Artefacto | Regla |
|------|-----------|-------|
| 1 Oficial | `colores_alba.csv`, `imagenes/` | Solo scraper. No editar a mano. |
| 2 Enriquecimiento | `colores_alba_tip_diseno.csv` | Derivado determinista (`colorScience.ts`). Regenerable. |
| 3 KB IA | `colores_alba_ia.csv` | Merge 1+2 + `texto_conocimiento`. Solo `build:colores-ia`. **Cargar este CSV a la IA.** |
| 4 Agente | `PROMPT_GPT_…` + `REGLAS_NEGOCIO` | Prompt sin docs técnicas. |
| 5 App | UI / APIs | Consume capa 3; conocimiento ≠ proveedor IA. |

Ubicación: `docs/IA_DISEÑO/` (ADR-004).

```
scrape:alba → colores_alba + tip_diseno + imagenes
build:colores-ia → colores_alba_ia
```

```bash
npm run scrape:alba
npm run build:colores-ia
npm run ia-diseno:pipeline   # ambos
```

---

## Reglas de desarrollo

- Tipado, módulos reutilizables, config sin hardcodes dispersos.
- No inventar códigos/nombres/atributos que Alba no publique.
- Colorimetría solo en `scripts/alba-scraper/src/colorScience.ts`.
- Columnas de capa 3: `IA_DISENO_COLS` en `docs/IA_DISEÑO/scripts/config.ts`.
- Cambio arquitectónico → **nuevo ADR** (no editar ADRs cerrados) + entrada en `CHANGELOG.md`.
- Checklist: ¿mantenible? ¿escalable? ¿reutilizable? ¿documentado? ¿respeta las 5 capas? Si no → alternativa.

---

## UI monorepo (capa 5 v1)

- Sidebar **ASISTENTE IA** → **Buscar Código Desde Imagen** (`PERMISOS.asistenteIa.acceso`, **simple + editor**). **GESTION PROMP & URL** y **GESTION DISEÑO** solo **editor**/administrador.
- Hub de funciones: tiles **`AsistenteIaFuncionTile`** proporción **5:1** (alto:ancho = `aspect-[1/5]`, ancho fijo `w-36`), ícono arriba + label en **MAYÚSCULAS**. Funciones: **BUSCAR CÓDIGO DESDE IMAGEN**, **GESTION PROMP & URL** (editor). Header: **GESTION DISEÑO** (editor) → modal hub con **Superficies A Pintar** / **Estilos De Diseño** / **Combinar** → CRUD nombre (`prod_ia_diseno_sup_pintar`, `prod_ia_diseno_estilos`, `prod_ia_diseno_combinar`; patrón buscador + `+` como Marketing).
- Prompt/URL en tabla **`prod_ia_diseno_promp`** (CRUD: **GESTION PROMP & URL**); la **URL** se usa al buscar. Lookup de prompt: nombre nuevo + legacy **Buscar Color Desde Imagen**.
- **Variables de prompt:** sintaxis **`{{CLAVE}}`** (catálogo `ASISTENTE_IA_VARIABLES_PROMPT`). Hoy: **`{{RGB}}`** (cuentagotas). En el editor, chips **Insertar Variable**. Compat: plantillas viejas con `(R,G,B)`.
- **Cuentagotas (cliente):** proceso en pasos — (1) **Abrir Imagen** → selección de color en **`AppModal`** (paso 1 compacto en página: botones + swatch RGB) → `aplicarRgbAlPromptBuscarColor` + clipboard + `url_redireccion`; (2) pegar respuesta IA → **Generar Pdf** (`generarPdfAproximacionCodigoImagen`: **una hoja A4**, bandas título 5% / imagen 30% / colores 30% / texto 15% / logo 20%; imagen con marcador/flecha/swatch RGB y 5 filas color–nombre–código–aproximación–URL). Imagen **no** se persiste en servidor.
- Prompt seed: tabla **Nombre | Código | Similitud | URL | RGB (digital)**; el PDF rellena el swatch con RGB y agrega hipervínculo **Ver color en la página oficial** por fila. Parser acepta URL + RGB/HEX (compat formatos previos).
- FE: `docs/FRONTEND_GUIDELINES.md`. BE: `docs/BACKEND_GUIDELINES.md`. Reglas del asesor: `REGLAS_NEGOCIO.md` (no mezclar en FE/BE).

---

## Roadmap

| Fase | Objetivo |
|------|----------|
| Hecho | Pipeline CSV, docs, prompt, UI puente ChatGPT, cuentagotas RGB en cliente |
| Siguiente | API interna sobre `colores_alba_ia.csv` |
| Luego | Embeddings / WhatsApp / app clientes |

Principios: mantenibilidad > rapidez; conocimiento del negocio, no del proveedor IA; decisiones en ADR.

---

## Memoria (detalle en ADR)

| Tema | ADR |
|------|-----|
| Cinco capas / no CSV monolítico | 001 |
| Enriquecimiento determinista | 002 |
| Salida canónica (histórico `IA_COLORES`) | 003 |
| `docs/` + renombre `IA_DISEÑO` | 004 |
| Consolidación documental (esta auditoría) | 005 |
