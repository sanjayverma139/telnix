const NAV_ITEMS = [
  { label: 'Dashboard', href: './dashboard.html', key: 'dashboard', section: 'Overview' },
  { label: 'Activity Logs', href: './logs.html', key: 'logs' },
  { label: 'Policies', href: './policies.html', key: 'policies', section: 'Policy' },
  { label: 'Category Rules', href: './category-policies.html', key: 'categoryPolicies' },
  { label: 'URL Lists', href: './url-lists.html', key: 'urllists' },
  { label: 'File Type Lists', href: './file-types.html', key: 'filetypes' },
  { label: 'Custom Categories', href: './categories.html', key: 'categories' },
  { label: 'User Groups', href: './user-groups.html', key: 'usergroups', section: 'Access' },
  { label: 'Users', href: './users.html', key: 'users' },
  { label: 'Bypass Codes', href: './bypass.html', key: 'bypass' },
  { label: 'URL Tester', href: './url-tester.html', key: 'urltester', section: 'Tools' },
  { label: 'Noise Filter', href: './noise.html', key: 'noise' },
  { label: 'Configuration', href: './config.html', key: 'config' },
];

const THEME_KEY = 'telnix_theme_v1';

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || 'dark';
  } catch {
    return 'dark';
  }
}

function applyTheme(theme) {
  document.body.classList.toggle('light-theme', theme === 'light');
  document.body.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(theme === 'light'));
  btn.setAttribute('title', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  const sun = btn.querySelector('.theme-icon-sun');
  const moon = btn.querySelector('.theme-icon-moon');
  if (sun) sun.style.opacity = theme === 'light' ? '1' : '.45';
  if (moon) moon.style.opacity = theme === 'dark' ? '1' : '.45';
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
    const sectionHtml = item.section && item.section !== currentSection
      ? `<div class="sb-section">${item.section}</div>`
      : '';
    currentSection = item.section || currentSection;

    return `${sectionHtml}<a class="nav ${item.key === activeKey ? 'active' : ''}" href="${item.href}">${item.label}</a>`;
  }).join('');

  document.body.innerHTML = `
    <div id="app" style="display:flex">
      <div class="sidebar">
        <div class="sb-logo">
          <div class="sb-logo-brand"><div class="logo-icon">T</div><div class="logo-name">TELNIX</div></div>
          <button class="theme-toggle" id="theme-toggle" type="button" aria-label="Toggle theme">
            <span class="theme-icon theme-icon-sun">☀</span>
            <span class="theme-icon theme-icon-moon">☾</span>
          </button>
        </div>
        ${navHtml}
        <div class="sb-footer">
          <div class="sb-user" id="adm-email-lbl"></div>
          <button class="btn btn-sm btn-danger" data-action="logout">Sign Out</button>
        </div>
      </div>
      <div class="main">${content}</div>
    </div>
    ${extraMarkup}
  `;

  initThemeToggle();
}
