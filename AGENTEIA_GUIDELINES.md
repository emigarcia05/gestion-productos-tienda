# Guía del Agente IA — Asesor de Diseño y Colores

Documento de referencia para desarrolladores y **asistentes IA** que crean, modifican o consumen la plataforma de conocimiento de colores Alba. Complementa `FRONTEND_GUIDELINES.md` y `BACKEND_GUIDELINES.md`.

**Antes de cualquier cambio en IA o datos de colores**, leer en este orden:

1. `IA_COLORES/README_PROYECTO_IA_COLORES_DISENO.md`
2. Este documento (`AGENTEIA_GUIDELINES.md`)
3. `IA_COLORES/REGLAS_NEGOCIO.md`
4. `IA_COLORES/PROMPT_GPT_ASESOR_DISENO_COLORES.md`
5. ADRs en `IA_COLORES/ADR/`

---

## 1. Arquitectura de cinco capas

| Capa | Nombre | Artefactos | Regla |
|------|--------|------------|-------|
| 1 | Datos oficiales | `colores_alba.csv`, `imagenes/` | Solo scraper Alba. Nunca editar manualmente. |
| 2 | Enriquecimiento | `colores_alba_tip_diseno.csv` | Derivado de HEX/RGB + metadatos oficiales. Regenerable. |
| 3 | Base de conocimiento IA | `colores_alba_ia.csv` | Generado por script. Nunca editar manualmente. |
| 4 | Agente IA | `PROMPT_GPT_ASESOR_DISENO_COLORES.md` | Prompt y reglas de respuesta. Sin documentación técnica. |
| 5 | Aplicación del negocio | UI, APIs, integraciones futuras | Consume capa 3; no acoplar al proveedor de IA. |

**Principio rector:** el conocimiento pertenece al negocio, no al proveedor de IA (OpenAI, Gemini, etc.).

---

## 2. Flujo de datos

```
scraper Alba (scripts/alba-scraper)
        │
        ▼
  colores_alba.csv  +  imagenes/
        │
        ▼  (colorScience — determinista)
  colores_alba_tip_diseno.csv
        │
        ▼  (build-colores-ia.ts)
  colores_alba_ia.csv
        │
        ▼
  Agente / RAG / APIs / WhatsApp / App web
```

Comandos:

```bash
# Capas 1 y 2
npm run scrape:alba

# Capa 3
npm run build:colores-ia
```

---

## 3. Reglas de desarrollo IA

| Regla | Detalle |
|-------|---------|
| Modularidad | Scripts en `IA_COLORES/scripts/`; lógica reutilizable, sin duplicar. |
| Tipado | TypeScript estricto en scripts Node. |
| Sin hardcode | URLs, columnas y rutas en módulos `config`. |
| Sin invención | No inventar códigos, nombres ni atributos que Alba no publique. |
| CSV oficial | `colores_alba.csv` solo vía scraper. |
| CSV IA | `colores_alba_ia.csv` solo vía `build-colores-ia`. |
| Documentación | Cambios importantes → `CHANGELOG.md`, ADR si es decisión arquitectónica, README si afecta flujos. |

---

## 4. Esquema `colores_alba_ia.csv`

Generado por `IA_COLORES/scripts/build-colores-ia.ts`. Une capas 1 y 2 por `codigo` y añade `texto_conocimiento` (bloque legible para RAG, embeddings y prompts).

Columnas: ver `IA_COLORES_COLS` en el script. **No editar el CSV a mano.**

---

## 5. Checklist antes de proponer cambios

Responder **sí** a todas:

- [ ] ¿Es mantenible?
- [ ] ¿Es escalable?
- [ ] ¿Es reutilizable?
- [ ] ¿Está documentada?
- [ ] ¿Respeta las cinco capas?

Si alguna respuesta es **no**, proponer alternativa antes de implementar.

---

## 6. Memoria del proyecto (decisiones registradas)

### 6.1 Arquitectura de cinco capas

- **Qué:** Separar datos oficiales, enriquecimiento, KB para IA, agente y aplicación.
- **Por qué:** Escalar a múltiples consumidores (GPT, Gemini, WhatsApp, app web) sin rehacer datos.
- **Alternativas:** Un solo CSV monolítico; prompt con catálogo embebido.
- **Consecuencias:** Pipeline explícito; scripts de build; documentación por capa.

### 6.2 Enriquecimiento determinista (capa 2)

- **Qué:** `colorScience.ts` deriva temperatura, luminosidad, estilos, etc. desde HEX/RGB.
- **Por qué:** Reproducible, auditable, sin costo de API ni alucinaciones en metadatos.
- **Alternativas:** Enriquecimiento 100 % con LLM.
- **Consecuencias:** Fase futura puede añadir enriquecimiento IA **adicional** en columnas nuevas, sin sustituir datos oficiales.

### 6.3 Scraper en `scripts/alba-scraper`, salida en `IA_COLORES/`

- **Qué:** El scraper vive en el monorepo; escribe directamente en `IA_COLORES/`.
- **Por qué:** Reutiliza tooling npm del repo; datos centralizados en la carpeta del dominio.
- **Alternativas:** Mover scraper dentro de `IA_COLORES/scripts/`.
- **Consecuencias:** `npm run scrape:alba` actualiza la capa 1 en su ubicación canónica.

### 6.4 `texto_conocimiento` en capa 3

- **Qué:** Campo texto plano con resumen estructurado por color.
- **Por qué:** Formato agnóstico del modelo para RAG y few-shot.
- **Alternativas:** Solo columnas tabulares; JSON embebido.
- **Consecuencias:** Un solo campo optimizado para búsqueda semántica; columnas estructuradas se conservan.

---

## 7. Integración con el monorepo

- **Frontend:** futuras pantallas de asesoría deben seguir `FRONTEND_GUIDELINES.md`.
- **Backend:** servicios que expongan colores deben seguir `BACKEND_GUIDELINES.md` (Zod, `src/services/`, permisos).
- **Este módulo:** no mezclar reglas de negocio del asesor en guías frontend/backend; usar `REGLAS_NEGOCIO.md`.

---

## 8. Roadmap técnico (agente)

| Fase | Objetivo |
|------|----------|
| Actual | Pipeline CSV + documentación + prompt GPT |
| Siguiente | API interna de consulta sobre `colores_alba_ia.csv` |
| Futuro | Embeddings / búsqueda semántica; WhatsApp; app clientes |

Actualizar esta sección y `VISION_PROYECTO.md` al cerrar cada fase.
