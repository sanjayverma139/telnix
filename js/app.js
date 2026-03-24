// app.js — Main entry point

import { initAuth } from './auth.js';
import { initNav }  from './nav.js';

document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

initAuth();
initNav();

console.log('[Telnix Admin] Loaded ✓');
