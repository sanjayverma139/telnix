// ─────────────────────────────────────────────────────────────────────────────
// users.js — Users page (reads from Supabase Auth + activity log counts)
// NOTE: Creating/deleting users requires the Supabase dashboard or an
// Edge Function. The service role key must never live in a public page.
// ─────────────────────────────────────────────────────────────────────────────

import { $, esc, fmtF, showAlert } from './utils.js';
import { createAuthUser, fetchAuthUsers, fetchUserLogMap } from './api.js';

const LOGS_FILTER_KEY = 'telnix_logs_filter_v1';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function loadUsers() {
  $('users-tb').innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';

  const [authUsers, logMap] = await Promise.all([
    fetchAuthUsers(),
    fetchUserLogMap(),
  ]);

  if (authUsers && authUsers.length) {
    $('users-tb').innerHTML = authUsers.map(u => `
      <tr>
        <td style="color:#a5b4fc">${esc(u.email)}</td>
        <td style="font-size:11px;color:${u.role === 'admin' ? '#fbbf24' : '#94a3b8'};font-weight:700;text-transform:uppercase">${esc(u.role || 'user')}</td>
        <td style="color:#64748b;font-size:11px">${u.last_sign_in_at ? fmtF(new Date(u.last_sign_in_at).getTime()) : 'Never'}</td>
        <td style="font-weight:700">${logMap[u.email]?.count || 0}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="window._filterByUser('${esc(u.email)}')">View Logs</button></td>
      </tr>`
    ).join('');
  } else {
    // Fallback: derive user list from activity logs
    const entries = Object.entries(logMap);
    $('users-tb').innerHTML = entries.length ? entries.map(([email, info]) => `
      <tr>
        <td style="color:#a5b4fc">${esc(email)}</td>
        <td style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase">USER</td>
        <td style="color:#64748b;font-size:11px">${info.last ? fmtF(info.last) : '—'}</td>
        <td style="font-weight:700">${info.count}</td>
        <td><button class="btn btn-sm btn-ghost" onclick="window._filterByUser('${esc(email)}')">View Logs</button></td>
      </tr>`
    ).join('') : '<tr><td colspan="5" class="loading">No users yet</td></tr>';
  }
}

export function initUsers() {
  $('btn-create-user')?.addEventListener('click', async () => {
    const email = ($('u-email')?.value || '').trim().toLowerCase();
    const password = ($('u-pass')?.value || '').trim();
    const role = ($('u-role')?.value || 'user').trim().toLowerCase();
    const button = $('btn-create-user');

    if (!EMAIL_RE.test(email)) {
      showAlert('u-al', 'error', 'Enter a valid email address.');
      return;
    }
    if (!['user', 'admin'].includes(role)) {
      showAlert('u-al', 'error', 'Choose a valid role.');
      return;
    }
    if (!password) {
      showAlert('u-al', 'error', 'Password is required for SQL-backed users.');
      return;
    }
    if (password.length < 8) {
      showAlert('u-al', 'error', 'Password must be at least 8 characters.');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Creating...';
    }

    try {
      const result = await createAuthUser({
        email,
        password: password || null,
        role,
      });
      if ($('u-email')) $('u-email').value = '';
      if ($('u-pass')) $('u-pass').value = '';
      if ($('u-role')) $('u-role').value = 'user';
      showAlert(
        'u-al',
        'success',
        result?.mode === 'updated'
          ? `User ${email} updated with ${role} role.`
          : `User ${email} created with ${role} role.`
      );
      await loadUsers();
    } catch (err) {
      showAlert('u-al', 'error', err.message || 'User creation failed.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = '+ Create User';
      }
    }
  });

  // Expose filter helper to inline onclick handlers
  window._filterByUser = (email) => {
    sessionStorage.setItem(LOGS_FILTER_KEY, JSON.stringify({
      type: 'userEmail',
      val: email,
      label: `User = ${email}`,
    }));

    if (document.getElementById('page-logs')) {
      import('./logs.js').then(m => m.filterByUser(email));
    } else {
      location.href = './logs.html';
    }
  };
}
