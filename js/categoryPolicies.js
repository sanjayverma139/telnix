// categoryPolicies.js — Predefined category policies (block/warn/allow per category)

import { ALL_CATS, CAT_COLORS } from './config.js';
import { D }                    from './state.js';
import { $, showAlert }         from './utils.js';
import { saveData }             from './api.js';

export function renderCategoryPolicies() {
  const grid = $('cat-policy-grid'); if (!grid) return;
  const q    = $('cat-policy-search')?.value.toLowerCase() || '';
  const cats = q ? ALL_CATS.filter(c => c.includes(q)) : ALL_CATS;
  const cur  = D.categoryPolicies || {};

  grid.innerHTML = cats.map(cat => {
    const color   = CAT_COLORS[cat] || '#64748b';
    const current = cur[cat] || 'allow';
    const opts    = ['allow','warn','block',''].map(v => `<option value="${v}"${current===v?' selected':''}>${v||'No rule'}</option>`).join('');
    return `<div style="background:${color}0a;border:1px solid ${color}22;border-radius:10px;padding:14px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <span style="font-size:12px;font-weight:700;color:${color}">${cat}</span>
      </div>
      <select data-cat="${cat}" onchange="window._setCatPolicy('${cat}',this.value)"
        style="width:100%;padding:6px 10px;background:#060d1a;border:1px solid ${color}44;border-radius:6px;color:#e2e8f0;font-size:12px">
        ${opts}
      </select>
    </div>`;
  }).join('');

  // Update count
  const countEl = $('cat-policy-count');
  if (countEl) {
    const active = Object.values(cur).filter(v => v && v !== '').length;
    countEl.textContent = `${active} active rule${active !== 1 ? 's' : ''}`;
  }
}

async function saveCategoryPolicies() {
  const btn = $('btn-save-cat-policies');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  const ok = await saveData();
  showAlert('cat-policy-alert', ok ? 'success' : 'error',
    ok ? '✓ Category rules saved and pushed to all users' : 'Save failed — check Supabase permissions');
  if (btn) { btn.disabled = false; btn.textContent = '☁ Save & Push to Users'; }
}

export function initCategoryPolicies() {
  $('cat-policy-search')?.addEventListener('input', renderCategoryPolicies);
  $('btn-save-cat-policies')?.addEventListener('click', saveCategoryPolicies);

  window._setCatPolicy = (cat, val) => {
    if (!D.categoryPolicies) D.categoryPolicies = {};
    D.categoryPolicies[cat] = val;
  };
}
