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
