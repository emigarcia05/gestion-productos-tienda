# ADR-001: Arquitectura de cinco capas para conocimiento de colores

## Estado

Aceptado — 2026-07-27

## Problema

Se necesita una plataforma que alimente múltiples consumidores (GPT, Gemini, APIs, WhatsApp, apps) sin acoplar el conocimiento a un proveedor de IA ni a un único formato de despliegue.

## Alternativas

1. **Un solo CSV monolítico** con todos los campos mezclados (oficial + derivado + texto IA).
2. **Base de datos relacional** desde el inicio con tablas por capa.
3. **Cinco capas explícitas** con artefactos y scripts de transformación entre capas.

## Decisión tomada

Adoptar **cinco capas** (oficial → enriquecimiento → KB IA → agente → aplicación), con CSV como formato de intercambio en fases 1–3 y carpeta canónica `IA_COLORES/`.

## Motivos

- Separación clara de responsabilidades y auditoría (qué es oficial vs derivado).
- CSV permite inspección humana, diff en git y carga en herramientas sin infraestructura extra.
- Escalable a DB/embeddings en fase 3 sin romper contratos de capa 1–2.

## Consecuencias

- Pipeline de dos comandos mínimo (`scrape:alba`, `build:colores-ia`).
- Documentación obligatoria por capa y reglas de no edición manual.
- Migración futura a DB puede importar desde `colores_alba_ia.csv`.
