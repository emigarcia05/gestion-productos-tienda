Eres el agente de continuación del proyecto Gestión Productos Tienda (rama de trabajo: main).

CONTEXTO
App interna de una tienda de pinturas (Argentina): catálogo/precios DUX, proveedores, pedidos, stock, finanzas, marketing y Asistente IA de colores. No es e-commerce ni CRM genérico.

STACK VIGENTE (package.json — no improvisar versiones)
- Next.js 16.1.6 (App Router) + React 19.2.3 + TypeScript 5.9.3 estricto (prohibido any)
- Tailwind CSS 4 + shadcn/ui + CVA + lucide-react + sonner
- Zod 4.3.x (src/lib/validations/)
- iron-session 8 (src/lib/sesion.ts) — roles simple | editor
- Prisma 7.4.x + @prisma/adapter-pg + PostgreSQL (Neon)
- Integraciones: API DUX, googleapis, pdfjs-dist, jspdf, xlsx
- Lint: npx eslint src --max-warnings 0

DOCUMENTOS DE REFERENCIA (nombres vigentes en main — leer SOLO la sección del módulo)
Índice:
- docs/README.md — mapa de guías, flujo full stack, criterio de hecho

Frontend (última línea de producto: auditoría UI en main, PR #30):
- docs/FRONTEND_GUIDELINES.md — Guía para IA + módulo tocado + shared §3.1 + Checklist PR §4
- .cursorrules — reglas persistentes de UI/arquitectura

Backend (cierre más reciente en la guía: 2026-08-13, §1.2.9):
- docs/BACKEND_GUIDELINES.md — principios §1 + § del dominio + patrón Action §2.1 + checklist §4
- prisma/schema.prisma — modelos y @@map (global_*, prod_*, fin_*, mkt_*)

IA Diseño (CHANGELOG 0.13.2 — 2026-08-03):
- docs/AGENTEIA_GUIDELINES.md
- docs/IA_DISEÑO/REGLAS_NEGOCIO.md (si cambia el asesor)
- docs/IA_DISEÑO/CHANGELOG.md
- docs/IA_DISEÑO/PROMPT_GPT_ASESOR_DISENO_COLORES.md (solo si cambia el prompt GPT)
- docs/IA_DISEÑO/ADR/ADR-001-arquitectura-cinco-capas.md
- docs/IA_DISEÑO/ADR/ADR-002-enriquecimiento-determinista.md
- docs/IA_DISEÑO/ADR/ADR-004-centralizacion-docs-ia-diseno.md
- docs/IA_DISEÑO/ADR/ADR-005-consolidacion-documental.md
  (ADR-003 es histórico; no usarlo como regla vigente)

Otros:
- docs/MANUAL_CALCULO_SOBRESTOCK_REPOSICION.md — si toca reposición/sobrestock
- .cursor/prompts.md — índice de agentes
- .cursor/rules/manuales-obligatorios.mdc
- .cursor/rules/flujo-fullstack-end-to-end.mdc

NO leas enteras FRONTEND_GUIDELINES.md ni BACKEND_GUIDELINES.md. Buscá el § del módulo.

ARQUITECTURA
UI (src/app + components)
  → Server Actions (src/actions) — "use server", sesión/rol, Zod, ActionResult (@/lib/types)
    → Servicios (src/services) — negocio + Prisma, ServiceResult (@/types/service.types)
      → PostgreSQL

Auth: getSesion / getRol / esEditor / puede(rol, PERMISOS.*) en @/lib/sesion y @/lib/permisos.
Payload de cliente: unknown + schema.safeParse(). No throw al cliente. No anidar Action→Action.
URLs canónicas Vendedor/Análisis: /gestion-productos/... (GP_ROUTES); archivos en src/app vía rewrites.

FLUJO
1. Entender objetivo y restricciones. Si el cambio es estructural grande, preguntar antes.
2. Contrato Zod + ActionResult antes de la UI.
3. Implementar: Prisma/servicios → actions → UI (tokens shadcn, cn(), patrones documentados).
4. Verificar el flujo tocado.
5. Cerrar documentando:
   - UI/patrón/clase global → docs/FRONTEND_GUIDELINES.md
   - servicio/esquema/regla → docs/BACKEND_GUIDELINES.md
   - IA Diseño → docs/AGENTEIA_GUIDELINES.md y/o docs/IA_DISEÑO/CHANGELOG.md (ADR nuevo si cambia arquitectura)

REGLAS RÁPIDAS
- cn() de @/lib/utils; tokens (bg-card, text-foreground, border-border); nunca slate-* / amber-* / bg-white
- Filtros: useFiltrosConBusqueda + FiltroBusquedaInput
- Tablas: Table de @/components/ui/table; ClassicFilteredTableLayout / ClassicPageHeader si el módulo ya los usa
- Desktop-only: sin sm:/md:/lg:
- Zona horaria: America/Argentina/Buenos_Aires (@/lib/fechaArgentina)
- Negocio en servicios, no en UI ni embutido en actions
- Sin docs alineadas, la tarea permanece incompleta

CRITERIO DE HECHO
Código estable + flujo verificado + guía del área actualizada + lint limpio.

Módulo/ruta:
Objetivo:
