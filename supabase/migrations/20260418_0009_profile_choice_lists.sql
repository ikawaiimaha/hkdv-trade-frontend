alter table public.traders
  add column if not exists strawberry_title text not null default 'Strawberry Syrup';

update public.traders
set
  buddy_name = case
    when buddy_name = 'Mikaela' then 'My Melody'
    when buddy_name in (
      'Hello Kitty',
      'My Melody',
      'Little Twin Stars (Kiki & Lala)',
      'Tuxedosam',
      'Cinnamoroll',
      'Pompompurin',
      'Pochacco',
      'Kuromi',
      'Gudetama',
      'Badtz-Maru',
      'Wish me mell',
      'Cogimyun',
      'Kerokerokeroppi',
      'Hangyodon',
      'Ahiru No Pekkle'
    ) then buddy_name
    else null
  end,
  strawberry_title = case
    when strawberry_title in (
      'Strawberry Syrup',
      'Strawberry Cookie',
      'Strawberry Macaron',
      'Strawberry Milk',
      'Strawberry Parfait',
      'Strawberry Cake'
    ) then strawberry_title
    when coalesce(strawberry_rank, 0) >= 70 then 'Strawberry Cake'
    when coalesce(strawberry_rank, 0) >= 55 then 'Strawberry Parfait'
    when coalesce(strawberry_rank, 0) >= 40 then 'Strawberry Milk'
    when coalesce(strawberry_rank, 0) >= 25 then 'Strawberry Macaron'
    when coalesce(strawberry_rank, 0) >= 10 then 'Strawberry Cookie'
    else 'Strawberry Syrup'
  end,
  updated_at = timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_buddy_name_valid'
  ) then
    alter table public.traders
      add constraint traders_buddy_name_valid
      check (
        buddy_name is null
        or buddy_name in (
          'Hello Kitty',
          'My Melody',
          'Little Twin Stars (Kiki & Lala)',
          'Tuxedosam',
          'Cinnamoroll',
          'Pompompurin',
          'Pochacco',
          'Kuromi',
          'Gudetama',
          'Badtz-Maru',
          'Wish me mell',
          'Cogimyun',
          'Kerokerokeroppi',
          'Hangyodon',
          'Ahiru No Pekkle'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_strawberry_title_valid'
  ) then
    alter table public.traders
      add constraint traders_strawberry_title_valid
      check (
        strawberry_title in (
          'Strawberry Syrup',
          'Strawberry Cookie',
          'Strawberry Macaron',
          'Strawberry Milk',
          'Strawberry Parfait',
          'Strawberry Cake'
        )
      );
  end if;
end $$;

drop function if exists public.upsert_my_trader_profile(text, text, integer, text, boolean);

create or replace function public.upsert_my_trader_profile(
  p_display_name text,
  p_buddy_name text default null,
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
  v_buddy_name text := nullif(trim(coalesce(p_buddy_name, '')), '');
  v_strawberry_title text := nullif(trim(coalesce(p_strawberry_title, '')), '');
  v_profile_code text := nullif(upper(trim(coalesce(p_profile_code, ''))), '');
  v_payload jsonb;
begin
  if v_display_name is null then
    raise exception 'Display name is required.';
  end if;

  if v_buddy_name is not null and v_buddy_name not in (
    'Hello Kitty',
    'My Melody',
    'Little Twin Stars (Kiki & Lala)',
    'Tuxedosam',
    'Cinnamoroll',
    'Pompompurin',
    'Pochacco',
    'Kuromi',
    'Gudetama',
    'Badtz-Maru',
    'Wish me mell',
    'Cogimyun',
    'Kerokerokeroppi',
    'Hangyodon',
    'Ahiru No Pekkle'
  ) then
    raise exception 'Buddy must be one of the supported HKDV characters.';
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
    buddy_name = v_buddy_name,
    strawberry_title = v_strawberry_title,
    strawberry_rank = case v_strawberry_title
      when 'Strawberry Cake' then 78
      when 'Strawberry Parfait' then 60
      when 'Strawberry Milk' then 44
      when 'Strawberry Macaron' then 30
      when 'Strawberry Cookie' then 18
      else 8
    end,
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

comment on function public.upsert_my_trader_profile(text, text, text, text, boolean) is 'Updates the authenticated trader profile fields used by the desk identity surface.';

revoke execute on function public.upsert_my_trader_profile(text, text, text, text, boolean) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.upsert_my_trader_profile(text, text, text, text, boolean) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.upsert_my_trader_profile(text, text, text, text, boolean) from authenticated;
    grant execute on function public.upsert_my_trader_profile(text, text, text, text, boolean) to authenticated;
  end if;
end $$;
