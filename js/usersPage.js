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
          <div><label>Password *</label><input type="password" id="u-pass" placeholder="Set a password"></div>
        </div>
        <button class="btn btn-primary" id="btn-create-user">+ Create User</button>
        <p style="font-size:11px;color:#475569;margin-top:10px">User creation requires the <a href="https://supabase.com/dashboard" target="_blank" style="color:#818cf8">Supabase Dashboard</a> -> Authentication -> Users -> Invite user.</p>
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
