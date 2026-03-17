-- Limpieza: el proyecto queda con una sola tabla de pedidos (pedidos_mercaderia).
-- En Neon estas tablas ya fueron borradas; usamos IF EXISTS para que sea seguro en otros entornos.

DROP TABLE IF EXISTS "pedidos_urgente";
DROP TABLE IF EXISTS "pedidos_reposicion";

-- Enum usado por la tabla vieja pedidos_reposicion.
DROP TYPE IF EXISTS "FormaPedirReposicion";

