// auth.js — Login / logout

import { SB, ANON } from './config.js';
import { setTOK }   from './state.js';
import { $ }        from './utils.js';
import { loadData } from './api.js';
import { D }        from './state.js';
import { showPage } from './nav.js';

const SESSION_KEY = 'telnix_admin_session_v1';

function isJwtExpired(token) {
  if (!token || token.split('.').length < 2) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now() + 30000;
  } catch {
    return false;
  }
}

function normalizePolicyPayload(payload) {
  const orderedPolicies = Array.isArray(payload?.orderedPolicies)
    ? payload.orderedPolicies
    : Array.isArray(payload?.policies)
      ? payload.policies
      : Array.isArray(payload?.rules)
        ? payload.rules
        : [];

  const policyGroups = Array.isArray(payload?.policyGroups)
    ? payload.policyGroups.map(g => ({
        ...g,
        policyIds: Array.isArray(g?.policyIds) ? g.policyIds.filter(Boolean) : [],
      }))
    : Array.isArray(payload?.groups)
      ? payload.groups.map(g => ({
          ...g,
          policyIds: Array.isArray(g?.policyIds)
            ? g.policyIds.filter(Boolean)
            : Array.isArray(g?.policies)
              ? g.policies.map(p => typeof p === 'string' ? p : p?.id).filter(Boolean)
              : [],
        }))
      : [];

  const policiesById = new Map(orderedPolicies.filter(Boolean).map(pol => [pol.id, pol]));
  const assignedIds = new Set();
  policyGroups.forEach(group => (group.policyIds || []).forEach(id => {
    if (policiesById.has(id)) assignedIds.add(id);
  }));

  const defaultGroup = policyGroups.find(g => g._isDefault || g.name === 'Default') || null;
  const orphanIds = orderedPolicies
    .filter(pol => pol?.id && !assignedIds.has(pol.id))
    .map(pol => pol.id);

  if (!policyGroups.length) {
    policyGroups.push({
      id: 'grp_def_' + Date.now(),
      name: 'Default',
      _isDefault: true,
      policyIds: orphanIds,
    });
  } else if (orphanIds.length) {
    if (defaultGroup) {
      defaultGroup.policyIds = [...new Set([...(defaultGroup.policyIds || []), ...orphanIds])];
    } else {
      policyGroups.unshift({
        id: 'grp_def_' + Date.now(),
        name: 'Default',
        _isDefault: true,
        policyIds: orphanIds,
      });
    }
  }

  return { orderedPolicies, policyGroups };
}

function persistSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function readPersistedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearPersistedSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function refreshPersistedSession(session) {
  if (!session?.refreshToken) return null;
  try {
    const r = await fetch(`${SB}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    const d = await r.json();
    if (!r.ok || !d?.access_token) return null;

    const next = {
      accessToken: d.access_token,
      refreshToken: d.refresh_token || session.refreshToken,
      email: d.user?.email || session.email || '',
    };
    persistSession(next);
    setTOK(next.accessToken);
    return next;
  } catch {
    return null;
  }
}

async function ensureSession() {
  const session = readPersistedSession();
  if (!session?.accessToken) return null;
  if (!isJwtExpired(session.accessToken)) {
    setTOK(session.accessToken);
    return session;
  }
  return refreshPersistedSession(session);
}

async function hydrateAppState() {
  const payload = await loadData();
  if (payload) {
    const normalized = normalizePolicyPayload(payload);
    D.orderedPolicies         = normalized.orderedPolicies;
    D.pendingPolicies         = payload.pendingPolicies         || [];
    D.policyGroups            = normalized.policyGroups;
    D.urlLists                = payload.urlLists                || [];
    D.pendingUrlLists         = payload.pendingUrlLists         || [];
    D.customCategories        = payload.customCategories        || [];
    D.pendingCustomCategories = payload.pendingCustomCategories || [];
    D.policySettings          = payload.policySettings          || { defaultAction: 'allow' };
    D.fileTypeLists           = payload.fileTypeLists           || [];
    D.bypassTokens            = payload.bypassTokens            || [];
    D.categoryPolicies        = payload.categoryPolicies        || {};
    D.agentConfig             = payload.agentConfig             || {};
  }

  if (!D.policyGroups.find(g => g.name === 'Default')) {
    D.policyGroups.push({ id: 'grp_def_' + Date.now(), name: 'Default', _isDefault: true, policyIds: [] });
  }
}

function showAuthenticatedUi(email) {
  $('adm-email-lbl') && ($('adm-email-lbl').textContent = email || '');
  if ($('login-screen')) $('login-screen').style.display = 'none';
  if ($('app')) $('app').style.display = 'flex';
}

function isLegacyIndexShell() {
  return !!($('login-screen') && $('app'));
}

export function initAuth() {
  $('l-btn')?.addEventListener('click', doLogin);
  $('l-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') $('l-pass')?.focus(); });
  $('l-pass')?.addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });
  $('logout-btn')?.addEventListener('click', doLogout);
  restoreIndexSession();
}

async function doLogin() {
  const email = $('l-email').value.trim(), pass = $('l-pass').value, err = $('l-err');
  err.style.display = 'none';
  $('l-btn').disabled = true; $('l-btn').textContent = 'Signing in...';
  try {
    const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const d = await r.json();
    if (!r.ok) {
      err.textContent = d.error_description || 'Invalid credentials';
      err.style.display = 'block';
      $('l-btn').disabled = false; $('l-btn').textContent = 'Sign In';
      return;
    }

    setTOK(d.access_token);
    persistSession({
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      email: d.user.email,
    });
    showAuthenticatedUi(d.user.email);
    await hydrateAppState();

    if (isLegacyIndexShell()) {
      location.href = './dashboard.html';
      return;
    }

    const nextPage = (location.hash || '#dashboard').replace(/^#/, '');
    await showPage(nextPage);
    // Restore pending bar if pending policies exist from previous session
    if ((D.pendingPolicies||[]).length > 0) {
      import('./policies.js').then(m => m.renderPols());
    }
  } catch {
    err.textContent = 'Connection error.';
    err.style.display = 'block';
    $('l-btn').disabled = false; $('l-btn').textContent = 'Sign In';
  }
}

async function doLogout() {
  const { TOK } = await import('./state.js');
  await fetch(`${SB}/auth/v1/logout`, {
    method: 'POST',
    headers: { 'apikey': ANON, 'Authorization': `Bearer ${TOK}` },
  }).catch(() => {});
  setTOK(null);
  clearPersistedSession();
  if ($('app')) $('app').style.display = 'none';
  if ($('login-screen')) {
    $('login-screen').style.display = 'flex';
  } else {
    location.href = './index.html';
  }
}

async function restoreIndexSession() {
  const session = await ensureSession();
  if (!session?.accessToken) return;

  if (isLegacyIndexShell()) {
    location.href = './dashboard.html';
    return;
  }

  showAuthenticatedUi(session.email);
  await hydrateAppState();

  const nextPage = (location.hash || '#dashboard').replace(/^#/, '');
  await showPage(nextPage);
}

export async function requireSession(redirectTo = './index.html') {
  const session = await ensureSession();
  if (!session?.accessToken) {
    clearPersistedSession();
    location.href = redirectTo;
    return null;
  }
  return session;
}

export async function bootstrapProtectedPage(options = {}) {
  const {
    emailLabelId = 'adm-email-lbl',
    redirectTo = './index.html',
  } = options;

  const session = await requireSession(redirectTo);
  if (!session) return null;

  const emailLabel = $(emailLabelId);
  if (emailLabel) emailLabel.textContent = session.email || '';

  await hydrateAppState();
  bindLogoutButtons();
  return session;
}

export function bindLogoutButtons() {
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    if (btn.dataset.logoutBound === 'true') return;
    btn.dataset.logoutBound = 'true';
    btn.addEventListener('click', doLogout);
  });
}

export function getStoredSession() {
  return readPersistedSession();
}
