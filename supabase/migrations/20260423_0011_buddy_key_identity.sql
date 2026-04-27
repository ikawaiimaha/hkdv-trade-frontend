alter table public.traders
  add column if not exists buddy_key text;

update public.traders
set buddy_key = case
  when buddy_name = 'My Melody' then 'my_melody'
  when buddy_name = 'Hello Kitty' then 'hello_kitty'
  when buddy_name = 'Pompompurin' then 'pompompurin'
  when buddy_name = 'Kuromi' then 'kuromi'
  when buddy_name = 'Kerokerokeroppi' then 'kerokerokeroppi'
  when buddy_name = 'Tuxedosam' then 'tuxedosam'
  when buddy_name = 'Pochacco' then 'pochacco'
  when buddy_name = 'Badtz-Maru' then 'badtz_maru'
  when buddy_name = 'Little Twin Stars (Kiki & Lala)' then 'kiki_lala'
  when buddy_name = 'Gudetama' then 'gudetama'
  when buddy_name = 'Cinnamoroll' then 'cinnamoroll'
  when buddy_name = 'Wish me mell' then 'wish_me_mell'
  when buddy_name = 'Cogimyun' then 'cogimyun'
  when buddy_name = 'Hangyodon' then 'hangyodon'
  when buddy_name = 'Ahiru No Pekkle' then 'ahirunopekkle'
  else buddy_key
end
where buddy_key is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_buddy_key_valid'
  ) then
    alter table public.traders
      add constraint traders_buddy_key_valid
      check (
        buddy_key is null
        or buddy_key in (
          'my_melody',
          'hello_kitty',
          'pompompurin',
          'kuromi',
          'kerokerokeroppi',
          'tuxedosam',
          'pochacco',
          'badtz_maru',
          'kiki_lala',
          'gudetama',
          'cinnamoroll',
          'wish_me_mell',
          'cogimyun',
          'hangyodon',
          'ahirunopekkle'
        )
      );
  end if;
end;
$$;

create or replace function public.get_my_buddy()
returns table (
  trader_id uuid,
  buddy_key text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    t.id as trader_id,
    t.buddy_key
  from public.traders t
  where t.id = public.app_current_trader_id()
  limit 1;
$$;

create or replace function public.set_my_buddy(
  p_buddy_key text
)
returns table (
  trader_id uuid,
  buddy_key text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_buddy_key text := nullif(trim(coalesce(p_buddy_key, '')), '');
begin
  if v_buddy_key is not null and v_buddy_key not in (
    'my_melody',
    'hello_kitty',
    'pompompurin',
    'kuromi',
    'kerokerokeroppi',
    'tuxedosam',
    'pochacco',
    'badtz_maru',
    'kiki_lala',
    'gudetama',
    'cinnamoroll',
    'wish_me_mell',
    'cogimyun',
    'hangyodon',
    'ahirunopekkle'
  ) then
    raise exception 'Buddy key must be one of the supported HKDV characters.';
  end if;

  update public.traders
  set
    buddy_key = v_buddy_key,
    buddy_name = case v_buddy_key
      when 'my_melody' then 'My Melody'
      when 'hello_kitty' then 'Hello Kitty'
      when 'pompompurin' then 'Pompompurin'
      when 'kuromi' then 'Kuromi'
      when 'kerokerokeroppi' then 'Kerokerokeroppi'
      when 'tuxedosam' then 'Tuxedosam'
      when 'pochacco' then 'Pochacco'
      when 'badtz_maru' then 'Badtz-Maru'
      when 'kiki_lala' then 'Little Twin Stars (Kiki & Lala)'
      when 'gudetama' then 'Gudetama'
      when 'cinnamoroll' then 'Cinnamoroll'
      when 'wish_me_mell' then 'Wish me mell'
      when 'cogimyun' then 'Cogimyun'
      when 'hangyodon' then 'Hangyodon'
      when 'ahirunopekkle' then 'Ahiru No Pekkle'
      else null
    end,
    updated_at = timezone('utc', now())
  where id = v_trader_id;

  return query
  select t.id, t.buddy_key
  from public.traders t
  where t.id = v_trader_id;
end;
$$;

create or replace function public.upsert_my_trader_profile(
  p_display_name text,
  p_buddy_key text default null,
  p_strawberry_title text default 'Strawberry Syrup',
  p_profile_code text default null,
  p_is_profile_code_visible boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_display_name text := nullif(trim(coalesce(p_display_name, '')), '');
  v_buddy_key text := nullif(trim(coalesce(p_buddy_key, '')), '');
  v_strawberry_title text := nullif(trim(coalesce(p_strawberry_title, '')), '');
  v_profile_code text := nullif(upper(trim(coalesce(p_profile_code, ''))), '');
  v_payload jsonb;
begin
  if v_display_name is null then
    raise exception 'Display name is required.';
  end if;

  if v_buddy_key is not null and v_buddy_key not in (
    'my_melody',
    'hello_kitty',
    'pompompurin',
    'kuromi',
    'kerokerokeroppi',
    'tuxedosam',
    'pochacco',
    'badtz_maru',
    'kiki_lala',
    'gudetama',
    'cinnamoroll',
    'wish_me_mell',
    'cogimyun',
    'hangyodon',
    'ahirunopekkle'
  ) then
    raise exception 'Buddy key must be one of the supported HKDV characters.';
  end if;

  if v_strawberry_title is null or v_strawberry_title not in (
    'Strawberry Syrup',
    'Strawberry Cookie',
    'Strawberry Macaron',
    'Strawberry Milk',
    'Strawberry Parfait',
    'Strawberry Cake'
  ) then
    raise exception 'Strawberry rank must be one of the supported Strawberry titles.';
  end if;

  update public.traders
  set
    display_name = v_display_name,
    buddy_key = v_buddy_key,
    buddy_name = case v_buddy_key
      when 'my_melody' then 'My Melody'
      when 'hello_kitty' then 'Hello Kitty'
      when 'pompompurin' then 'Pompompurin'
      when 'kuromi' then 'Kuromi'
      when 'kerokerokeroppi' then 'Kerokerokeroppi'
      when 'tuxedosam' then 'Tuxedosam'
      when 'pochacco' then 'Pochacco'
      when 'badtz_maru' then 'Badtz-Maru'
      when 'kiki_lala' then 'Little Twin Stars (Kiki & Lala)'
      when 'gudetama' then 'Gudetama'
      when 'cinnamoroll' then 'Cinnamoroll'
      when 'wish_me_mell' then 'Wish me mell'
      when 'cogimyun' then 'Cogimyun'
      when 'hangyodon' then 'Hangyodon'
      when 'ahirunopekkle' then 'Ahiru No Pekkle'
      else null
    end,
    strawberry_title = v_strawberry_title,
    profile_code = v_profile_code,
    is_profile_code_visible = coalesce(p_is_profile_code_visible, false),
    updated_at = timezone('utc', now())
  where id = v_trader_id;

  select to_jsonb(t)
  into v_payload
  from public.traders t
  where t.id = v_trader_id;

  return v_payload;
end;
$$;

grant execute on function public.get_my_buddy() to authenticated;
grant execute on function public.set_my_buddy(text) to authenticated;
grant execute on function public.upsert_my_trader_profile(text, text, text, text, boolean) to authenticated;
