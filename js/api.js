// api.js — All Supabase REST API calls

import { SB, ANON, ORG } from './config.js';
import { TOK, D }        from './state.js';

export async function sbf(path, opts = {}) {
  const headers = {
    'apikey':        ANON,
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${TOK || ANON}`,
    ...(opts.headers || {}),
  };
  return fetch(SB + path, { ...opts, headers });
}

export async function loadData() {
  try {
    const r = await sbf(`/rest/v1/policies?org_id=eq.${ORG}&order=updated_at.desc&limit=1`);
    if (!r.ok) { console.warn('[API] loadData failed:', r.status); return null; }
    const rows = await r.json();
    return rows[0]?.payload || null;
  } catch (e) {
    console.error('[API] loadData error:', e);
    return null;
  }
}

export async function saveData() {
  try {
    const check = await sbf(`/rest/v1/policies?org_id=eq.${ORG}&select=id`);
    const rows  = check.ok ? await check.json() : [];

    let r;
    if (rows.length > 0) {
      r = await sbf(`/rest/v1/policies?org_id=eq.${ORG}`, {
        method:  'PATCH',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          payload:    D,
          version:    Math.floor(Date.now() / 1000),
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      r = await sbf('/rest/v1/policies', {
        method:  'POST',
        headers: { 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          org_id:  ORG,
          payload: D,
          version: Math.floor(Date.now() / 1000),
        }),
      });
    }

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('[API] saveData failed:', r.status, text);
    }
    return r.ok;
  } catch (e) {
    console.error('[API] saveData error:', e);
    return false;
  }
}

export async function fetchLogs(filters = {}) {
  let url = `/rest/v1/activity_logs?org_id=eq.${ORG}&order=ts.desc&limit=500`;
  if (filters.action)   url += `&action=eq.${filters.action}`;
  if (filters.activity) url += `&activity=eq.${filters.activity}`;
  const r = await sbf(url);
  if (!r.ok) return [];
  let logs = await r.json();
  if (filters.search)    logs = logs.filter(l => (l.domain||'').includes(filters.search) || (l.user_email||'').includes(filters.search));
  if (filters.userEmail) logs = logs.filter(l => (l.user_email||'').includes(filters.userEmail));
  return logs;
}

export async function fetchDashStats() {
  const since = Date.now() - 86400000;
  const r = await sbf(`/rest/v1/activity_logs?org_id=eq.${ORG}&ts=gte.${since}&order=ts.desc&limit=300`);
  if (!r.ok) return [];
  return r.json();
}

export async function fetchAuthUsers() {
  const r = await sbf('/auth/v1/admin/users?per_page=100');
  if (!r.ok) return null;
  const d = await r.json();
  return d.users || [];
}

export async function fetchUserLogMap() {
  const r = await sbf(`/rest/v1/activity_logs?org_id=eq.${ORG}&select=user_email,ts&order=ts.desc&limit=5000`);
  if (!r.ok) return {};
  const logs = await r.json();
  const map  = {};
  for (const l of logs) {
    if (!l.user_email) continue;
    if (!map[l.user_email]) map[l.user_email] = { count: 0, last: 0 };
    map[l.user_email].count++;
    if (l.ts > map[l.user_email].last) map[l.user_email].last = l.ts;
  }
  return map;
}
