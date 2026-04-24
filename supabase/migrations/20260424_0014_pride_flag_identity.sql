begin;

alter table public.traders
add column if not exists pride_flag_key text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'traders_pride_flag_key_valid'
  ) then
    alter table public.traders
      add constraint traders_pride_flag_key_valid
      check (
        pride_flag_key is null
        or pride_flag_key in (
          'rainbow',
          'progress_pride',
          'lesbian',
          'gay',
          'bisexual',
          'pansexual',
          'asexual',
          'aromantic',
          'demisexual',
          'queer',
          'questioning',
          'transgender',
          'nonbinary',
          'genderfluid',
          'agender',
          'intersex'
        )
      );
  end if;
end $$;

create or replace function public.get_my_profile_identity()
returns table (
  trader_id uuid,
  pride_flag_key text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    t.id as trader_id,
    t.pride_flag_key
  from public.traders t
  where t.id = public.app_current_trader_id()
  limit 1;
$$;

drop function if exists public.upsert_my_trader_profile(text, text, text, text, boolean);

create or replace function public.upsert_my_trader_profile(
  p_display_name text,
  p_buddy_key text default null,
  p_pride_flag_key text default null,
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
  v_pride_flag_key text := nullif(trim(coalesce(p_pride_flag_key, '')), '');
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

  if v_pride_flag_key is not null and v_pride_flag_key not in (
    'rainbow',
    'progress_pride',
    'lesbian',
    'gay',
    'bisexual',
    'pansexual',
    'asexual',
    'aromantic',
    'demisexual',
    'queer',
    'questioning',
    'transgender',
    'nonbinary',
    'genderfluid',
    'agender',
    'intersex'
  ) then
    raise exception 'Identity badge must be one of the supported pride flag options.';
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
    pride_flag_key = v_pride_flag_key,
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

comment on function public.get_my_profile_identity() is 'Returns the authenticated trader profile identity badge fields.';
comment on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) is 'Updates the authenticated trader profile fields used by the desk identity surface.';

revoke execute on function public.get_my_profile_identity() from public;
revoke execute on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.get_my_profile_identity() from anon;
    revoke execute on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.get_my_profile_identity() to authenticated;
    grant execute on function public.upsert_my_trader_profile(text, text, text, text, text, boolean) to authenticated;
  end if;
end $$;

commit;
