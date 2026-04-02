// api.js — All Supabase REST API calls

import { SB, ANON, ORG } from './config.js';
import { D } from './state.js';

const SESSION_KEY = 'telnix_admin_session_v1';

function readPersistedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function normalizeSessionPayload(payload) {
  const src = payload?.session || payload || {};
  return {
    sessionToken: String(src.sessionToken || src.session_token || '').trim(),
    userId: src.userId || src.user_id || null,
    email: String(src.email || '').trim().toLowerCase(),
    role: String(src.role || 'user').trim().toLowerCase(),
    orgId: src.orgId || src.org_id || ORG,
    expiresAt: Number(src.expiresAt || src.expires_at || 0) || 0,
  };
}

async function rpc(name, params = {}) {
  const response = await fetch(`${SB}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify(params),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Request failed (${response.status})`);
  }

  return body;
}

export async function sbf(path, opts = {}) {
  const headers = {
    'apikey':        ANON,
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${ANON}`,
    ...(opts.headers || {}),
  };
  return fetch(SB + path, { ...opts, headers });
}

export async function appLogin(email, password, requireRole = 'admin') {
  const result = await rpc('telnix_app_login', {
    p_org_id: ORG,
    p_email: String(email || '').trim().toLowerCase(),
    p_password: String(password || ''),
    p_require_role: requireRole || null,
  });
  if (!result?.ok) {
    throw new Error(result?.error || 'Login failed.');
  }
  return normalizeSessionPayload(result);
}

export async function validateAppSession(sessionToken, requireRole = 'admin') {
  const token = String(sessionToken || '').trim();
  if (!token) return null;
  const result = await rpc('telnix_app_validate_session', {
    p_session_token: token,
    p_require_role: requireRole || null,
  });
  if (!result?.ok) return null;
  return normalizeSessionPayload(result);
}

export async function appLogout(sessionToken) {
  const token = String(sessionToken || '').trim();
  if (!token) return true;
  try {
    await rpc('telnix_app_logout', {
      p_session_token: token,
    });
  } catch {
    // local logout should still succeed even if remote cleanup fails
  }
  return true;
}

export async function loadData() {
  try {
    const session = readPersistedSession();
    if (!session?.sessionToken) return null;
    const result = await rpc('telnix_admin_get_payload', {
      p_session_token: session.sessionToken,
      p_org_id: ORG,
    });
    if (!result?.ok) {
      console.warn('[API] loadData failed:', result?.error || 'Unknown error');
      return null;
    }
    return result?.payload || null;
  } catch (e) { console.error('[API] loadData error:', e); return null; }
}

// saveData always writes the full D object (including pendingPolicies)
// Extension only ever reads orderedPolicies — pendingPolicies are ignored by it
export async function saveData() {
  try {
    const session = readPersistedSession();
    if (!session?.sessionToken) {
      console.error('[API] saveData failed: missing admin session');
      return false;
    }
    const result = await rpc('telnix_admin_save_payload', {
      p_session_token: session.sessionToken,
      p_org_id: ORG,
      p_payload: D,
    });
    if (!result?.ok) {
      console.error('[API] saveData failed:', result?.error || 'Unknown error');
      return false;
    }
    return true;
  } catch (e) { console.error('[API] saveData error:', e); return false; }
}

export const PAGE_SIZE = 100;

async function fetchAdminLogs(limit = 5000) {
  const session = readPersistedSession();
  if (!session?.sessionToken) throw new Error('Session expired. Please sign in again.');
  const result = await rpc('telnix_admin_fetch_logs', {
    p_session_token: session.sessionToken,
    p_org_id: ORG,
    p_limit: limit,
  });
  if (!result?.ok) {
    throw new Error(result?.error || 'Could not load activity logs.');
  }
  return Array.isArray(result?.logs) ? result.logs : [];
}

function filterLogs(logs, filters = {}) {
  let out = Array.isArray(logs) ? [...logs] : [];

  if (filters.tsFrom != null) out = out.filter(l => Number(l?.ts || 0) >= Number(filters.tsFrom));
  if (filters.tsTo != null) out = out.filter(l => Number(l?.ts || 0) <= Number(filters.tsTo));

  if (filters.actions?.length) {
    const actionSet = new Set(filters.actions.map(v => String(v || '').toLowerCase()));
    out = out.filter(l => actionSet.has(String(l?.action || '').toLowerCase()));
  }

  if (filters.activities?.length) {
    const activitySet = new Set(filters.activities.map(v => String(v || '').toLowerCase()));
    out = out.filter(l => activitySet.has(String(l?.activity || '').toLowerCase()));
  }

  if (filters.users?.length) {
    const userSet = new Set(filters.users.map(v => String(v || '').toLowerCase()));
    out = out.filter(l => userSet.has(String(l?.user_email || '').toLowerCase()));
  }

  if (filters.search) {
    const needle = String(filters.search || '').toLowerCase();
    out = out.filter(l =>
      String(l?.domain || '').toLowerCase().includes(needle) ||
      String(l?.user_email || '').toLowerCase().includes(needle) ||
      String(l?.url || '').toLowerCase().includes(needle)
    );
  }

  if (filters.knownMalicious) out = out.filter(l => l?.known_malicious === true);
  if (filters.highRisk) out = out.filter(l => Number(l?.threat_score || 0) >= 55);
  if (filters.medRisk) out = out.filter(l => {
    const score = Number(l?.threat_score || 0);
    return score >= 30 && score < 55;
  });

  return out;
}

export async function fetchLogs(filters = {}, page = 0) {
  const offset = page * PAGE_SIZE;
  const allLogs = await fetchAdminLogs(5000);
  const filteredLogs = filterLogs(allLogs, filters);
  return {
    logs: filteredLogs.slice(offset, offset + PAGE_SIZE),
    total: filteredLogs.length,
  };
}

export async function fetchDashStats() {
  const since = Date.now() - 86400000;
  const logs = await fetchAdminLogs(1000);
  return logs.filter(l => Number(l?.ts || 0) >= since);
}

export async function fetchAuthUsers() {
  try {
    const session = readPersistedSession();
    if (!session?.sessionToken) throw new Error('Session expired. Please sign in again.');
    const result = await rpc('telnix_admin_list_users', {
      p_session_token: session.sessionToken,
      p_org_id: ORG,
    });
    return Array.isArray(result?.users) ? result.users : Array.isArray(result) ? result : [];
  } catch (err) {
    console.warn('[API] fetchAuthUsers fallback:', err?.message || err);
    return null;
  }
}

export async function createAuthUser(userData) {
  const session = readPersistedSession();
  if (!session?.sessionToken) {
    throw new Error('Session expired. Please sign in again.');
  }

  const password = String(userData?.password || '').trim();
  if (!password) {
    throw new Error('Password is required for SQL users.');
  }

  const result = await rpc('telnix_admin_upsert_user', {
    p_session_token: session.sessionToken,
    p_org_id: ORG,
    p_email: String(userData?.email || '').trim().toLowerCase(),
    p_password: password,
    p_role: String(userData?.role || 'user').trim().toLowerCase(),
  });
  if (!result?.ok) {
    throw new Error(result?.error || 'User save failed.');
  }
  return result;
}

export async function fetchUserLogMap() {
  const logs = await fetchAdminLogs(5000).catch(() => []);
  const map = {};
  for (const l of logs) {
    if (!l.user_email) continue;
    if (!map[l.user_email]) map[l.user_email] = { count: 0, last: 0 };
    map[l.user_email].count++;
    if (l.ts > map[l.user_email].last) map[l.user_email].last = l.ts;
  }
  return map;
}

export async function fetchKnownUserEmails() {
  const [users, logs] = await Promise.all([
    fetchAuthUsers().catch(() => null),
    fetchAdminLogs(5000).catch(() => []),
  ]);

  const emails = new Set();
  for (const user of users || []) {
    const email = String(user?.email || '').trim().toLowerCase();
    if (email) emails.add(email);
  }
  for (const log of logs || []) {
    const email = String(log?.user_email || '').trim().toLowerCase();
    if (email) emails.add(email);
  }
  return [...emails].sort();
}
