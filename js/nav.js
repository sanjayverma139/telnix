// nav.js — Sidebar navigation

import { $ } from './utils.js';

const PAGE_LOADERS = {
  logs:            () => import('./logs.js').then(m => m.loadLogs()),
  users:           () => import('./users.js').then(m => m.loadUsers()),
  bypass:          () => import('./bypass.js').then(m => m.loadBypass()),
  urllists:        () => import('./urllists.js').then(m => m.renderUL()),
  filetypes:       () => import('./filetypes.js').then(m => m.renderFT()),
  categories:      () => import('./categories.js').then(m => m.renderCats()),
  categoryPolicies:() => import('./categoryPolicies.js').then(m => m.renderCategoryPolicies()),
  policies:        () => import('./policies.js').then(m => m.renderPols()),
  config:          () => import('./configPage.js').then(m => m.loadConfigPage()),
};

export function initNav() {
  document.querySelectorAll('.nav').forEach(n => {
    n.addEventListener('click', () => showPage(n.dataset.page));
  });
}

export function showPage(id) {
  document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.page === id));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-' + id)?.classList.add('active');
  PAGE_LOADERS[id]?.();
}
