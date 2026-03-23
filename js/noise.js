// noise.js — Noise Filter page

import { D }        from './state.js';
import { saveData } from './api.js';
import { esc }      from './utils.js';

function $ (id) { return document.getElementById(id); }

function renderNoise() {
  const list   = $('noise-list');
  const count  = $('noise-count');
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
        <span style="font-size:13px;font-weight:600;color:#e2e8f0;font-family:monospace">${esc(d)}</span>
        <span style="font-size:11px;color:#475569;margin-left:10px">+ all subdomains</span>
      </div>
      <button class="btn btn-sm btn-danger" onclick="window._removeNoise(${i})">✕ Remove</button>
    </div>`).join('');
}

function showAlert(msg, ok) {
  const al = $('noise-alert');
  if (!al) return;
  al.className   = ok ? 'alert alert-s' : 'alert alert-e';
  al.textContent = msg;
  al.style.display = 'block';
  setTimeout(() => { al.style.display = 'none'; }, 4000);
}

export function initNoise() {
  // Render when page opens
  window._renderNoise = renderNoise;

  // Add domain
  window._addNoise = function() {
    const input = $('noise-input');
    if (!input) return;
    let val = input.value.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]; // strip path
    if (!val) return;
    if (!val.includes('.')) { showAlert('Enter a valid domain like example.com', false); return; }
    D.noiseDomains = D.noiseDomains || [];
    if (D.noiseDomains.includes(val)) { showAlert(`${val} is already in the list`, false); return; }
    D.noiseDomains.push(val);
    input.value = '';
    renderNoise();
    showAlert(`✓ ${val} added — click "Push to Users" to apply`, true);
  };

  // Remove domain
  window._removeNoise = function(idx) {
    D.noiseDomains = (D.noiseDomains || []).filter((_, i) => i !== idx);
    renderNoise();
  };

  // Push button
  $('btn-push-noise')?.addEventListener('click', async () => {
    const btn = $('btn-push-noise');
    btn.disabled = true;
    btn.textContent = 'Pushing...';
    const ok = await saveData();
    showAlert(
      ok ? '✓ Noise filter pushed — extension updates within 1 minute'
         : '✗ Failed to push — check connection',
      ok
    );
    btn.disabled = false;
    btn.textContent = '☁ Push to Users';
  });
}
