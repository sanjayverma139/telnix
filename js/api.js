// api.js — All Supabase REST API calls

import { SB, ANON, ORG, EDGE_FUNCTIONS } from './config.js';
import { TOK, D, setTOK } from './state.js';

const SESSION_KEY = 'telnix_admin_session_v1';

function decodeJwtPayload(token) {
  if (!token || token.split('.').length < 2) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isJwtExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 <= Date.now() + 30000;
}

function readPersistedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function persistSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function refreshPersistedSession(session) {
  if (!session?.refreshToken) return null;
  try {
    const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d?.access_token) return null;

    const next = {
      accessToken: String(d.access_token || '').trim(),
      refreshToken: String(d.refresh_token || session.refreshToken || '').trim(),
      email: d.user?.email || session.email || '',
      role: d.user?.app_metadata?.role || d.user?.user_metadata?.role || session.role || 'user',
    };
    persistSession(next);
    setTOK(next.accessToken);
    return next.accessToken;
  } catch {
    return null;
  }
}

async function ensureAccessToken(forceRefresh = false) {
  if (!forceRefresh && TOK && !isJwtExpired(TOK)) {
    return String(TOK).trim();
  }

  const session = readPersistedSession();
  if (!session) return null;

  const persistedToken = String(session.accessToken || '').trim();
  if (!forceRefresh && persistedToken && !isJwtExpired(persistedToken)) {
    setTOK(persistedToken);
    return persistedToken;
  }

  return refreshPersistedSession(session);
}

export async function sbf(path, opts = {}) {
  const accessToken = await ensureAccessToken(false);
  const bearer = accessToken || ANON;
  const headers = {
    'apikey':        ANON,
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${bearer}`,
    ...(opts.headers || {}),
  };
  return fetch(SB + path, { ...opts, headers });
}

export async function invokeEdgeFunction(name, payload = {}) {
  const callOnce = async (accessToken) => {
    const response = await fetch(`${SB}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        'apikey': ANON,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        ...payload,
        userJwt: accessToken,
      }),
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    return { response, body };
  };

  let accessToken = await ensureAccessToken(false);
  if (!accessToken) {
    throw new Error('Session expired. Please sign in again.');
  }

  let { response, body } = await callOnce(accessToken);
  const errorText = String(body?.error || body?.message || '').trim().toLowerCase();
  if (response.status === 401 && (errorText.includes('jwt') || errorText.includes('token'))) {
    const refreshedToken = await ensureAccessToken(true);
    if (refreshedToken && refreshedToken !== accessToken) {
      accessToken = refreshedToken;
      ({ response, body } = await callOnce(accessToken));
    }
  }

  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  }

  return body;
}

export async function loadData() {
  try {
    const r = await sbf(`/rest/v1/policies?org_id=eq.${ORG}&order=updated_at.desc&limit=1`);
    if (!r.ok) { console.warn('[API] loadData failed:', r.status); return null; }
    const rows = await r.json();
    return rows[0]?.payload || null;
  } catch (e) { console.error('[API] loadData error:', e); return null; }
}

// saveData always writes the full D object (including pendingPolicies)
// Extension only ever reads orderedPolicies — pendingPolicies are ignored by it
export async function saveData() {
  try {
    const check = await sbf(`/rest/v1/policies?org_id=eq.${ORG}&select=id`);
    const rows  = check.ok ? await check.json() : [];
    const ver   = Math.floor(Date.now() / 1000);

    const r = rows.length > 0
      ? await sbf(`/rest/v1/policies?org_id=eq.${ORG}`, {
          method:  'PATCH',
          headers: { 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ payload: D, version: ver, updated_at: new Date().toISOString() }),
        })
      : await sbf('/rest/v1/policies', {
          method:  'POST',
          headers: { 'Prefer': 'return=minimal' },
          body:    JSON.stringify({ org_id: ORG, payload: D, version: ver }),
        });

    if (!r.ok) { const t = await r.text().catch(() => ''); console.error('[API] saveData failed:', r.status, t); }
    return r.ok;
  } catch (e) { console.error('[API] saveData error:', e); return false; }
}

export const PAGE_SIZE = 100;

export async function fetchLogs(filters = {}, page = 0) {
  const offset = page * PAGE_SIZE;
  let url = `/rest/v1/activity_logs?org_id=eq.${ORG}&order=ts.desc`;

  // Date range
  if (filters.tsFrom) url += `&ts=gte.${filters.tsFrom}`;
  if (filters.tsTo)   url += `&ts=lte.${filters.tsTo}`;

  // Multi-value action filter — Supabase supports action=in.(block,warn)
  if (filters.actions?.length === 1)   url += `&action=eq.${filters.actions[0]}`;
  else if (filters.actions?.length > 1) url += `&action=in.(${filters.actions.join(',')})`;

  // Multi-value activity filter
  if (filters.activities?.length === 1)   url += `&activity=eq.${filters.activities[0]}`;
  else if (filters.activities?.length > 1) url += `&activity=in.(${filters.activities.join(',')})`;

  // Multi-user filter
  if (filters.users?.length === 1)   url += `&user_email=eq.${encodeURIComponent(filters.users[0])}`;
  else if (filters.users?.length > 1) url += `&user_email=in.(${filters.users.map(u=>`"${u}"`).join(',')})`;

  // Count total
  // Get total count — use head=true with count=exact
  const countRes = await sbf(url, {
    method: 'HEAD',
    headers: { 'Prefer': 'count=exact' }
  });
  const totalCount = parseInt(countRes.headers?.get?.('content-range')?.split('/')?.[1] || '0', 10) || 0;

  // Fetch page
  const r = await sbf(url + `&limit=${PAGE_SIZE}&offset=${offset}`);
  if (!r.ok) return { logs: [], total: 0 };
  let logs = await r.json();

  // Client-side filters
  if (filters.search) logs = logs.filter(l =>
    (l.domain||'').toLowerCase().includes(filters.search) ||
    (l.user_email||'').toLowerCase().includes(filters.search) ||
    (l.url||'').toLowerCase().includes(filters.search));
  if (filters.knownMalicious) logs = logs.filter(l => l.known_malicious === true);
  if (filters.highRisk)       logs = logs.filter(l => (l.threat_score||0) >= 55);
  if (filters.medRisk)        logs = logs.filter(l => (l.threat_score||0) >= 30 && (l.threat_score||0) < 55);

  return { logs, total: totalCount };
}

export async function fetchDashStats() {
  const since = Date.now() - 86400000;
  const r = await sbf(`/rest/v1/activity_logs?org_id=eq.${ORG}&ts=gte.${since}&order=ts.desc&limit=500`);
  if (!r.ok) return [];
  return r.json();
}

export async function fetchAuthUsers() {
  try {
    const result = await invokeEdgeFunction(EDGE_FUNCTIONS.adminUsers, { action: 'list_users' });
    return Array.isArray(result?.users) ? result.users : [];
  } catch (err) {
    console.warn('[API] fetchAuthUsers fallback:', err.message);
    return null;
  }
}

export async function createAuthUser(userData) {
  return invokeEdgeFunction(EDGE_FUNCTIONS.adminUsers, {
    action: 'create_user',
    ...userData,
  });
}

export async function fetchUserLogMap() {
  const r = await sbf(`/rest/v1/activity_logs?org_id=eq.${ORG}&select=user_email,ts&order=ts.desc&limit=5000`);
  if (!r.ok) return {};
  const logs = await r.json();
  const map = {};
  for (const l of logs) {
    if (!l.user_email) continue;
    if (!map[l.user_email]) map[l.user_email] = { count: 0, last: 0 };
    map[l.user_email].count++;
    if (l.ts > map[l.user_email].last) map[l.user_email].last = l.ts;
  }
  return map;
}
