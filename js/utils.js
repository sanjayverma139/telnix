// ─────────────────────────────────────────────────────────────────────────────
// utils.js — Shared utility functions used across all modules
// ─────────────────────────────────────────────────────────────────────────────

/** Get element by id */
export const $ = id => document.getElementById(id);

/** HTML-escape a string to prevent XSS */
export function esc(s) {
  const d = document.createElement('div');
  d.textContent = s || '';
  return d.innerHTML;
}

/** Format a unix-ms timestamp as local time */
export const fmt  = ts => new Date(ts).toLocaleTimeString();
export const fmtF = ts => new Date(ts).toLocaleString();

const DOMAIN_RE = /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function normalizeDomainInput(value) {
  let next = String(value || '').trim().toLowerCase();
  if (!next) return '';
  next = next.replace(/\s+/g, '');
  next = next.replace(/^https?:\/\//, '');
  next = next.replace(/[/?#].*$/, '');
  if (!next.startsWith('*.')) next = next.replace(/^www\./, '');
  return next;
}

export function isValidDomain(value, { allowWildcard = true } = {}) {
  const normalized = normalizeDomainInput(value);
  if (!normalized) return false;
  if (!allowWildcard && normalized.startsWith('*.')) return false;
  return DOMAIN_RE.test(normalized);
}

export function parseDomainLines(text, options = {}) {
  const rawItems = String(text || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const domains = [];
  const invalid = [];

  for (const raw of rawItems) {
    const normalized = normalizeDomainInput(raw);
    if (!isValidDomain(normalized, options)) {
      invalid.push(raw);
      continue;
    }
    domains.push(normalized);
  }

  return {
    domains: [...new Set(domains)],
    invalid,
  };
}

/**
 * Show an alert element.
 * @param {string} id   - element id
 * @param {'success'|'error'} type
 * @param {string} msg
 */
export function showAlert(id, type, msg) {
  const el = $(id);
  if (!el) return;
  el.className = 'alert alert-' + (type === 'success' ? 's' : 'e');
  el.textContent = msg;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 3500);
}

/** Open a modal (adds .open class to modal-bg) */
export function openModal(id)  { $(id)?.classList.add('open'); }

/** Close a modal */
export function closeModal(id) { $(id)?.classList.remove('open'); }
