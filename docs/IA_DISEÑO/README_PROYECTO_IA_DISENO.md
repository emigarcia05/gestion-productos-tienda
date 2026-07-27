# Asesor Inteligente de Diseño y Colores — Documentación oficial (IA_DISEÑO)

Plataforma de conocimiento reutilizable para asesoría en pintura y diseño de interiores, centrada en la carta oficial **Alba**.

Sección de producto: **IA_DISEÑO**. Ubicación: `docs/IA_DISEÑO/`.

---

## Objetivos

- Mantener un catálogo actualizado y verificable de colores Alba.
- Enriquecer datos con atributos de diseño reproducibles (colorimetría).
- Exponer una base optimizada para IA, independiente del proveedor (OpenAI, Gemini, etc.).
- Alimentar un asesor que recomienda con códigos reales, justificación y prompts de render.
- Integrarse en el futuro con la aplicación de gestión, APIs, WhatsApp y apps para clientes.

---

## Arquitectura (cinco capas)

```
CAPA 1  Datos oficiales          colores_alba.csv, imagenes/
    ↓
CAPA 2  Enriquecimiento         colores_alba_tip_diseno.csv
    ↓
CAPA 3  Base conocimiento IA     colores_alba_ia.csv
    ↓
CAPA 4  Agente IA                PROMPT_GPT_ASESOR_DISENO_COLORES.md
    ↓
CAPA 5  Aplicación negocio       (futuro: UI, APIs, canales)
```

Detalle técnico: [`docs/AGENTEIA_GUIDELINES.md`](../AGENTEIA_GUIDELINES.md). Índice: [`docs/README.md`](../README.md).

---

## Flujos

### Actualizar catálogo oficial (capas 1 y 2)

```bash
npm run scrape:alba
```

Origen: `scripts/alba-scraper`. Salida: esta carpeta (`docs/IA_DISEÑO/`).

Genera:

- `colores_alba.csv`
- `colores_alba_tip_diseno.csv`
- `imagenes/CODIGO.jpg`
- `scraper-report.json`

### Reconstruir CSV para IA (capa 3)

```bash
npm run build:colores-ia
```

Lee capas 1 y 2; escribe `colores_alba_ia.csv`. **No editar ese archivo a mano.**

### Flujo completo recomendado

```bash
npm run ia-diseno:pipeline
```

---

## Archivos en esta carpeta

| Archivo / carpeta | Capa | Edición manual |
|-------------------|------|----------------|
| `colores_alba.csv` | 1 | Prohibida — solo scraper |
| `colores_alba_tip_diseno.csv` | 2 | Prohibida — regenerar con scraper |
| `colores_alba_ia.csv` | 3 | Prohibida — solo `build-colores-ia` |
| `imagenes/` | 1 | Solo scraper |
| `scripts/` | — | Código de build y utilidades |
| `ADR/` | — | Decisiones arquitectónicas |
| `README_PROYECTO_IA_DISENO.md` | — | Este documento |
| `PROMPT_GPT_ASESOR_DISENO_COLORES.md` | 4 | Prompt del agente |
| `REGLAS_NEGOCIO.md` | — | Reglas funcionales |
| `VISION_PROYECTO.md` | — | Visión y fases |
| `CHANGELOG.md` | — | Historial de cambios |

---

## Convenciones

- **Código de color:** formato Alba (ej. `50YY 83/200`). Clave primaria lógica en todos los CSV.
- **Listas en CSV:** separador `;` (ambientes, estilos, etc.).
- **Imágenes:** `imagenes/{codigo_sin_espacios}.jpg` (ej. `50YY83200.jpg`).
- **Documentación IA:** leer `docs/AGENTEIA_GUIDELINES.md` antes de modificar scripts o datos.
- **Frontend/Backend del monorepo:** `docs/FRONTEND_GUIDELINES.md` y `docs/BACKEND_GUIDELINES.md` cuando se integre capa 5.

---

## Buenas prácticas

1. Tras cada scrape, ejecutar `build:colores-ia`.
2. Registrar cambios en `CHANGELOG.md`.
3. Decisiones arquitectónicas nuevas → nuevo ADR en `ADR/` (no modificar ADRs cerrados).
4. No duplicar lógica de colorimetría fuera de `scripts/alba-scraper/src/colorScience.ts`.
5. Validar conteo de filas y reporte del scraper (`scraper-report.json`).

---

## Mantenimiento

| Tarea | Frecuencia | Responsable |
|-------|------------|-------------|
| Re-scrape Alba | Cuando Alba actualice carta o periódicamente | Operaciones / dev |
| Regenerar `colores_alba_ia.csv` | Tras cada scrape o cambio en build | Automático / dev |
| Revisar ADRs | Al cambiar arquitectura | Arquitecto / IA |
| Actualizar prompt GPT | Al cambiar reglas de negocio o formato | Producto |

---

## Actualizaciones

Ver `CHANGELOG.md`. Versión semántica del módulo **IA_DISEÑO** documentada allí.

---

## Roadmap

| Fase | Estado | Entregable |
|------|--------|------------|
| 1 — Pipeline CSV + docs | En curso | Scraper, 3 CSV, prompt, ADRs |
| 2 — API interna | Pendiente | Servicio consulta colores |
| 3 — Canales IA | Pendiente | GPT/Gemini conectados a capa 3 |
| 4 — App clientes | Pendiente | UI pública asesor + render |

Detalle: `VISION_PROYECTO.md`.

---

## Referencias rápidas

- Guía agente IA: [`../AGENTEIA_GUIDELINES.md`](../AGENTEIA_GUIDELINES.md)
- Scraper: [`../../scripts/alba-scraper/README.md`](../../scripts/alba-scraper/README.md)
- Reglas negocio: `REGLAS_NEGOCIO.md`
- Prompt asesor: `PROMPT_GPT_ASESOR_DISENO_COLORES.md`
