// api.js — All Supabase REST API calls

import { SB, ANON, ORG, SVC } from './config.js';
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

  // Build server-side filters (applied before fetching)
  let url = `/rest/v1/activity_logs?org_id=eq.${ORG}&order=ts.desc`;

  // Date range — push to server for efficiency
  if (filters.tsFrom) url += `&ts=gte.${filters.tsFrom}`;
  if (filters.tsTo)   url += `&ts=lte.${filters.tsTo}`;

  // Action/activity — server side
  if (filters.action)   url += `&action=eq.${filters.action}`;
  if (filters.activity) url += `&activity=eq.${filters.activity}`;

  // User email — server side exact match (case insensitive via ilike)
  if (filters.userEmail) url += `&user_email=ilike.*${encodeURIComponent(filters.userEmail)}*`;

  // Count total before pagination (same filters, no limit)
  const countUrl = url + `&select=count`;
  const countRes = await sbf(countUrl, { headers: { 'Prefer': 'count=exact' } });
  const totalCount = parseInt(countRes.headers?.get?.('content-range')?.split('/')?.[1] || '0', 10) || 0;

  // Fetch page
  url += `&limit=${PAGE_SIZE}&offset=${offset}`;
  const r = await sbf(url);
  if (!r.ok) return { logs: [], total: 0 };
  let logs = await r.json();

  // Client-side filters (can't push to server easily)
  if (filters.search)         logs = logs.filter(l => (l.domain||'').toLowerCase().includes(filters.search) || (l.user_email||'').toLowerCase().includes(filters.search) || (l.url||'').toLowerCase().includes(filters.search));
  if (filters.category)       logs = logs.filter(l => (l.category||'') === filters.category);
  if (filters.proceeded)      logs = logs.filter(l => l.proceeded === true);
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
  const r = await fetch(SB + '/auth/v1/admin/users?per_page=100', {
    headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}` }
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.users || [];
}

export async function fetchUserLogMap() {
  const r = await fetch(SB + `/rest/v1/activity_logs?org_id=eq.${ORG}&select=user_email,ts&order=ts.desc&limit=5000`, {
    headers: { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' }
  });
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
