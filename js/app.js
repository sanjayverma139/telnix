// ─────────────────────────────────────────────────────────────────────────────
// app.js — Main entry point
// Imports and initialises all modules. This is the only script tag in index.html.
// ─────────────────────────────────────────────────────────────────────────────

import { initAuth }       from './auth.js';
import { initNav }        from './nav.js';
import { initDashboard }  from './dashboard.js';
import { initLogs }       from './logs.js';
import { initPolicies }   from './policies.js';
import { initUrlLists }   from './urllists.js';
import { initFileTypes }  from './filetypes.js';
import { initCategories } from './categories.js';
import { initUsers }      from './users.js';
import { initBypass }     from './bypass.js';
import { initTester }     from './tester.js';

// Close any modal when user clicks its background overlay
document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

// Toggle policy enabled button (toggle is a <button>, not a checkbox)
document.addEventListener('click', e => {
  if (e.target.id === 'pm-en' || e.target.closest('#pm-en')) {
    e.currentTarget; // handled inline via class toggle in policies.js
  }
});

// Boot all modules
initAuth();
initNav();
initDashboard();
initLogs();
initPolicies();
initUrlLists();
initFileTypes();
initCategories();
initUsers();
initBypass();
initTester();

console.log('[Telnix Admin] Loaded ✓');
