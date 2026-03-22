// auth.js — Login / logout

import { SB, ANON } from './config.js';
import { setTOK }   from './state.js';
import { $ }        from './utils.js';
import { loadData } from './api.js';
import { D }        from './state.js';
import { showPage } from './nav.js';
import { loadDash } from './dashboard.js';

export function initAuth() {
  $('l-btn').addEventListener('click', doLogin);
  $('l-email').addEventListener('keydown', e => { if (e.key === 'Enter') $('l-pass').focus(); });
  $('l-pass').addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });
  $('logout-btn').addEventListener('click', doLogout);
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
    $('adm-email-lbl').textContent = d.user.email;
    $('login-screen').style.display = 'none';
    $('app').style.display = 'flex';

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

    if (!D.policyGroups.find(g => g.name === 'Default'))
      D.policyGroups.push({ id: 'grp_def_' + Date.now(), name: 'Default', _isDefault: true, policyIds: [] });

    showPage('dashboard');
    loadDash();
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
  $('app').style.display = 'none';
  $('login-screen').style.display = 'flex';
}
