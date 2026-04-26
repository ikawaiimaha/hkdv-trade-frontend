-- MomoMint Invite-Only + HKDV Verification Migration
-- Run this in Supabase SQL Editor

-- ============================================================
-- 1. invitation_codes
-- ============================================================

create table if not exists invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references traders(id),
  used_by uuid references traders(id),
  used_at timestamptz,
  expires_at timestamptz,
  max_uses int not null default 1,
  use_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),

  constraint invite_one_use check (use_count <= max_uses)
);

comment on table invitation_codes is 'Single-use or limited-use invite codes for platform access';

-- ============================================================
-- 2. hkdv_player_accounts
-- ============================================================

create table if not exists hkdv_player_accounts (
  id uuid primary key default gen_random_uuid(),
  trader_id uuid unique references traders(id) on delete cascade,
  hkdv_player_id text unique not null,
  hkdv_display_name text not null,
  proof_image_url text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','approved','rejected')),
  verified_by uuid references traders(id),
  verified_at timestamptz,
  created_at timestamptz default now()
);

comment on table hkdv_player_accounts is 'HKDV game account linked to each trader. One-to-one enforced.';

-- ============================================================
-- 3. application_attempts (rate limiting)
-- ============================================================

create table if not exists application_attempts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null,
  ip_hash text,
  action text not null,
  created_at timestamptz default now()
);

create index if not exists idx_app_attempts_user on application_attempts(auth_user_id, created_at desc);

-- ============================================================
-- 4. Update traders.status enum to include 'pending'
-- ============================================================

-- Note: If your traders.status already has a check constraint, you may need to drop and recreate it.
-- The existing enum from the handoff was: 'invited' | 'active' | 'suspended' | 'banned'
-- We need to add 'pending' for applicants awaiting approval.

-- Check existing constraint first:
-- \d traders

-- If needed, run:
-- alter table traders drop constraint if exists traders_status_check;
-- alter table traders add constraint traders_status_check 
--   check (status in ('invited','pending','active','suspended','banned'));

-- ============================================================
-- 5. Helper functions for RLS
-- ============================================================

create or replace function app_current_trader_id()
returns uuid
language sql stable
as $$
  select id from traders where auth_user_id = auth.uid() limit 1;
$$;

create or replace function app_current_trader_is_admin()
returns boolean
language sql stable
as $$
  select coalesce(
    (select is_admin from traders where auth_user_id = auth.uid() limit 1),
    false
  );
$$;

-- ============================================================
-- 6. RPC: redeem_invitation_code
-- ============================================================

create or replace function redeem_invitation_code(p_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_invite invitation_codes%rowtype;
  v_trader_id uuid;
begin
  -- Find current trader from auth session
  select id into v_trader_id
  from traders
  where auth_user_id = auth.uid();

  if v_trader_id is null then
    raise exception 'Login required';
  end if;

  -- Lock the invitation row
  select * into v_invite
  from invitation_codes
  where code = upper(trim(p_code))
    and is_active = true
  for update;

  if v_invite.id is null then
    raise exception 'Invalid invitation code';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invitation code expired';
  end if;

  if v_invite.use_count >= v_invite.max_uses then
    raise exception 'Invitation code already used';
  end if;

  -- Mark as used
  update invitation_codes
  set
    use_count = use_count + 1,
    used_by = v_trader_id,
    used_at = now(),
    is_active = case when use_count + 1 >= max_uses then false else true end
  where id = v_invite.id;

  return v_invite.id;
end;
$$;

-- ============================================================
-- 7. RPC: submit_hkdv_verification
-- ============================================================

create or replace function submit_hkdv_verification(
  p_invitation_code text,
  p_hkdv_player_id text,
  p_hkdv_display_name text,
  p_proof_image_url text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_trader_id uuid;
  v_invite_id uuid;
  v_account_id uuid;
begin
  select id into v_trader_id
  from traders
  where auth_user_id = auth.uid();

  if v_trader_id is null then
    raise exception 'Login required';
  end if;

  -- Redeem the invitation code first
  v_invite_id := redeem_invitation_code(p_invitation_code);

  -- Create HKDV account link (pending approval)
  insert into hkdv_player_accounts (
    trader_id,
    hkdv_player_id,
    hkdv_display_name,
    proof_image_url,
    verification_status
  )
  values (
    v_trader_id,
    trim(p_hkdv_player_id),
    trim(p_hkdv_display_name),
    p_proof_image_url,
    'pending'
  )
  returning id into v_account_id;

  -- Update trader status to pending
  update traders
  set status = 'pending'
  where id = v_trader_id;

  return v_account_id;
end;
$$;

-- ============================================================
-- 8. RPC: admin_approve_hkdv_account
-- ============================================================

create or replace function admin_approve_hkdv_account(p_account_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_admin uuid;
  v_trader uuid;
begin
  if not app_current_trader_is_admin() then
    raise exception 'Admin only';
  end if;

  v_admin := app_current_trader_id();

  select trader_id into v_trader
  from hkdv_player_accounts
  where id = p_account_id;

  if v_trader is null then
    raise exception 'HKDV account not found';
  end if;

  update hkdv_player_accounts
  set
    verification_status = 'approved',
    verified_by = v_admin,
    verified_at = now()
  where id = p_account_id;

  update traders
  set status = 'active'
  where id = v_trader;
end;
$$;

-- ============================================================
-- 9. RPC: admin_reject_hkdv_account
-- ============================================================

create or replace function admin_reject_hkdv_account(p_account_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
as $$
declare
  v_admin uuid;
  v_trader uuid;
begin
  if not app_current_trader_is_admin() then
    raise exception 'Admin only';
  end if;

  v_admin := app_current_trader_id();

  select trader_id into v_trader
  from hkdv_player_accounts
  where id = p_account_id;

  if v_trader is null then
    raise exception 'HKDV account not found';
  end if;

  update hkdv_player_accounts
  set
    verification_status = 'rejected',
    verified_by = v_admin,
    verified_at = now()
  where id = p_account_id;

  -- Trader stays locked (status remains pending or becomes suspended)
  update traders
  set status = 'suspended'
  where id = v_trader;
end;
$$;

-- ============================================================
-- 10. RPC: generate_invitation_code (admin only)
-- ============================================================

create or replace function generate_invitation_code(p_max_uses int default 1, p_expires_at timestamptz default null)
returns text
language plpgsql
security definer
as $$
declare
  v_code text;
  v_creator uuid;
begin
  if not app_current_trader_is_admin() then
    raise exception 'Admin only';
  end if;

  v_creator := app_current_trader_id();
  v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into invitation_codes (code, created_by, max_uses, expires_at)
  values (v_code, v_creator, p_max_uses, p_expires_at);

  return v_code;
end;
$$;

-- ============================================================
-- 11. RLS Policies
-- ============================================================

-- invitation_codes: only admins can manage, no user reads
alter table invitation_codes enable row level security;

create policy "admins_manage_invite_codes"
  on invitation_codes
  for all
  using (app_current_trader_is_admin())
  with check (app_current_trader_is_admin());

-- hkdv_player_accounts: users read own, admins manage all
alter table hkdv_player_accounts enable row level security;

create policy "users_read_own_hkdv"
  on hkdv_player_accounts
  for select
  using (trader_id = app_current_trader_id());

create policy "admins_manage_hkdv"
  on hkdv_player_accounts
  for all
  using (app_current_trader_is_admin())
  with check (app_current_trader_is_admin());

-- application_attempts: users insert own, no one reads others
alter table application_attempts enable row level security;

create policy "users_insert_own_attempts"
  on application_attempts
  for insert
  with check (auth_user_id = auth.uid());

create policy "users_read_own_attempts"
  on application_attempts
  for select
  using (auth_user_id = auth.uid());

-- ============================================================
-- 12. Triggers: auto-update updated_at on traders
-- ============================================================

-- If not already present, ensure traders.updated_at auto-updates
-- create or replace function update_updated_at_column()
-- returns trigger as $$
-- begin
--   new.updated_at = now();
--   return new;
-- end;
-- $$ language plpgsql;
--
-- create trigger update_traders_updated_at
--   before update on traders
--   for each row execute function update_updated_at_column();

-- ============================================================
-- End of migration
-- ============================================================
