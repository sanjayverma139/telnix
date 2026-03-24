// nav.js — Sidebar navigation

import { $ } from './utils.js';

const PAGE_MODULES = {
  dashboard: {
    load: () => import('./dashboard.js'),
    init: mod => mod.initDashboard?.(),
    render: mod => mod.loadDash?.(),
  },
  logs: {
    load: () => import('./logs.js'),
    init: mod => mod.initLogs?.(),
    render: mod => mod.loadLogs?.(),
  },
  policies: {
    load: () => import('./policies.js'),
    init: mod => mod.initPolicies?.(),
    render: mod => mod.renderPols?.(),
  },
  categoryPolicies: {
    load: () => import('./categoryPolicies.js'),
    init: mod => mod.initCategoryPolicies?.(),
    render: mod => mod.renderCategoryPolicies?.(),
  },
  urllists: {
    load: () => import('./urllists.js'),
    init: mod => mod.initUrlLists?.(),
    render: mod => mod.renderUL?.(),
  },
  filetypes: {
    load: () => import('./filetypes.js'),
    init: mod => mod.initFileTypes?.(),
    render: mod => mod.renderFT?.(),
  },
  categories: {
    load: () => import('./categories.js'),
    init: mod => mod.initCategories?.(),
    render: mod => mod.renderCats?.(),
  },
  usergroups: {
    load: () => import('./usergroups.js'),
    init: mod => mod.initUserGroups?.(),
    render: mod => mod.loadUserGroups?.(),
  },
  users: {
    load: () => import('./users.js'),
    init: mod => mod.initUsers?.(),
    render: mod => mod.loadUsers?.(),
  },
  bypass: {
    load: () => import('./bypass.js'),
    init: mod => mod.initBypass?.(),
    render: mod => mod.loadBypass?.(),
  },
  urltester: {
    load: () => import('./tester.js'),
    init: mod => mod.initTester?.(),
    render: mod => mod.populateTesterGroups?.(),
  },
  noise: {
    load: () => import('./noise.js'),
    init: mod => mod.initNoise?.(),
    render: () => window._renderNoise?.(),
  },
  config: {
    load: () => import('./configPage.js'),
    init: mod => mod.initConfigPage?.(),
    render: mod => mod.loadConfigPage?.(),
  },
};

const pageState = new Map();

export async function ensurePageReady(id) {
  const cfg = PAGE_MODULES[id];
  if (!cfg) return null;

  let state = pageState.get(id);
  if (!state) {
    state = { modulePromise: cfg.load(), initialized: false };
    pageState.set(id, state);
  }

  const mod = await state.modulePromise;
  if (!state.initialized) {
    cfg.init?.(mod);
    state.initialized = true;
  }
  return mod;
}

export function initNav() {
  document.querySelectorAll('.nav').forEach(n => {
    n.addEventListener('click', () => { showPage(n.dataset.page); });
  });
}

export async function showPage(id) {
  document.querySelectorAll('.nav').forEach(n => n.classList.toggle('active', n.dataset.page === id));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  $('page-' + id)?.classList.add('active');

  const mod = await ensurePageReady(id);
  PAGE_MODULES[id]?.render?.(mod);
}
