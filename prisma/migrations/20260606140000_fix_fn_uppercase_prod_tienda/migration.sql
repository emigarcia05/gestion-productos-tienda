-- fn_uppercase_precios_tienda() normalizaba NEW.cod_ext; columna eliminada en 20260606120000.
CREATE OR REPLACE FUNCTION public.fn_uppercase_precios_tienda()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.cod_tienda := public.upper_trim_or_null(NEW.cod_tienda);
  NEW.rubro := public.upper_trim_or_null(NEW.rubro);
  NEW.sub_rubro := public.upper_trim_or_null(NEW.sub_rubro);
  NEW.marca := public.upper_trim_or_null(NEW.marca);
  NEW.proveedor := public.upper_trim_or_null(NEW.proveedor);
  NEW.descripcion_tienda := public.upper_trim_or_null(NEW.descripcion_tienda);
  RETURN NEW;
END;
$function$;
