// auth.js — Login / logout

import { SB, ANON } from './config.js';
import { setTOK }   from './state.js';
import { $ }        from './utils.js';
import { loadData } from './api.js';
import { D }        from './state.js';
import { showPage } from './nav.js';

const SESSION_KEY = 'telnix_admin_session_v1';

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

async function hydrateAppState() {
  const payload = await loadData();
  if (payload) {
    D.orderedPolicies         = payload.orderedPolicies         || [];
    D.pendingPolicies         = payload.pendingPolicies         || [];
    D.policyGroups            = payload.policyGroups            || [];
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
    persistSession({ accessToken: d.access_token, email: d.user.email });
    showAuthenticatedUi(d.user.email);
    await hydrateAppState();

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
  const session = readPersistedSession();
  if (!session?.accessToken) return;

  setTOK(session.accessToken);
  showAuthenticatedUi(session.email);
  await hydrateAppState();

  const nextPage = (location.hash || '#dashboard').replace(/^#/, '');
  await showPage(nextPage);
}

export async function requireSession(redirectTo = './index.html') {
  const session = readPersistedSession();
  if (!session?.accessToken) {
    location.href = redirectTo;
    return null;
  }
  setTOK(session.accessToken);
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
