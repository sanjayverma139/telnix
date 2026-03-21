// app.js — Main entry point

import { initAuth }            from './auth.js';
import { initNav }             from './nav.js';
import { initDashboard }       from './dashboard.js';
import { initLogs }            from './logs.js';
import { initPolicies }        from './policies.js';
import { initUrlLists }        from './urllists.js';
import { initFileTypes }       from './filetypes.js';
import { initCategories }      from './categories.js';
import { initCategoryPolicies }from './categoryPolicies.js';
import { initUsers }           from './users.js';
import { initBypass }          from './bypass.js';
import { initTester }          from './tester.js';
import { initConfigPage }      from './configPage.js';

// Close modals on background click
document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if(e.target===m) m.classList.remove('open'); });
});

initAuth();
initNav();
initDashboard();
initLogs();
initPolicies();
initUrlLists();
initFileTypes();
initCategories();
initCategoryPolicies();
initUsers();
initBypass();
initTester();
initConfigPage();

console.log('[Telnix Admin] Loaded ✓');
