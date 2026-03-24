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
