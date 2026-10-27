-- Forma — baza danych w Supabase.
-- Wklej całość w: Supabase → SQL Editor → New query → Run.
-- Skrypt można uruchomić ponownie bez szkody.

-- 1. Tabela: jeden wiersz na osobę, cały stan aplikacji jako JSON.
create table if not exists public.forma_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 2. Row Level Security: bez tego klucz publiczny dawałby dostęp do wszystkich wierszy.
alter table public.forma_state enable row level security;

-- 3. Reguły: zalogowana osoba widzi i zmienia WYŁĄCZNIE swój wiersz.
drop policy if exists "forma: odczyt własnych danych" on public.forma_state;
create policy "forma: odczyt własnych danych" on public.forma_state
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "forma: dodanie własnych danych" on public.forma_state;
create policy "forma: dodanie własnych danych" on public.forma_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "forma: zmiana własnych danych" on public.forma_state;
create policy "forma: zmiana własnych danych" on public.forma_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "forma: usunięcie własnych danych" on public.forma_state;
create policy "forma: usunięcie własnych danych" on public.forma_state
  for delete to authenticated using ((select auth.uid()) = user_id);

-- 4. Niezalogowani (rola anon) nie mają żadnego dostępu do tabeli.
revoke all on public.forma_state from anon;
grant select, insert, update, delete on public.forma_state to authenticated;
-- TRUNCATE omija RLS — zalogowani go nie potrzebują.
revoke truncate, references, trigger on public.forma_state from authenticated;
