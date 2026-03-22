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
import { initUserGroups }      from './usergroups.js';
import { initBypass }          from './bypass.js';
import { initTester, populateTesterGroups } from './tester.js';
import { initConfigPage }      from './configPage.js';

document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
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
initUserGroups();
initBypass();
initTester();
  populateTesterGroups(); // populate group dropdown with current groups
initConfigPage();

console.log('[Telnix Admin] Loaded ✓');
