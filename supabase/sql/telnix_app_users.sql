create extension if not exists pgcrypto;

create table if not exists public.telnix_app_users (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  email text not null check (email = lower(email)),
  password_hash text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz null,
  unique (org_id, email)
);

create table if not exists public.telnix_app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.telnix_app_users(id) on delete cascade,
  session_token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create or replace function public.telnix_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists telnix_app_users_touch_updated_at on public.telnix_app_users;
create trigger telnix_app_users_touch_updated_at
before update on public.telnix_app_users
for each row
execute function public.telnix_touch_updated_at();

alter table public.telnix_app_users enable row level security;
alter table public.telnix_app_sessions enable row level security;

drop policy if exists telnix_app_users_no_direct_access on public.telnix_app_users;
create policy telnix_app_users_no_direct_access
on public.telnix_app_users
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists telnix_app_sessions_no_direct_access on public.telnix_app_sessions;
create policy telnix_app_sessions_no_direct_access
on public.telnix_app_sessions
for all
to anon, authenticated
using (false)
with check (false);

create or replace function public.telnix_app_login(
  p_org_id uuid,
  p_email text,
  p_password text,
  p_require_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_require text := lower(trim(coalesce(p_require_role, '')));
  v_user public.telnix_app_users%rowtype;
  v_token text;
  v_expires timestamptz;
begin
  select *
    into v_user
    from public.telnix_app_users
   where org_id = p_org_id
     and email = v_email
     and is_active = true
   limit 1;

  if not found or v_user.password_hash <> extensions.crypt(coalesce(p_password, ''), v_user.password_hash) then
    return jsonb_build_object('ok', false, 'error', 'Invalid email or password.');
  end if;

  if v_require = 'admin' and v_user.role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin access required.');
  end if;

  if v_require = 'user' and v_user.role <> 'user' then
    return jsonb_build_object('ok', false, 'error', 'This account can only sign in to the admin panel.');
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + interval '7 days';

  insert into public.telnix_app_sessions (user_id, session_token, expires_at)
  values (v_user.id, v_token, v_expires);

  update public.telnix_app_users
     set last_login_at = now()
   where id = v_user.id;

  return jsonb_build_object(
    'ok', true,
    'sessionToken', v_token,
    'userId', v_user.id,
    'email', v_user.email,
    'role', v_user.role,
    'orgId', v_user.org_id,
    'expiresAt', (extract(epoch from v_expires) * 1000)::bigint
  );
end;
$$;

create or replace function public.telnix_app_validate_session(
  p_session_token text,
  p_require_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_require text := lower(trim(coalesce(p_require_role, '')));
  v_user record;
begin
  select
    u.id,
    u.org_id,
    u.email,
    u.role,
    s.session_token,
    s.expires_at
    into v_user
    from public.telnix_app_sessions s
    join public.telnix_app_users u on u.id = s.user_id
   where s.session_token = trim(coalesce(p_session_token, ''))
     and s.expires_at > now()
     and u.is_active = true
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Session expired. Please sign in again.');
  end if;

  if v_require = 'admin' and v_user.role <> 'admin' then
    return jsonb_build_object('ok', false, 'error', 'Admin role required.');
  end if;

  if v_require = 'user' and v_user.role <> 'user' then
    return jsonb_build_object('ok', false, 'error', 'This account can only sign in to the admin panel.');
  end if;

  update public.telnix_app_sessions
     set last_seen_at = now()
   where session_token = v_user.session_token;

  return jsonb_build_object(
    'ok', true,
    'sessionToken', v_user.session_token,
    'userId', v_user.id,
    'email', v_user.email,
    'role', v_user.role,
    'orgId', v_user.org_id,
    'expiresAt', (extract(epoch from v_user.expires_at) * 1000)::bigint
  );
end;
$$;

create or replace function public.telnix_app_logout(
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.telnix_app_sessions
   where session_token = trim(coalesce(p_session_token, ''));

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.telnix_admin_list_users(
  p_session_token text,
  p_org_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_users jsonb;
begin
  select
    u.id,
    u.org_id,
    u.email,
    u.role
    into v_admin
    from public.telnix_app_sessions s
    join public.telnix_app_users u on u.id = s.user_id
   where s.session_token = trim(coalesce(p_session_token, ''))
     and s.expires_at > now()
     and u.is_active = true
     and u.role = 'admin'
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Admin session required.');
  end if;

  if p_org_id is not null and v_admin.org_id <> p_org_id then
    return jsonb_build_object('ok', false, 'error', 'Admin session does not match this organisation.');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'role', u.role,
        'is_active', u.is_active,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_login_at
      )
      order by u.email
    ),
    '[]'::jsonb
  )
    into v_users
    from public.telnix_app_users u
   where u.org_id = coalesce(p_org_id, v_admin.org_id);

  return jsonb_build_object('ok', true, 'users', v_users);
end;
$$;

create or replace function public.telnix_admin_upsert_user(
  p_session_token text,
  p_org_id uuid,
  p_email text,
  p_password text,
  p_role text,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role text := lower(trim(coalesce(p_role, 'user')));
  v_existing public.telnix_app_users%rowtype;
  v_mode text := 'created';
begin
  select
    u.id,
    u.org_id,
    u.email,
    u.role
    into v_admin
    from public.telnix_app_sessions s
    join public.telnix_app_users u on u.id = s.user_id
   where s.session_token = trim(coalesce(p_session_token, ''))
     and s.expires_at > now()
     and u.is_active = true
     and u.role = 'admin'
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Admin session required.');
  end if;

  if p_org_id is not null and v_admin.org_id <> p_org_id then
    return jsonb_build_object('ok', false, 'error', 'Admin session does not match this organisation.');
  end if;

  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'Email is required.');
  end if;

  if coalesce(length(trim(coalesce(p_password, ''))), 0) < 8 then
    return jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  end if;

  if v_role not in ('user', 'admin') then
    return jsonb_build_object('ok', false, 'error', 'Role must be user or admin.');
  end if;

  select *
    into v_existing
    from public.telnix_app_users
   where org_id = coalesce(p_org_id, v_admin.org_id)
     and email = v_email
   limit 1;

  if found then
    v_mode := 'updated';
    update public.telnix_app_users
       set password_hash = extensions.crypt(trim(p_password), extensions.gen_salt('bf', 10)),
           role = v_role,
           is_active = coalesce(p_is_active, true)
     where id = v_existing.id
     returning * into v_existing;
  else
    insert into public.telnix_app_users (
      org_id,
      email,
      password_hash,
      role,
      is_active
    ) values (
      coalesce(p_org_id, v_admin.org_id),
      v_email,
      extensions.crypt(trim(p_password), extensions.gen_salt('bf', 10)),
      v_role,
      coalesce(p_is_active, true)
    )
    returning * into v_existing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'mode', v_mode,
    'user', jsonb_build_object(
      'id', v_existing.id,
      'email', v_existing.email,
      'role', v_existing.role,
      'is_active', v_existing.is_active
    )
  );
end;
$$;

create or replace function public.telnix_admin_get_payload(
  p_session_token text,
  p_org_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_payload jsonb;
begin
  select
    u.id,
    u.org_id,
    u.email,
    u.role
    into v_admin
    from public.telnix_app_sessions s
    join public.telnix_app_users u on u.id = s.user_id
   where s.session_token = trim(coalesce(p_session_token, ''))
     and s.expires_at > now()
     and u.is_active = true
     and u.role = 'admin'
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Admin session required.');
  end if;

  if p_org_id is not null and v_admin.org_id <> p_org_id then
    return jsonb_build_object('ok', false, 'error', 'Admin session does not match this organisation.');
  end if;

  select p.payload
    into v_payload
    from public.policies p
   where p.org_id = coalesce(p_org_id, v_admin.org_id)
   order by p.updated_at desc nulls last, p.id desc
   limit 1;

  return jsonb_build_object('ok', true, 'payload', coalesce(v_payload, '{}'::jsonb));
end;
$$;

create or replace function public.telnix_admin_save_payload(
  p_session_token text,
  p_org_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_policy_id bigint;
  v_version bigint := floor(extract(epoch from now()));
begin
  select
    u.id,
    u.org_id,
    u.email,
    u.role
    into v_admin
    from public.telnix_app_sessions s
    join public.telnix_app_users u on u.id = s.user_id
   where s.session_token = trim(coalesce(p_session_token, ''))
     and s.expires_at > now()
     and u.is_active = true
     and u.role = 'admin'
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Admin session required.');
  end if;

  if p_org_id is not null and v_admin.org_id <> p_org_id then
    return jsonb_build_object('ok', false, 'error', 'Admin session does not match this organisation.');
  end if;

  select p.id
    into v_policy_id
    from public.policies p
   where p.org_id = coalesce(p_org_id, v_admin.org_id)
   order by p.updated_at desc nulls last, p.id desc
   limit 1;

  if v_policy_id is null then
    insert into public.policies (org_id, payload, version)
    values (coalesce(p_org_id, v_admin.org_id), coalesce(p_payload, '{}'::jsonb), v_version)
    returning id into v_policy_id;
  else
    update public.policies
       set payload = coalesce(p_payload, '{}'::jsonb),
           version = v_version,
           updated_at = now()
     where id = v_policy_id;
  end if;

  return jsonb_build_object('ok', true, 'id', v_policy_id, 'version', v_version);
end;
$$;

create or replace function public.telnix_admin_fetch_logs(
  p_session_token text,
  p_org_id uuid,
  p_limit integer default 5000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin record;
  v_logs jsonb;
  v_limit integer := greatest(1, least(coalesce(p_limit, 5000), 10000));
begin
  select
    u.id,
    u.org_id,
    u.email,
    u.role
    into v_admin
    from public.telnix_app_sessions s
    join public.telnix_app_users u on u.id = s.user_id
   where s.session_token = trim(coalesce(p_session_token, ''))
     and s.expires_at > now()
     and u.is_active = true
     and u.role = 'admin'
   limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Admin session required.');
  end if;

  if p_org_id is not null and v_admin.org_id <> p_org_id then
    return jsonb_build_object('ok', false, 'error', 'Admin session does not match this organisation.');
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(l) order by l.ts desc),
    '[]'::jsonb
  )
    into v_logs
    from (
      select
        id,
        ts,
        user_email,
        domain,
        url,
        action,
        activity,
        reason,
        policy_name,
        group_name,
        category,
        threat_score,
        known_malicious,
        download_filename,
        upload_filename,
        file_count,
        total_size,
        upload_type,
        upload_blocked,
        proceeded,
        created_at,
        initiator,
        xhr_method,
        xhr_risk,
        xhr_has_file,
        xhr_size,
        xhr_content_type,
        page_domain,
        local_id
      from public.activity_logs
      where org_id = coalesce(p_org_id, v_admin.org_id)
      order by ts desc
      limit v_limit
    ) l;

  return jsonb_build_object('ok', true, 'logs', v_logs);
end;
$$;

grant execute on function public.telnix_app_login(uuid, text, text, text) to anon, authenticated;
grant execute on function public.telnix_app_validate_session(text, text) to anon, authenticated;
grant execute on function public.telnix_app_logout(text) to anon, authenticated;
grant execute on function public.telnix_admin_list_users(text, uuid) to anon, authenticated;
grant execute on function public.telnix_admin_upsert_user(text, uuid, text, text, text, boolean) to anon, authenticated;
grant execute on function public.telnix_admin_get_payload(text, uuid) to anon, authenticated;
grant execute on function public.telnix_admin_save_payload(text, uuid, jsonb) to anon, authenticated;
grant execute on function public.telnix_admin_fetch_logs(text, uuid, integer) to anon, authenticated;
