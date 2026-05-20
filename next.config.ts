import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Evita fallos de TLS al descargar Geist en `next/font` durante `next build` (p. ej. entornos corporativos). */
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/gestion-productos/proveedores/sugeridos",
        permanent: true,
      },
      {
        source: "/proveedores",
        destination: "/gestion-productos/proveedores",
        permanent: true,
      },
      {
        source: "/proveedores/lista-precios",
        destination: "/gestion-productos/proveedores/lista-precios",
        permanent: true,
      },
      {
        source: "/proveedores/sugeridos",
        destination: "/gestion-productos/proveedores/sugeridos",
        permanent: true,
      },
      {
        source: "/proveedores/comparacion-categorias",
        destination: "/gestion-productos/proveedores/comparacion-categorias",
        permanent: true,
      },
      {
        source: "/proveedores/competencia-precios",
        destination: "/gestion-productos/proveedores/competencia-precios",
        permanent: true,
      },
      {
        source: "/proveedores/lista",
        destination: "/gestion-productos/proveedores/lista",
        permanent: true,
      },
      {
        source: "/tienda",
        destination: "/gestion-productos/tienda/comp-proveedores",
        permanent: true,
      },
      {
        source: "/tienda/aumentos",
        destination: "/gestion-productos/tienda/control-aumento",
        permanent: true,
      },
      {
        source: "/stock",
        destination: "/gestion-productos/tienda/control-stock",
        permanent: true,
      },
      {
        source: "/tienda/tintometrico",
        destination: "/gestion-productos/tienda/calc-tintometrico",
        permanent: true,
      },
      {
        source: "/tienda/litros",
        destination: "/gestion-productos/tienda/calc-litros",
        permanent: true,
      },
      {
        source: "/pedidos",
        destination: "/gestion-productos/pedidos",
        permanent: true,
      },
      {
        source: "/pedidos/enviar",
        destination: "/gestion-productos/pedidos/generar-pedido",
        permanent: true,
      },
      {
        source: "/pedidos/urgente",
        destination: "/gestion-productos/pedidos/urgente",
        permanent: true,
      },
      {
        source: "/pedidos/tintometrico",
        destination: "/gestion-productos/pedidos/tintometrico",
        permanent: true,
      },
      {
        source: "/pedidos/reposicion",
        destination: "/gestion-productos/pedidos/reposicion",
        permanent: true,
      },
      {
        source: "/pedidos/historial",
        destination: "/gestion-productos/pedidos/historial",
        permanent: true,
      },
      {
        source: "/pedidos/generar",
        destination: "/gestion-productos/pedidos/historial",
        permanent: true,
      },
      {
        source: "/tienda/tinto-lts",
        destination: "/gestion-productos/tienda/calc-tintometrico",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/gestion-productos/proveedores", destination: "/proveedores" },
      { source: "/gestion-productos/proveedores/lista-precios", destination: "/proveedores/lista-precios" },
      { source: "/gestion-productos/proveedores/sugeridos", destination: "/proveedores/sugeridos" },
      { source: "/gestion-productos/proveedores/comparacion-categorias", destination: "/proveedores/comparacion-categorias" },
      { source: "/gestion-productos/proveedores/competencia-precios", destination: "/proveedores/competencia-precios" },
      { source: "/gestion-productos/proveedores/lista", destination: "/proveedores/lista" },
      { source: "/gestion-productos/tienda/comp-proveedores", destination: "/tienda" },
      { source: "/gestion-productos/tienda/control-aumento", destination: "/tienda/aumentos" },
      { source: "/gestion-productos/tienda/control-stock", destination: "/stock" },
      { source: "/gestion-productos/tienda/calc-tintometrico", destination: "/tienda/tintometrico" },
      { source: "/gestion-productos/tienda/calc-litros", destination: "/tienda/litros" },
      { source: "/gestion-productos/pedidos", destination: "/pedidos" },
      { source: "/gestion-productos/pedidos/generar-pedido", destination: "/pedidos/enviar" },
      { source: "/gestion-productos/pedidos/urgente", destination: "/pedidos/urgente" },
      { source: "/gestion-productos/pedidos/tintometrico", destination: "/pedidos/tintometrico" },
      { source: "/gestion-productos/pedidos/reposicion", destination: "/pedidos/reposicion" },
      { source: "/gestion-productos/pedidos/historial", destination: "/pedidos/historial" },
      { source: "/gestion-productos/procesos", destination: "/procesos" },
    ];
  },
};

export default nextConfig;
