-- ============================================================================
-- Migration: add_dream_board_tables
-- Creates Dream Boards, sticker placements, RLS policies, and helper RPCs.
-- Cleaned from Notes_260427_001412.txt.
-- ============================================================================

create table if not exists public.dream_boards (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid not null references public.traders(id) on delete cascade,
  title text not null default 'My Dream Board',
  theme_bg text not null default 'default-pink-grid',
  layout_type text not null default 'freeform'
    check (layout_type in ('3x3', 'freeform')),
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  likes_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_dream_boards_trader
  on public.dream_boards(trader_id, status, updated_at desc);

create index if not exists idx_dream_boards_published
  on public.dream_boards(status, updated_at desc)
  where status = 'published';

drop trigger if exists set_dream_boards_updated_at on public.dream_boards;
create trigger set_dream_boards_updated_at
before update on public.dream_boards
for each row execute function public.touch_updated_at();

create table if not exists public.dream_board_stickers (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.dream_boards(id) on delete cascade,
  sticker_type text not null
    check (sticker_type in ('catalog_item', 'decor')),
  item_id uuid null references public.items(id) on delete set null,
  decor_key text null,
  x_coordinate numeric(10,2) not null default 0.00,
  y_coordinate numeric(10,2) not null default 0.00,
  rotation numeric(6,2) not null default 0.00,
  scale numeric(5,3) not null default 1.000,
  z_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint dream_board_stickers_source_check check (
    (
      sticker_type = 'catalog_item'
      and item_id is not null
      and decor_key is null
    )
    or
    (
      sticker_type = 'decor'
      and decor_key is not null
      and item_id is null
    )
  )
);

create index if not exists idx_dream_board_stickers_board
  on public.dream_board_stickers(board_id, z_index desc, created_at);

create index if not exists idx_dream_board_stickers_item
  on public.dream_board_stickers(item_id)
  where sticker_type = 'catalog_item';

create index if not exists idx_dream_board_stickers_decor
  on public.dream_board_stickers(decor_key)
  where sticker_type = 'decor';

drop trigger if exists set_dream_board_stickers_updated_at on public.dream_board_stickers;
create trigger set_dream_board_stickers_updated_at
before update on public.dream_board_stickers
for each row execute function public.touch_updated_at();

alter table public.dream_boards enable row level security;
alter table public.dream_board_stickers enable row level security;

drop policy if exists dream_boards_select on public.dream_boards;
create policy dream_boards_select
on public.dream_boards
for select
using (
  status = 'published'
  or trader_id = public.app_current_trader_id()
);

drop policy if exists dream_boards_insert on public.dream_boards;
create policy dream_boards_insert
on public.dream_boards
for insert
with check (trader_id = public.app_current_trader_id());

drop policy if exists dream_boards_update on public.dream_boards;
create policy dream_boards_update
on public.dream_boards
for update
using (trader_id = public.app_current_trader_id())
with check (trader_id = public.app_current_trader_id());

drop policy if exists dream_boards_delete on public.dream_boards;
create policy dream_boards_delete
on public.dream_boards
for delete
using (trader_id = public.app_current_trader_id());

drop policy if exists dream_board_stickers_select on public.dream_board_stickers;
create policy dream_board_stickers_select
on public.dream_board_stickers
for select
using (
  exists (
    select 1
    from public.dream_boards b
    where b.id = board_id
      and (
        b.status = 'published'
        or b.trader_id = public.app_current_trader_id()
      )
  )
);

drop policy if exists dream_board_stickers_insert on public.dream_board_stickers;
create policy dream_board_stickers_insert
on public.dream_board_stickers
for insert
with check (
  exists (
    select 1
    from public.dream_boards b
    where b.id = board_id
      and b.trader_id = public.app_current_trader_id()
  )
);

drop policy if exists dream_board_stickers_update on public.dream_board_stickers;
create policy dream_board_stickers_update
on public.dream_board_stickers
for update
using (
  exists (
    select 1
    from public.dream_boards b
    where b.id = board_id
      and b.trader_id = public.app_current_trader_id()
  )
)
with check (
  exists (
    select 1
    from public.dream_boards b
    where b.id = board_id
      and b.trader_id = public.app_current_trader_id()
  )
);

drop policy if exists dream_board_stickers_delete on public.dream_board_stickers;
create policy dream_board_stickers_delete
on public.dream_board_stickers
for delete
using (
  exists (
    select 1
    from public.dream_boards b
    where b.id = board_id
      and b.trader_id = public.app_current_trader_id()
  )
);

create or replace function public.clone_dream_board(p_board_id uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_trader_id uuid := public.app_current_trader_id();
  v_new_board_id uuid;
  v_source_board public.dream_boards%rowtype;
begin
  select *
  into v_source_board
  from public.dream_boards b
  where b.id = p_board_id
    and (
      b.status = 'published'
      or b.trader_id = v_trader_id
    );

  if v_source_board.id is null then
    raise exception 'Dream Board % was not found.', p_board_id;
  end if;

  insert into public.dream_boards (
    trader_id,
    title,
    theme_bg,
    layout_type,
    status
  )
  values (
    v_trader_id,
    v_source_board.title || ' (Remix)',
    v_source_board.theme_bg,
    v_source_board.layout_type,
    'draft'
  )
  returning id into v_new_board_id;

  insert into public.dream_board_stickers (
    board_id,
    sticker_type,
    item_id,
    decor_key,
    x_coordinate,
    y_coordinate,
    rotation,
    scale,
    z_index
  )
  select
    v_new_board_id,
    s.sticker_type,
    s.item_id,
    s.decor_key,
    s.x_coordinate,
    s.y_coordinate,
    s.rotation,
    s.scale,
    s.z_index
  from public.dream_board_stickers s
  where s.board_id = p_board_id;

  return v_new_board_id;
end;
$$;

create or replace function public.publish_dream_board(
  p_board_id uuid,
  p_status text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_board_id uuid;
begin
  if p_status not in ('draft', 'published') then
    raise exception 'Invalid Dream Board status: %', p_status;
  end if;

  update public.dream_boards b
  set
    status = p_status,
    updated_at = timezone('utc', now())
  where b.id = p_board_id
    and b.trader_id = public.app_current_trader_id()
  returning b.id into v_board_id;

  if v_board_id is null then
    raise exception 'Dream Board % was not found for this trader.', p_board_id;
  end if;

  return v_board_id;
end;
$$;

comment on table public.dream_boards is 'Freeform or grid-based trader sticker-book boards.';
comment on table public.dream_board_stickers is 'Placed catalog items or decor stickers on a Dream Board.';
comment on function public.clone_dream_board(uuid) is 'Creates a draft remix of a published or owned Dream Board.';
comment on function public.publish_dream_board(uuid, text) is 'Toggles a trader-owned Dream Board between draft and published.';

revoke execute on function public.clone_dream_board(uuid) from public;
revoke execute on function public.publish_dream_board(uuid, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.clone_dream_board(uuid) from anon;
    revoke execute on function public.publish_dream_board(uuid, text) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.clone_dream_board(uuid) to authenticated;
    grant execute on function public.publish_dream_board(uuid, text) to authenticated;
  end if;
end $$;
