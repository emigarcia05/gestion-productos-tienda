# Documentación del proyecto (retroalimentación IA)

Carpeta canónica de guías y conocimiento para humanos y asistentes IA.

| Documento / carpeta | Cuándo leerlo |
|---------------------|---------------|
| [FRONTEND_GUIDELINES.md](./FRONTEND_GUIDELINES.md) | Crear o modificar UI, componentes, estilos |
| [BACKEND_GUIDELINES.md](./BACKEND_GUIDELINES.md) | Server Actions, servicios, Prisma, validaciones |
| [AGENTEIA_GUIDELINES.md](./AGENTEIA_GUIDELINES.md) | Agente IA, pipeline de colores, reglas de arquitectura IA |
| [IA_DISEÑO/](./IA_DISEÑO/) | Módulo Asesor de Diseño y Colores (datos, ADRs, prompt, scripts) |

## Orden de lectura — IA Diseño

1. [IA_DISEÑO/README_PROYECTO_IA_DISENO.md](./IA_DISEÑO/README_PROYECTO_IA_DISENO.md)
2. [AGENTEIA_GUIDELINES.md](./AGENTEIA_GUIDELINES.md)
3. [IA_DISEÑO/REGLAS_NEGOCIO.md](./IA_DISEÑO/REGLAS_NEGOCIO.md)
4. [IA_DISEÑO/PROMPT_GPT_ASESOR_DISENO_COLORES.md](./IA_DISEÑO/PROMPT_GPT_ASESOR_DISENO_COLORES.md)
5. ADRs en [IA_DISEÑO/ADR/](./IA_DISEÑO/ADR/)

## Comandos útiles

```bash
npm run scrape:alba          # capas 1–2 → docs/IA_DISEÑO/
npm run build:colores-ia     # capa 3
npm run ia-diseno:pipeline   # scrape + build
```
