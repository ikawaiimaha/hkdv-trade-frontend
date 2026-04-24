alter table public.traders
  add column if not exists birth_month integer,
  add column if not exists birth_day integer,
  add column if not exists birthday_locked boolean not null default false,
  add column if not exists birthday_set_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_birth_month_valid'
  ) then
    alter table public.traders
      add constraint traders_birth_month_valid
      check (birth_month is null or birth_month between 1 and 12);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_birth_day_valid'
  ) then
    alter table public.traders
      add constraint traders_birth_day_valid
      check (birth_day is null or birth_day between 1 and 31);
  end if;
end;
$$;

create index if not exists traders_birthday_lookup_idx
  on public.traders (birth_month, birth_day)
  where birth_month is not null
    and birth_day is not null
    and birthday_locked = true;

create table if not exists public.trader_birthday_gifts (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  gift_year integer not null,
  gifted_at timestamptz not null default timezone('utc', now()),
  constraint trader_birthday_gifts_unique unique (trader_id, gift_year)
);

alter table public.trader_birthday_gifts enable row level security;

create or replace function public.is_valid_month_day(p_birth_month integer, p_birth_day integer)
returns boolean
language plpgsql
immutable
as $$
begin
  if p_birth_month is null or p_birth_day is null then
    return false;
  end if;

  if p_birth_month < 1 or p_birth_month > 12 then
    return false;
  end if;

  if p_birth_day < 1 then
    return false;
  end if;

  case
    when p_birth_month in (1, 3, 5, 7, 8, 10, 12) then
      return p_birth_day <= 31;
    when p_birth_month in (4, 6, 9, 11) then
      return p_birth_day <= 30;
    when p_birth_month = 2 then
      return p_birth_day <= 29;
    else
      return false;
  end case;
end;
$$;

create or replace function public.get_zodiac_key(p_birth_month integer, p_birth_day integer)
returns text
language plpgsql
immutable
as $$
begin
  if not public.is_valid_month_day(p_birth_month, p_birth_day) then
    raise exception 'Invalid month/day';
  end if;

  if (p_birth_month = 12 and p_birth_day >= 22) or (p_birth_month = 1 and p_birth_day <= 19) then
    return 'zodiac_capricorn';
  elsif (p_birth_month = 1 and p_birth_day >= 20) or (p_birth_month = 2 and p_birth_day <= 18) then
    return 'zodiac_aquarius';
  elsif (p_birth_month = 2 and p_birth_day >= 19) or (p_birth_month = 3 and p_birth_day <= 20) then
    return 'zodiac_pisces';
  elsif (p_birth_month = 3 and p_birth_day >= 21) or (p_birth_month = 4 and p_birth_day <= 19) then
    return 'zodiac_aries';
  elsif (p_birth_month = 4 and p_birth_day >= 20) or (p_birth_month = 5 and p_birth_day <= 20) then
    return 'zodiac_taurus';
  elsif (p_birth_month = 5 and p_birth_day >= 21) or (p_birth_month = 6 and p_birth_day <= 20) then
    return 'zodiac_gemini';
  elsif (p_birth_month = 6 and p_birth_day >= 21) or (p_birth_month = 7 and p_birth_day <= 22) then
    return 'zodiac_cancer';
  elsif (p_birth_month = 7 and p_birth_day >= 23) or (p_birth_month = 8 and p_birth_day <= 22) then
    return 'zodiac_leo';
  elsif (p_birth_month = 8 and p_birth_day >= 23) or (p_birth_month = 9 and p_birth_day <= 22) then
    return 'zodiac_virgo';
  elsif (p_birth_month = 9 and p_birth_day >= 23) or (p_birth_month = 10 and p_birth_day <= 22) then
    return 'zodiac_libra';
  elsif (p_birth_month = 10 and p_birth_day >= 23) or (p_birth_month = 11 and p_birth_day <= 21) then
    return 'zodiac_scorpio';
  end if;

  return 'zodiac_sagittarius';
end;
$$;

create or replace function public.grant_due_birthday_gifts(
  p_target_date date default (timezone('utc', now()))::date
)
returns table (
  trader_id uuid,
  gift_year integer,
  gifted_at timestamptz,
  zodiac_key text
)
language sql
security definer
set search_path = public
as $$
  with due_traders as (
    select
      t.id as trader_id,
      extract(year from p_target_date)::integer as gift_year,
      public.get_zodiac_key(t.birth_month, t.birth_day) as zodiac_key
    from public.traders t
    where t.status = 'active'
      and coalesce(t.birthday_locked, false) = true
      and t.birth_month = extract(month from p_target_date)::integer
      and t.birth_day = extract(day from p_target_date)::integer
  ),
  inserted as (
    insert into public.trader_birthday_gifts (trader_id, gift_year)
    select trader_id, gift_year
    from due_traders
    on conflict (trader_id, gift_year) do nothing
    returning trader_id, gift_year, gifted_at
  )
  select
    inserted.trader_id,
    inserted.gift_year,
    inserted.gifted_at,
    due_traders.zodiac_key
  from inserted
  join due_traders
    on due_traders.trader_id = inserted.trader_id
   and due_traders.gift_year = inserted.gift_year;
$$;

create or replace function public.get_my_birthday()
returns table (
  trader_id uuid,
  birth_month integer,
  birth_day integer,
  birthday_locked boolean,
  birthday_set_at timestamptz,
  zodiac_key text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    t.id as trader_id,
    t.birth_month,
    t.birth_day,
    t.birthday_locked,
    t.birthday_set_at,
    public.get_zodiac_key(t.birth_month, t.birth_day) as zodiac_key
  from public.traders t
  where t.id = public.app_current_trader_id()
  limit 1;
$$;

create or replace function public.set_my_birthday(
  p_birth_month integer,
  p_birth_day integer
)
returns table (
  trader_id uuid,
  birth_month integer,
  birth_day integer,
  birthday_locked boolean,
  birthday_set_at timestamptz,
  zodiac_key text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_birthday_locked boolean;
  v_zodiac_key text;
begin
  if p_birth_month is null or p_birth_day is null then
    raise exception 'Birth month and day are required.';
  end if;

  select coalesce(t.birthday_locked, false)
  into v_birthday_locked
  from public.traders t
  where t.id = v_trader_id;

  if v_birthday_locked then
    raise exception 'Birthday has already been set and is locked.';
  end if;

  v_zodiac_key := public.get_zodiac_key(p_birth_month, p_birth_day);

  update public.traders
  set
    birth_month = p_birth_month,
    birth_day = p_birth_day,
    birthday_locked = true,
    birthday_set_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = v_trader_id;

  return query
  select
    t.id,
    t.birth_month,
    t.birth_day,
    t.birthday_locked,
    t.birthday_set_at,
    v_zodiac_key
  from public.traders t
  where t.id = v_trader_id;
end;
$$;

grant execute on function public.get_my_birthday() to authenticated;
grant execute on function public.set_my_birthday(integer, integer) to authenticated;
grant execute on function public.is_valid_month_day(integer, integer) to authenticated;
grant execute on function public.get_zodiac_key(integer, integer) to authenticated;
