create or replace function public.app_current_trader_id()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_email_local text;
  v_display_name text;
  v_username_base text;
  v_username_candidate text;
  v_username_suffix text;
  v_trader_id uuid;
begin
  if v_auth_user_id is null and v_email = '' then
    raise exception 'A Supabase session is required.';
  end if;

  select t.id
  into v_trader_id
  from public.traders t
  where
    (v_auth_user_id is not null and t.auth_user_id = v_auth_user_id)
    or (v_email <> '' and lower(coalesce(t.email, '')) = v_email)
  order by case when t.auth_user_id = v_auth_user_id then 0 else 1 end
  limit 1;

  if v_trader_id is null then
    v_email_local := split_part(
      coalesce(nullif(v_email, ''), coalesce(v_auth_user_id::text, 'trader')),
      '@',
      1
    );
    v_display_name := nullif(
      trim(
        coalesce(
          auth.jwt() -> 'user_metadata' ->> 'display_name',
          auth.jwt() -> 'user_metadata' ->> 'full_name',
          ''
        )
      ),
      ''
    );

    if v_display_name is null then
      v_display_name := nullif(
        trim(initcap(regexp_replace(v_email_local, '[_\.\-]+', ' ', 'g'))),
        ''
      );
    end if;

    if v_display_name is null then
      v_display_name := 'HKDV Trader';
    end if;

    v_username_base := lower(regexp_replace(v_email_local, '[^a-z0-9]+', '_', 'g'));
    v_username_base := trim(both '_' from v_username_base);

    if v_username_base = '' then
      v_username_base := 'trader';
    end if;

    v_username_candidate := left(v_username_base, 24);

    if v_username_candidate = '' then
      v_username_candidate := 'trader';
    end if;

    while exists (
      select 1
      from public.traders t
      where t.username = v_username_candidate
    ) loop
      v_username_suffix := substr(encode(gen_random_bytes(3), 'hex'), 1, 6);
      v_username_candidate := left(v_username_base, 17) || '_' || v_username_suffix;
    end loop;

    insert into public.traders (
      username,
      email,
      auth_user_id,
      display_name,
      passcode_hash,
      status
    )
    values (
      v_username_candidate,
      nullif(v_email, ''),
      v_auth_user_id,
      v_display_name,
      'supabase-auth:' || coalesce(v_auth_user_id::text, v_email, gen_random_uuid()::text),
      'active'
    )
    returning id
    into v_trader_id;
  end if;

  if v_auth_user_id is not null then
    update public.traders
    set
      auth_user_id = coalesce(auth_user_id, v_auth_user_id),
      email = coalesce(email, nullif(v_email, '')),
      updated_at = timezone('utc', now())
    where id = v_trader_id
      and (
        auth_user_id is null
        or (email is null and v_email <> '')
      );
  end if;

  return v_trader_id;
end;
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
    case
      when t.birth_month is not null and t.birth_day is not null
        then public.get_zodiac_key(t.birth_month, t.birth_day)
      else null
    end as zodiac_key
  from public.traders t
  where t.id = public.app_current_trader_id()
  limit 1;
$$;

comment on function public.app_current_trader_id() is 'Resolves the current trader from the authenticated Supabase user, linking by email when possible and auto-creating a trader desk when none exists yet.';
comment on function public.get_my_birthday() is 'Returns the authenticated trader birthday identity fields and computed zodiac key.';
