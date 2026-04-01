import { bootstrapProtectedPage } from './auth.js';
import { renderAppShell } from './appShell.js';
import { initUsers, loadUsers } from './users.js';

renderAppShell({
  activeKey: 'users',
  content: `
    <div class="page active" id="page-users">
      <div class="page-header"><div><div class="page-title">Users</div><div class="page-sub">Manage who can log into the extension</div></div></div>
      <div class="card"><div class="card-title">Create New User</div>
        <div class="alert" id="u-al"></div>
        <div class="grid2">
          <div><label>Email *</label><input type="email" id="u-email" placeholder="user@company.com"></div>
          <div><label>Role *</label><select id="u-role"><option value="user">User</option><option value="admin">Admin</option></select></div>
        </div>
        <div style="margin-top:12px"><label>Password (optional)</label><input type="password" id="u-pass" placeholder="Leave blank to send invite email"></div>
        <button class="btn btn-primary" id="btn-create-user">+ Create / Invite User</button>
        <p style="font-size:11px;color:#475569;margin-top:10px">This page calls the `admin-users` Supabase Edge Function. Leave password blank to send an invite email, or set one to create the account immediately.</p>
      </div>
      <div class="card"><div class="card-title">All Users</div>
        <div class="tbl-wrap"><table><thead><tr><th>Email</th><th>Last Sign In</th><th>Total Logs</th><th></th></tr></thead>
        <tbody id="users-tb"><tr><td colspan="4" class="loading">Loading...</td></tr></tbody></table></div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initUsers();
loadUsers();
