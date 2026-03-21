// tester.js — Enhanced URL Tester showing matching policies, URL lists, categories, threat score

import { CAT_MAP, THREAT_CATEGORIES } from './config.js';
import { D }                           from './state.js';
import { $, esc }                      from './utils.js';

export function testUrl() {
  const input = $('tu-url')?.value.trim();
  if (!input) return;

  let domain = '';
  try { domain = new URL(input.startsWith('http') ? input : 'https://' + input).hostname.replace(/^www\./, ''); }
  catch { domain = input.replace(/^www\./, ''); }

  const res = $('tu-res'); if (!res) return;
  res.innerHTML = '<div style="color:#64748b;font-size:12px;padding:10px 0">Analysing...</div>';

  // ── Auto-categorise ─────────────────────────────────────────────────────────
  let autoCat = 'unknown';
  for (const [cat, doms] of Object.entries(CAT_MAP)) {
    if (doms.some(d => domain === d || domain.endsWith('.' + d))) { autoCat = cat; break; }
  }
  for (const cc of (D.customCategories||[])) {
    if ((cc.domains||[]).some(d => domain === d || domain.endsWith('.' + d))) { autoCat = cc.name; break; }
  }

  // ── Find matching URL lists ──────────────────────────────────────────────────
  const matchedLists = (D.urlLists||[]).filter(l =>
    (l.domains||[]).some(d => domain === d || domain.endsWith('.' + d))
  );

  // ── Find ALL matching policies (not just first) ──────────────────────────────
  const matchedPolicies = [];
  let firstMatch = null;
  let polIdx = 0;

  for (const grp of (D.policyGroups||[])) {
    for (const pid of (grp.policyIds||[])) {
      const pol = (D.orderedPolicies||[]).find(p => p.id === pid);
      if (!pol || pol.enabled === false || pol.activity === 'download') continue;
      polIdx++;

      let hit = false;
      if (pol.type === 'domain') {
        hit = (pol.conditions?.domains||[]).some(d => domain === d || domain.endsWith('.' + d));
      } else if (pol.type === 'category') {
        hit = (pol.conditions?.categories||[]).includes(autoCat);
      } else if (pol.type === 'list') {
        const listDoms = (pol.conditions?.listIds||[]).flatMap(lid => {
          const l = (D.urlLists||[]).find(x => x.id === lid);
          return l?.domains || [];
        });
        hit = listDoms.some(d => domain === d || domain.endsWith('.' + d));
      } else if (pol.type === 'combo') {
        const domHit = (pol.conditions?.domains||[]).some(d => domain === d || domain.endsWith('.' + d));
        const catHit = (pol.conditions?.categories||[]).includes(autoCat);
        const listDoms = (pol.conditions?.listIds||[]).flatMap(lid => {
          const l = (D.urlLists||[]).find(x => x.id === lid);
          return l?.domains || [];
        });
        const listHit = listDoms.some(d => domain === d || domain.endsWith('.' + d));
        hit = domHit || catHit || listHit;
      }

      if (hit) {
        if (!firstMatch) firstMatch = { pol, grp, rank: polIdx };
        matchedPolicies.push({ pol, grp, rank: polIdx, isFirst: !firstMatch || firstMatch.pol.id === pol.id });
      }
    }
  }

  const def    = D.policySettings?.defaultAction || 'allow';
  const action = firstMatch ? firstMatch.pol.action : def;
  const AC     = { block:'#f87171', warn:'#fbbf24', allow:'#10b981' };
  const col    = AC[action] || '#94a3b8';

  // ── Build result HTML ────────────────────────────────────────────────────────
  let html = `
    <div style="background:${col}0d;border:1px solid ${col}33;border-radius:12px;padding:18px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <span style="font-size:28px">${action==='block'?'🚫':action==='warn'?'⚠️':'✅'}</span>
        <div>
          <div style="font-size:16px;font-weight:800;color:${col};text-transform:uppercase">${action}</div>
          <div style="font-size:12px;color:#94a3b8">${esc(domain)}</div>
        </div>
      </div>
      ${firstMatch
        ? `<div style="font-size:12px;color:#e2e8f0"><strong style="color:#a5b4fc">Policy #${firstMatch.rank}:</strong> ${esc(firstMatch.pol.name)} <span style="color:#475569">in</span> ${esc(firstMatch.grp.name)}</div>`
        : `<div style="font-size:12px;color:#64748b">No policy matched → default: <strong style="color:${col}">${def}</strong></div>`}
      <div style="font-size:11px;color:#475569;margin-top:6px">Auto-category: <strong style="color:#818cf8">${esc(autoCat)}</strong></div>
    </div>`;

  // URL Lists section
  if (matchedLists.length) {
    html += `<div style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">📋 Found in URL Lists</div>
      ${matchedLists.map(l => `
        <div style="background:#0d1424;border:1px solid rgba(96,165,250,.2);border-radius:8px;padding:10px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:600;color:#60a5fa">${esc(l.name)}</span>
          <span style="font-size:11px;color:#475569">${(l.domains||[]).length} domains</span>
        </div>`).join('')}
    </div>`;
  }

  // All matching policies
  if (matchedPolicies.length > 1) {
    html += `<div style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">🛡 All Matching Policies (evaluation order)</div>
      ${matchedPolicies.map((m, i) => {
        const ac = AC[m.pol.action]||'#94a3b8';
        return `<div style="background:#0d1424;border:1px solid ${i===0?ac+'44':'rgba(255,255,255,.06)'};border-radius:8px;padding:10px 14px;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:11px;font-weight:700;color:#475569;width:20px;flex-shrink:0">#${m.rank}</span>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700;color:#e2e8f0">${esc(m.pol.name)}</div>
              <div style="font-size:11px;color:#64748b">${esc(m.grp.name)} · ${m.pol.type}</div>
            </div>
            <span class="badge badge-${m.pol.action}">${m.pol.action}</span>
            ${i===0?'<span style="font-size:9px;font-weight:700;color:#10b981;background:rgba(16,185,129,.12);border-radius:4px;padding:2px 6px">HITS FIRST</span>':''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  res.innerHTML = html;
}

export function initTester() {
  $('btn-test-url')?.addEventListener('click', testUrl);
  $('tu-url')?.addEventListener('keydown', e => { if (e.key === 'Enter') testUrl(); });
}
