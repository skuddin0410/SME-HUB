-- Pin the search path on two P4 trigger functions (Supabase advisor: function_search_path_mutable).
alter function protect_company_owner() set search_path = public;
alter function inquiry_guard() set search_path = public;
