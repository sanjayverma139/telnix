const NAV_ITEMS = [
  { label: 'Dashboard', href: './dashboard.html', key: 'dashboard', section: 'Overview' },
  { label: 'Activity Logs', href: './logs.html', key: 'logs' },
  { label: 'Policies', href: './index.html#policies', key: 'policies', section: 'Policy' },
  { label: 'Category Rules', href: './index.html#categoryPolicies', key: 'categoryPolicies' },
  { label: 'URL Lists', href: './index.html#urllists', key: 'urllists' },
  { label: 'File Type Lists', href: './index.html#filetypes', key: 'filetypes' },
  { label: 'Custom Categories', href: './index.html#categories', key: 'categories' },
  { label: 'User Groups', href: './index.html#usergroups', key: 'usergroups', section: 'Access' },
  { label: 'Users', href: './index.html#users', key: 'users' },
  { label: 'Bypass Codes', href: './index.html#bypass', key: 'bypass' },
  { label: 'URL Tester', href: './index.html#urltester', key: 'urltester', section: 'Tools' },
  { label: 'Noise Filter', href: './index.html#noise', key: 'noise' },
  { label: 'Configuration', href: './index.html#config', key: 'config' },
];

export function renderAppShell({ activeKey, content, extraMarkup = '' }) {
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
        <div class="sb-logo"><div class="logo-icon">T</div><div class="logo-name">TELNIX</div></div>
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
}
