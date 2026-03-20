// ─────────────────────────────────────────────────────────────────────────────
// tester.js — URL Tester page
// Tests a URL against the current in-memory policy D object.
// ─────────────────────────────────────────────────────────────────────────────

import { CAT_MAP }  from './config.js';
import { D }        from './state.js';
import { $, esc }   from './utils.js';

export function testUrl() {
  const input = $('tu-url')?.value.trim();
  if (!input) return;

  let domain = '';
  try {
    domain = new URL(input.startsWith('http') ? input : 'https://' + input).hostname.replace(/^www\./, '');
  } catch { domain = input; }

  // Auto-categorise
  let autoCat = 'unknown';
  for (const [cat, doms] of Object.entries(CAT_MAP)) {
    if (doms.some(d => domain === d || domain.endsWith('.' + d))) { autoCat = cat; break; }
  }
  // Also check custom categories
  for (const cc of D.customCategories) {
    if ((cc.domains || []).some(d => domain === d || domain.endsWith('.' + d))) { autoCat = cc.name; break; }
  }

  // Walk policies in order
  let matched = null;
  outer:
  for (const grp of D.policyGroups) {
    for (const pid of (grp.policyIds || [])) {
      const pol = D.orderedPolicies.find(p => p.id === pid);
      if (!pol || pol.enabled === false || (pol.activity || 'browse') === 'download') continue;
      let hit = false;
      if (pol.type === 'domain') {
        hit = (pol.conditions?.domains || []).some(d => domain === d || domain.endsWith('.' + d));
      } else if (pol.type === 'category') {
        hit = (pol.conditions?.categories || []).includes(autoCat);
      } else if (pol.type === 'list') {
        const listDoms = (pol.conditions?.listIds || []).flatMap(lid => {
          const l = D.urlLists.find(x => x.id === lid);
          return l?.domains || [];
        });
        hit = listDoms.some(d => domain === d || domain.endsWith('.' + d));
      }
      if (hit) { matched = { pol, grp }; break outer; }
    }
  }

  const def    = D.policySettings?.defaultAction || 'allow';
  const action = matched ? matched.pol.action : def;
  const AC     = { block: '#f87171', warn: '#fbbf24', allow: '#10b981' };
  const col    = AC[action] || '#94a3b8';

  $('tu-res').innerHTML = `
    <div style="background:${col}0d;border:1px solid ${col}33;border-radius:10px;padding:16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <span style="font-size:28px">${action === 'block' ? '🚫' : action === 'warn' ? '⚠️' : '✅'}</span>
        <div>
          <div style="font-size:16px;font-weight:800;color:${col};text-transform:uppercase">${action}</div>
          <div style="font-size:12px;color:#94a3b8">${esc(domain)}</div>
        </div>
      </div>
      ${matched
        ? `<div style="font-size:12px;color:#e2e8f0;margin-bottom:4px">
             <strong style="color:#a5b4fc">Policy:</strong> ${esc(matched.pol.name)}
             <span style="color:#475569"> in group </span>${esc(matched.grp.name)}
           </div>
           <div style="font-size:11px;color:#64748b">Type: ${esc(matched.pol.type || 'domain')} · Action: ${esc(matched.pol.action)}</div>`
        : `<div style="font-size:12px;color:#64748b">No policy matched — applying default: <strong style="color:${col}">${def}</strong></div>`}
      <div style="font-size:12px;color:#475569;margin-top:8px">
        Auto-detected category: <strong style="color:#818cf8">${esc(autoCat)}</strong>
      </div>
    </div>`;
}

export function initTester() {
  $('btn-test-url')?.addEventListener('click', testUrl);
  $('tu-url')?.addEventListener('keydown', e => { if (e.key === 'Enter') testUrl(); });
}
