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
        <div style="margin-top:12px"><label>Password *</label><input type="password" id="u-pass" placeholder="Set a password"></div>
        <button class="btn btn-primary" id="btn-create-user">+ Create User</button>
        <p style="font-size:11px;color:#475569;margin-top:10px">Users on this page are stored in the SQL user registry. Select <strong>Admin</strong> to create an admin-only account for the admin panel, or <strong>User</strong> for extension sign-in.</p>
      </div>
      <div class="card"><div class="card-title">All Users</div>
        <div class="tbl-wrap"><table><thead><tr><th>Email</th><th>Role</th><th>Last Sign In</th><th>Total Logs</th><th></th></tr></thead>
        <tbody id="users-tb"><tr><td colspan="5" class="loading">Loading...</td></tr></tbody></table></div>
      </div>
    </div>
  `,
});

await bootstrapProtectedPage();
initUsers();
loadUsers();
