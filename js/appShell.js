// ── Lucide-style SVG icons (inline, 18×18) ───────────────────────────────────
const ICONS = {
  dashboard:        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>`,
  logs:             `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
  policies:         `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  categoryPolicies: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" x2="7.01" y1="7" y2="7"/></svg>`,
  urllists:         `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  filetypes:        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  categories:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  usergroups:       `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  users:            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  bypass:           `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 2 5.5 5.5"/></svg>`,
  urltester:        `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  noise:            `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" x2="17" y1="9" y2="15"/><line x1="17" x2="23" y1="9" y2="15"/></svg>`,
  config:           `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`,
  logout:           `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  shield:           `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
};

const NAV_ITEMS = [
  { label: 'Dashboard',        href: './dashboard.html',         key: 'dashboard',        section: 'Overview', icon: 'dashboard' },
  { label: 'Activity Logs',    href: './logs.html',              key: 'logs',             section: '',         icon: 'logs' },
  { label: 'Policies',         href: './policies.html',          key: 'policies',         section: 'Policy',   icon: 'policies' },
  { label: 'Category Rules',   href: './category-policies.html', key: 'categoryPolicies', section: '',         icon: 'categoryPolicies' },
  { label: 'URL Lists',        href: './url-lists.html',         key: 'urllists',         section: '',         icon: 'urllists' },
  { label: 'File Type Lists',  href: './file-types.html',        key: 'filetypes',        section: '',         icon: 'filetypes' },
  { label: 'Custom Categories',href: './categories.html',        key: 'categories',       section: '',         icon: 'categories' },
  { label: 'User Groups',      href: './user-groups.html',       key: 'usergroups',       section: 'Access',   icon: 'usergroups' },
  { label: 'Users',            href: './users.html',             key: 'users',            section: '',         icon: 'users' },
  { label: 'Bypass Codes',     href: './bypass.html',            key: 'bypass',           section: '',         icon: 'bypass' },
  { label: 'URL Tester',       href: './url-tester.html',        key: 'urltester',        section: 'Tools',    icon: 'urltester' },
  { label: 'Noise Filter',     href: './noise.html',             key: 'noise',            section: '',         icon: 'noise' },
  { label: 'Configuration',    href: './config.html',            key: 'config',           section: '',         icon: 'config' },
];

const THEME_KEY = 'telnix_theme_v1';

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'dark'; }
  catch { return 'dark'; }
}

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  document.body.dataset.theme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(theme === 'light'));
  btn.setAttribute('title', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  btn.classList.toggle('is-light', theme === 'light');
  const sun  = btn.querySelector('.theme-icon-sun');
  const moon = btn.querySelector('.theme-icon-moon');
  if (sun)  sun.style.opacity  = theme === 'light' ? '1' : '.45';
  if (moon) moon.style.opacity = theme === 'dark'  ? '1' : '.45';
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn || btn.dataset.bound === 'true') return;
  btn.dataset.bound = 'true';
  btn.addEventListener('click', () => {
    const next = document.body.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
  });
  applyTheme(getStoredTheme());
}

export function renderAppShell({ activeKey, content, extraMarkup = '' }) {
  applyTheme(getStoredTheme());

  let currentSection = '';
  const navHtml = NAV_ITEMS.map(item => {
    let sectionHtml = '';
    if (item.section && item.section !== currentSection) {
      currentSection = item.section;
      sectionHtml = `<div class="sb-section">${item.section}</div>`;
    }
    const isActive = item.key === activeKey;
    const icon = ICONS[item.icon] || '';
    return `${sectionHtml}
      <a class="nav${isActive ? ' active' : ''}" href="${item.href}" data-key="${item.key}">
        <span class="nav-icon">${icon}</span>
        <span class="nav-label">${item.label}</span>
      </a>`;
  }).join('');

  document.body.innerHTML = `
    <div id="app" style="display:flex">
      <div class="sidebar">
        <div class="sb-logo">
          <div class="sb-logo-brand">
            <div class="logo-icon">${ICONS.shield}</div>
            <div>
              <div class="logo-name">TELNIX</div>
              <div class="logo-sub">Admin Panel</div>
            </div>
          </div>
          <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle theme">
            <span class="theme-toggle-thumb" aria-hidden="true"></span>
            <span class="theme-icon theme-icon-sun">☀</span>
            <span class="theme-icon theme-icon-moon">☾</span>
          </button>
        </div>

        <div class="sb-nav-scroll">
          ${navHtml}
        </div>

        <div class="sb-footer">
          <div class="sb-user-row">
            <div class="sb-avatar" id="adm-avatar-lbl">AD</div>
            <div class="sb-user-info">
              <div class="sb-user" id="adm-email-lbl">Loading…</div>
              <div class="sb-role">Super Admin</div>
            </div>
          </div>
          <button class="btn-signout" data-action="logout">
            ${ICONS.logout}
            Sign Out
          </button>
        </div>
      </div>

      <div class="main">${content}</div>
    </div>
    ${extraMarkup}
  `;

  initThemeToggle();

  // Auto-derive avatar initials from email once auth sets it
  const emailObserver = new MutationObserver(() => {
    const emailEl  = document.getElementById('adm-email-lbl');
    const avatarEl = document.getElementById('adm-avatar-lbl');
    if (emailEl && avatarEl && emailEl.textContent && emailEl.textContent !== 'Loading…') {
      const parts = emailEl.textContent.trim().split('@')[0].split(/[.\-_]/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : emailEl.textContent.slice(0, 2).toUpperCase();
      avatarEl.textContent = initials;
      emailObserver.disconnect();
    }
  });
  const emailEl = document.getElementById('adm-email-lbl');
  if (emailEl) emailObserver.observe(emailEl, { childList: true, characterData: true, subtree: true });
}
