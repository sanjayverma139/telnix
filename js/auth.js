// auth.js — Login / logout

import { appLogin, appLogout, loadData, validateAppSession } from './api.js';
import { setTOK }   from './state.js';
import { $ }        from './utils.js';
import { D }        from './state.js';
import { showPage } from './nav.js';

const SESSION_KEY = 'telnix_admin_session_v1';
const AUTH_NOTICE_KEY = 'telnix_admin_notice_v1';

function isAdminRole(role) {
  return ['admin', 'super_admin'].includes(String(role || '').trim().toLowerCase());
}

function persistAuthNotice(message) {
  sessionStorage.setItem(AUTH_NOTICE_KEY, message);
}

function consumeAuthNotice() {
  const message = sessionStorage.getItem(AUTH_NOTICE_KEY) || '';
  if (message) sessionStorage.removeItem(AUTH_NOTICE_KEY);
  return message;
}

function showAuthNotice() {
  const message = consumeAuthNotice();
  if (!message || !$('l-err')) return;
  $('l-err').textContent = message;
  $('l-err').style.display = 'block';
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
  if (!session?.sessionToken) return null;
  try {
    const next = await validateAppSession(session.sessionToken, 'admin');
    if (!next?.sessionToken) return null;
    persistSession(next);
    setTOK(next.sessionToken);
    return next;
  } catch {
    return null;
  }
}

async function ensureSession() {
  const session = readPersistedSession();
  if (!session?.sessionToken) return null;
  if (session.expiresAt && Number(session.expiresAt) <= Date.now()) {
    clearPersistedSession();
    setTOK(null);
    return null;
  }

  if (!session.role || !isAdminRole(session.role)) {
    clearPersistedSession();
    setTOK(null);
    return null;
  }

  setTOK(session.sessionToken);
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
  showAuthNotice();
  restoreIndexSession();
}

async function doLogin() {
  const email = $('l-email').value.trim(), pass = $('l-pass').value, err = $('l-err');
  err.style.display = 'none';
  $('l-btn').disabled = true; $('l-btn').textContent = 'Signing in...';
  try {
    const session = await appLogin(email, pass, 'admin');
    if (!session?.sessionToken || !isAdminRole(session.role)) {
      throw new Error('Admin access required for this panel.');
    }

    setTOK(session.sessionToken);
    persistSession(session);
    showAuthenticatedUi(session.email);
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
  } catch (error) {
    err.textContent = error?.message || 'Connection error.';
    err.style.display = 'block';
    $('l-btn').disabled = false; $('l-btn').textContent = 'Sign In';
  }
}

async function doLogout() {
  const session = readPersistedSession();
  await appLogout(session?.sessionToken).catch(() => {});
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
  if (!session?.sessionToken) return;
  if (!isAdminRole(session.role)) {
    setTOK(null);
    clearPersistedSession();
    persistAuthNotice('Your account is signed in, but it does not have admin access.');
    showAuthNotice();
    return;
  }

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
  if (!session?.sessionToken) {
    clearPersistedSession();
    location.href = redirectTo;
    return null;
  }
  if (!isAdminRole(session.role)) {
    setTOK(null);
    clearPersistedSession();
    persistAuthNotice('Your account is signed in, but it does not have admin access.');
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
