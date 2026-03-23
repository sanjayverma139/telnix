// app.js — Main entry point

import { initAuth }            from './auth.js';
import { initNav }             from './nav.js';
import { initDashboard }       from './dashboard.js';
import { initLogs }            from './logs.js';
import { initPolicies }        from './policies.js';
import { initUrlLists }        from './urllists.js';
import { initFileTypes }       from './filetypes.js';
import { initCategories }      from './categories.js';
import { initCategoryPolicies }from './categoryPolicies.js';
import { initUsers }           from './users.js';
import { initUserGroups }      from './usergroups.js';
import { initBypass }          from './bypass.js';
import { initTester, populateTesterGroups } from './tester.js';
import { initConfigPage }      from './configPage.js';

document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

initAuth();
initNav();
initDashboard();
initLogs();
initPolicies();
initUrlLists();
initFileTypes();
initCategories();
initCategoryPolicies();
initUsers();
initUserGroups();
initBypass();
initTester();
  populateTesterGroups(); // populate group dropdown with current groups
initConfigPage();

console.log('[Telnix Admin] Loaded ✓');

// ── Noise Filter ──────────────────────────────────────────────────────────────
function renderNoise() {
  const list = document.getElementById('noise-list');
  const count = document.getElementById('noise-count');
  const domains = D.noiseDomains || [];
  if (count) count.textContent = `(${domains.length} custom)`;
  if (!list) return;
  if (!domains.length) {
    list.innerHTML = '<div class="loading">No custom domains added yet. Add a domain above.</div>';
    return;
  }
  list.innerHTML = domains.map((d, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#060d1a;border:1px solid rgba(255,255,255,.06);border-radius:8px;margin-bottom:6px">
      <div>
        <span style="font-size:13px;font-weight:600;color:#e2e8f0;font-family:monospace">${d}</span>
        <span style="font-size:11px;color:#475569;margin-left:10px">+ all subdomains</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="window._removeNoise(${i})">✕ Remove</button>
    </div>`).join('');
}

window._renderNoise = renderNoise;

window._addNoise = function() {
  const input = document.getElementById('noise-input');
  if (!input) return;
  let val = input.value.trim().toLowerCase().replace(/^www\./, '').replace(/^https?:\/\//, '');
  if (!val) return;
  if (!val.includes('.')) { alert('Enter a valid domain like example.com'); return; }
  D.noiseDomains = D.noiseDomains || [];
  if (D.noiseDomains.includes(val)) {
    document.getElementById('noise-alert').className = 'alert alert-e';
    document.getElementById('noise-alert').textContent = `${val} is already in the list`;
    document.getElementById('noise-alert').style.display = 'block';
    return;
  }
  D.noiseDomains.push(val);
  input.value = '';
  document.getElementById('noise-alert').style.display = 'none';
  renderNoise();
};

window._removeNoise = function(idx) {
  D.noiseDomains = (D.noiseDomains || []).filter((_, i) => i !== idx);
  renderNoise();
};

document.getElementById('btn-push-noise')?.addEventListener('click', async () => {
  const btn = document.getElementById('btn-push-noise');
  const al  = document.getElementById('noise-alert');
  btn.disabled = true; btn.textContent = 'Pushing...';
  const ok = await saveData();
  al.className = ok ? 'alert alert-s' : 'alert alert-e';
  al.textContent = ok
    ? '✓ Noise filter pushed — extension will update within 1 minute'
    : '✗ Failed to push — check connection';
  al.style.display = 'block';
  btn.disabled = false; btn.textContent = '☁ Push to Users';
  setTimeout(() => al.style.display = 'none', 4000);
});
