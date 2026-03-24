// app.js — Main entry point

import { initAuth } from './auth.js';

document.querySelectorAll('.modal-bg').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});

initAuth();

console.log('[Telnix Admin] Loaded ✓');
