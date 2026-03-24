// tester.js — Enhanced URL Tester with user/group filter

import { CAT_MAP } from './config.js';
import { D }       from './state.js';
import { $, esc }  from './utils.js';

// ── Populate group dropdown ───────────────────────────────────────────────────
export function populateTesterGroups() {
  const sel = $('tu-group');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— All groups (no filter) —</option>'
    + (D.policyGroups||[]).map(g =>
        `<option value="${g.id}">${esc(g.name)}</option>`
      ).join('');
  sel.value = current;
}

// ── Condition summary helper ──────────────────────────────────────────────────
function getConditionSummary(pol) {
  if (pol.type === 'domain') {
    const doms = (pol.conditions?.domains||[]);
    return doms.length ? `Domains: ${doms.slice(0,3).map(d=>`<span style="background:rgba(99,102,241,.1);color:#a5b4fc;padding:1px 5px;border-radius:3px;font-size:10px">${esc(d)}</span>`).join(' ')+(doms.length>3?` <span style="color:#475569">+${doms.length-3} more</span>`:'')  }` : '';
  }
  if (pol.type === 'category') {
    const cats = (pol.conditions?.categories||[]);
    return cats.length ? `Categories: ${cats.map(c=>`<span style="background:rgba(52,211,153,.08);color:#34d399;padding:1px 5px;border-radius:3px;font-size:10px">${esc(c)}</span>`).join(' ')}` : '';
  }
  if (pol.type === 'list') {
    const lists = (pol.conditions?.listIds||[]).map(lid => {
      const l = (D.urlLists||[]).find(x => x.id === lid);
      return l ? `<span style="background:rgba(96,165,250,.08);color:#60a5fa;padding:1px 5px;border-radius:3px;font-size:10px">${esc(l.name)} (${(l.domains||[]).length} domains)</span>` : '';
    }).filter(Boolean);
    return lists.length ? `URL Lists: ${lists.join(' ')}` : '';
  }
  if (pol.type === 'combo') {
    const parts = [];
    const doms = (pol.conditions?.domains||[]);
    if (doms.length) parts.push(`Domains: ${doms.slice(0,2).map(d=>`<span style="background:rgba(99,102,241,.1);color:#a5b4fc;padding:1px 5px;border-radius:3px;font-size:10px">${esc(d)}</span>`).join(' ')}`);
    const cats = (pol.conditions?.categories||[]);
    if (cats.length) parts.push(`Categories: ${cats.map(c=>`<span style="background:rgba(52,211,153,.08);color:#34d399;padding:1px 5px;border-radius:3px;font-size:10px">${esc(c)}</span>`).join(' ')}`);
    const lists2 = (pol.conditions?.listIds||[]).map(lid=>{const l=(D.urlLists||[]).find(x=>x.id===lid);return l?`<span style="background:rgba(96,165,250,.08);color:#60a5fa;padding:1px 5px;border-radius:3px;font-size:10px">${esc(l.name)}</span>`:''}).filter(Boolean);
    if (lists2.length) parts.push(`Lists: ${lists2.join(' ')}`);
    return parts.join(' · ');
  }
  return '';
}


export function testUrl() {
  const isLight = document.body.classList.contains('light-theme');
  const textColor = isLight ? '#142033' : '#e2e8f0';
  const mutedColor = isLight ? '#64748b' : '#94a3b8';
  const softColor = isLight ? '#526173' : '#475569';
  const listCardBg = isLight ? '#ffffff' : '#0d1424';
  const listCardBorder = isLight ? 'rgba(15,23,42,.1)' : 'rgba(255,255,255,.06)';
  const input     = $('tu-url')?.value.trim();
  const userInput = ($('tu-user')?.value || '').trim().toLowerCase();
  const groupId   = $('tu-group')?.value || '';

  if (!input) return;

  let domain = '';
  try {
    domain = new URL(input.startsWith('http') ? input : 'https://' + input)
      .hostname.replace(/^www\./, '');
  } catch { domain = input.replace(/^www\./, ''); }

  const res = $('tu-res');
  if (!res) return;
  res.innerHTML = '<div style="color:#64748b;font-size:12px;padding:10px 0">Analysing...</div>';

  // ── Auto-categorise ──────────────────────────────────────────────────────────
  let autoCat = 'unknown';
  for (const [cat, doms] of Object.entries(CAT_MAP)) {
    if (doms.some(d => domain === d || domain.endsWith('.' + d))) { autoCat = cat; break; }
  }
  for (const cc of (D.customCategories || [])) {
    if ((cc.domains||[]).some(d => domain === d || domain.endsWith('.' + d))) {
      autoCat = cc.name; break;
    }
  }

  // ── Find matching URL lists ───────────────────────────────────────────────────
  const matchedLists = (D.urlLists||[]).filter(l =>
    (l.domains||[]).some(d => domain === d || domain.endsWith('.' + d))
  );

  // ── Resolve which user groups the entered user belongs to ────────────────────
  // User groups are stored in D.userGroups (if available) or inferred from policies
  // We check by looking at which group IDs appear in policy source.users matching the email
  const userGroupIds = new Set();
  if (userInput) {
    for (const pol of (D.orderedPolicies||[])) {
      if ((pol.source?.users||[]).some(u => u.toLowerCase() === userInput)) {
        (pol.source?.groups||[]).forEach(gid => userGroupIds.add(gid));
      }
    }
    // Also check D.userGroups if it exists
    for (const ug of (D.userGroups||[])) {
      if ((ug.members||[]).some(m => m.toLowerCase() === userInput)) {
        userGroupIds.add(ug.id);
      }
    }
  }

  // ── Evaluate policies ─────────────────────────────────────────────────────────
  // Filter logic:
  //   - If user entered: only show policies that have NO source filter (global)
  //     OR whose source.users includes this user
  //     OR whose source.groups overlap with this user's groups
  //   - If group selected: only show policies that have NO source filter
  //     OR whose source.groups includes the selected group
  //   - If both blank: show all (global evaluation)

  const results = [];  // { pol, grp, rank, hit, skippedReason }
  let polIdx = 0;
  let firstMatch = null;

  for (const grp of (D.policyGroups||[])) {
    for (const pid of (grp.policyIds||[])) {
      const pol = (D.orderedPolicies||[]).find(p => p.id === pid);
      if (!pol || pol.activity === 'download') continue;
      polIdx++;

      // ── Source filter check ──────────────────────────────────────────────────
      let sourceSkip = false;
      let sourceNote = '';
      const hasSrc = (pol.source?.users?.length > 0) || (pol.source?.groups?.length > 0);

      if (hasSrc && (userInput || groupId)) {
        const userMatch  = userInput && (pol.source?.users||[]).some(u => u.toLowerCase() === userInput);
        const groupMatch = groupId   && (pol.source?.groups||[]).includes(groupId);
        const ugMatch    = userInput && userGroupIds.size > 0
          && (pol.source?.groups||[]).some(gid => userGroupIds.has(gid));

        if (!userMatch && !groupMatch && !ugMatch) {
          sourceSkip = true;
          const srcUsers  = (pol.source?.users||[]).join(', ')  || '—';
          const srcGroups = (pol.source?.groups||[]).map(gid => {
            const g = (D.policyGroups||[]).find(x => x.id === gid);
            return g ? g.name : gid.slice(0,8)+'...';
          }).join(', ') || '—';
          sourceNote = `Applies to: users [${srcUsers}] · groups [${srcGroups}]`;
        }
      }

      // ── Disabled check ───────────────────────────────────────────────────────
      if (pol.enabled === false) continue;

      if (sourceSkip) continue;

      // ── Domain match check ───────────────────────────────────────────────────
      let hit = false;
      let matchReason = '';
      if (pol.type === 'domain') {
        const matched = (pol.conditions?.domains||[]).find(d => domain === d || domain.endsWith('.' + d));
        if (matched) { hit = true; matchReason = `domain "${matched}" matches`; }
      } else if (pol.type === 'category') {
        const matched = (pol.conditions?.categories||[]).find(c => c === autoCat);
        if (matched) { hit = true; matchReason = `category "${autoCat}" matches`; }
      } else if (pol.type === 'list') {
        for (const lid of (pol.conditions?.listIds||[])) {
          const l = (D.urlLists||[]).find(x => x.id === lid);
          const matched = (l?.domains||[]).find(d => domain === d || domain.endsWith('.' + d));
          if (matched) { hit = true; matchReason = `found in URL list "${l.name}" via "${matched}"`; break; }
        }
      } else if (pol.type === 'combo') {
        const dHit = (pol.conditions?.domains||[]).find(d => domain === d || domain.endsWith('.' + d));
        const cHit = (pol.conditions?.categories||[]).find(c => c === autoCat);
        const lHit = (pol.conditions?.listIds||[]).reduce((acc, lid) => {
          if (acc) return acc;
          const l = (D.urlLists||[]).find(x => x.id === lid);
          return (l?.domains||[]).find(d => domain === d || domain.endsWith('.' + d)) ? l.name : null;
        }, null);
        if (dHit) { hit = true; matchReason = `domain "${dHit}" matches`; }
        else if (cHit) { hit = true; matchReason = `category "${autoCat}" matches`; }
        else if (lHit) { hit = true; matchReason = `found in URL list "${lHit}"`; }
      } else if (pol.type === 'threat' || pol.type === 'reputation') {
        matchReason = 'threat/reputation — evaluated at runtime only';
      }

      if (hit && !firstMatch) firstMatch = { pol, grp, rank: polIdx };
      results.push({ pol, grp, rank: polIdx, hit, disabled: false, sourceSkip: false, sourceNote: '', matchReason });
    }
  }

  // ── Final action ──────────────────────────────────────────────────────────────
  const def    = D.policySettings?.defaultAction || 'allow';
  const action = firstMatch ? firstMatch.pol.action : def;
  const AC     = { block:'#f87171', warn:'#fbbf24', allow:'#10b981' };
  const col    = AC[action] || '#94a3b8';

  // ── Context banner ────────────────────────────────────────────────────────────
  let contextBanner = '';
  if (userInput || groupId) {
    const groupName = groupId ? (D.policyGroups||[]).find(g => g.id === groupId)?.name || groupId : null;
    const parts = [];
    if (userInput)  parts.push(`User: <strong style="color:#a5b4fc">${esc(userInput)}</strong>`);
    if (groupName)  parts.push(`Group: <strong style="color:#a5b4fc">${esc(groupName)}</strong>`);
    if (userInput && userGroupIds.size > 0) {
      const names = [...userGroupIds].map(gid => {
        const g = (D.policyGroups||[]).find(x => x.id === gid);
        return g ? g.name : gid.slice(0,8)+'...';
      });
      parts.push(`Member of: <strong style="color:#818cf8">${names.join(', ')}</strong>`);
    }
    contextBanner = `<div style="background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:8px;padding:10px 14px;font-size:12px;color:${mutedColor};margin-bottom:14px">
      🎯 Evaluating for — ${parts.join(' · ')}
    </div>`;
  }

  // ── Build result HTML ─────────────────────────────────────────────────────────
  let html = contextBanner + `
    <div style="background:${col}0d;border:1px solid ${col}33;border-radius:12px;padding:18px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
        <span style="font-size:28px">${action==='block'?'🚫':action==='warn'?'⚠️':'✅'}</span>
        <div>
          <div style="font-size:16px;font-weight:800;color:${col};text-transform:uppercase">${action}</div>
          <div style="font-size:12px;color:${mutedColor}">${esc(domain)}</div>
        </div>
      </div>
      ${firstMatch
        ? `<div style="font-size:12px;color:${textColor}">
             <strong style="color:#a5b4fc">Policy #${firstMatch.rank}:</strong> ${esc(firstMatch.pol.name)}
             <span style="color:${softColor}"> in </span>${esc(firstMatch.grp.name)}
           </div>
           <div style="font-size:11px;color:${mutedColor};margin-top:4px">✓ ${esc(results.find(r=>r.pol.id===firstMatch.pol.id)?.matchReason||'')}</div>`
        : `<div style="font-size:12px;color:${mutedColor}">No policy matched → default: <strong style="color:${col}">${def}</strong></div>`}
      <div style="font-size:11px;color:${softColor};margin-top:8px">Auto-category: <strong style="color:#818cf8">${esc(autoCat)}</strong></div>
    </div>`;

  // URL Lists
  if (matchedLists.length) {
    html += `<div style="margin-bottom:16px">
      <div style="font-size:10px;font-weight:700;color:${softColor};text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">📋 Found in URL Lists</div>
      ${matchedLists.map(l => `
        <div style="background:${listCardBg};border:1px solid rgba(96,165,250,.2);border-radius:10px;padding:10px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;box-shadow:${isLight ? '0 8px 18px rgba(15,23,42,.05)' : 'none'}">
          <span style="font-size:13px;font-weight:600;color:#60a5fa">${esc(l.name)}</span>
          <span style="font-size:11px;color:#475569">${(l.domains||[]).length} domains</span>
        </div>`).join('')}
    </div>`;
  }

  // All policies in evaluation order
  html += `<div>
    <div style="font-size:10px;font-weight:700;color:${softColor};text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px">🛡 All Policies (evaluation order)</div>
    ${results.map((r, i) => {
      const ac = AC[r.pol.action] || '#94a3b8';
      const isFirst = firstMatch && r.pol.id === firstMatch.pol.id;

      let borderColor = 'rgba(255,255,255,.06)';
      if (isFirst) borderColor = ac + '55';

      let statusBadge = '';
      if (isFirst)            statusBadge = '<span style="font-size:9px;font-weight:700;color:#10b981;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);border-radius:4px;padding:2px 6px">HITS FIRST</span>';
      else if (r.hit && !isFirst) statusBadge = '<span style="font-size:9px;font-weight:700;color:#6366f1;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:4px;padding:2px 6px">ALSO MATCHES</span>';
      else if (!r.hit)        statusBadge = `<span style="font-size:9px;font-weight:700;color:${softColor};background:${isLight?'rgba(15,23,42,.04)':'rgba(255,255,255,.03)'};border:1px solid ${isLight?'rgba(15,23,42,.08)':'rgba(255,255,255,.06)'};border-radius:4px;padding:2px 6px">NO MATCH</span>`;

      return `<div style="background:${listCardBg};border:1px solid ${isFirst ? borderColor : listCardBorder};border-radius:10px;padding:10px 14px;margin-bottom:6px;box-shadow:${isLight ? '0 8px 18px rgba(15,23,42,.05)' : 'none'}">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;font-weight:700;color:${softColor};width:22px;flex-shrink:0">#${r.rank}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:800;color:${textColor}">${esc(r.pol.name)}</div>
            <div style="font-size:11px;color:#64748b">${esc(r.grp.name)} · ${r.pol.type}
              ${r.pol.source?.users?.length||r.pol.source?.groups?.length
                ? `<span style="color:#f59e0b"> · 👤 source-filtered</span>` : ''}
            </div>
            <div style="font-size:11px;color:${softColor};margin-top:3px">${getConditionSummary(r.pol)}</div>
            ${r.hit && r.matchReason ? `<div style="font-size:11px;color:#4ade80;margin-top:2px">✓ ${esc(r.matchReason)}</div>` : ''}
            ${r.sourceSkip && r.sourceNote ? `<div style="font-size:11px;color:#f59e0b;margin-top:2px">⚠ ${esc(r.sourceNote)}</div>` : ''}
          </div>
          <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
            <span style="background:${ac}18;color:${ac};padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;text-transform:uppercase">${r.pol.action}</span>
            ${statusBadge}
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>`;

  res.innerHTML = html;
}

export function initTester() {
  $('btn-test-url')?.addEventListener('click', testUrl);
  $('tu-url')?.addEventListener('keydown', e => { if (e.key === 'Enter') testUrl(); });
}
