-- Avisos del asesor de seguridad de Supabase.
alter function public.paleta() set search_path = '';
-- Es un disparador: no debe poder llamarse por la API.
revoke execute on function public.crear_perfil() from public, anon, authenticated;
