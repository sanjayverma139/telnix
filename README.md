# Telnix

Telnix is a browser-based secure web gateway project made of two connected parts:

1. A static admin panel hosted from GitHub Pages.
2. A Manifest V3 Chrome extension that enforces policies inside the browser.

The admin panel stores a single organization policy payload in Supabase. The extension signs in as an end user, syncs the payload into Chrome storage, and applies browse, download, upload, bypass, and logging rules locally.

## Workspace Layout

This workspace currently uses two sibling folders:

- Admin panel and Supabase assets: `C:\Users\DELL\Desktop\Github\telnix`
- Chrome extension: `C:\Users\DELL\Desktop\Github\Telnix_v2_supabase\telnix_v2`

This README lives in the admin panel folder, but it documents the full platform.

## What Is Implemented

### Admin panel

The admin panel is a plain HTML/CSS/JavaScript application. There is no npm build step.

Current pages include:

- Dashboard
- Activity Logs
- Policies
- Category Rules
- URL Lists
- File Type Lists
- Custom Categories
- User Groups
- Users
- Bypass Codes
- URL Tester
- Noise Filter
- Configuration

Key frontend modules:

- Shell and navigation: [js/appShell.js](C:/Users/DELL/Desktop/Github/telnix/js/appShell.js), [js/nav.js](C:/Users/DELL/Desktop/Github/telnix/js/nav.js)
- Auth/session bootstrap: [js/auth.js](C:/Users/DELL/Desktop/Github/telnix/js/auth.js)
- Supabase RPC/data access: [js/api.js](C:/Users/DELL/Desktop/Github/telnix/js/api.js)
- Policy UI: [js/policies.js](C:/Users/DELL/Desktop/Github/telnix/js/policies.js), [js/policiesPage.js](C:/Users/DELL/Desktop/Github/telnix/js/policiesPage.js)
- Logs UI: [js/logs.js](C:/Users/DELL/Desktop/Github/telnix/js/logs.js), [js/logsPage.js](C:/Users/DELL/Desktop/Github/telnix/js/logsPage.js)
- User management UI: [js/users.js](C:/Users/DELL/Desktop/Github/telnix/js/users.js), [js/usersPage.js](C:/Users/DELL/Desktop/Github/telnix/js/usersPage.js)
- Config UI: [js/configPage.js](C:/Users/DELL/Desktop/Github/telnix/js/configPage.js), [js/configStandalonePage.js](C:/Users/DELL/Desktop/Github/telnix/js/configStandalonePage.js)

### Extension

The extension is a Chrome MV3 extension with:

- Background service worker
- Main-world injected fetch/XHR hooks
- Content script enforcement helpers
- Popup
- Login page
- Options page
- Blocked page
- DevTools network analysis panel

Key extension files:

- Manifest: [manifest.json](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/manifest.json)
- Background entry: [background/service_worker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/service_worker.js)
- Policy engine: [background/modules/policy_engine.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/policy_engine.js)
- Supabase sync: [background/modules/supabase_sync.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/supabase_sync.js)
- Activity logging: [background/modules/activity_logger.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/activity_logger.js)
- Download enforcement: [background/modules/download_blocker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/download_blocker.js)
- Upload fallback DNR: [background/modules/upload_blocker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/upload_blocker.js)
- Reputation lookup: [background/modules/threat_reputation.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/threat_reputation.js)
- Page-world request hooks: [content/injected.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/content/injected.js)
- Content script bridge: [content/content.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/content/content.js)
- Extension login: [login/login.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/login/login.js)
- Popup: [popup/popup.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/popup/popup.js)
- DevTools coordinator: [devtools/panel.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/devtools/panel.js)

## High-Level Architecture

### Admin flow

1. Admin signs in through a custom SQL-backed app login.
2. The panel loads the latest organization payload from Supabase.
3. Changes are kept in shared in-memory state and saved back through RPC.
4. The saved payload becomes the source of truth for extension sync.

### Extension flow

1. End user signs in through the extension login page.
2. The extension stores a local session in `chrome.storage.local`.
3. Background sync pulls the latest Supabase payload for the org.
4. Policies are filtered to the signed-in user and their user groups.
5. Filtered rules are written into Chrome storage.
6. The policy engine, content script, request hooks, and download/upload modules enforce those rules locally.
7. Activity logs are written locally first, then pushed to Supabase on a timer.

## Supabase Model

### Tables used by the current code

- `public.policies`
  - Stores the current organization payload in `payload`
  - The admin panel reads and writes this through RPC
  - The extension syncs from the latest row

- `public.activity_logs`
  - Stores synced browser activity logs
  - Used by Dashboard, Activity Logs, and user activity counts

- `public.user_groups`
  - Used by extension sync to determine group-scoped policies for the signed-in user

- `public.telnix_app_users`
  - SQL-backed user registry for both admin and extension users

- `public.telnix_app_sessions`
  - SQL-backed app sessions for the admin panel and extension login flow

### Required SQL RPCs

The current admin panel and extension depend on these RPCs:

- `telnix_app_login`
- `telnix_app_validate_session`
- `telnix_app_logout`
- `telnix_admin_list_users`
- `telnix_admin_upsert_user`
- `telnix_admin_get_payload`
- `telnix_admin_save_payload`
- `telnix_admin_fetch_logs`

The SQL file that creates the custom auth/session layer and these RPCs is:

- [supabase/sql/telnix_app_users.sql](C:/Users/DELL/Desktop/Github/telnix/supabase/sql/telnix_app_users.sql)

There is also an Edge Function in:

- [supabase/functions/admin-users/index.ts](C:/Users/DELL/Desktop/Github/telnix/supabase/functions/admin-users/index.ts)

At the moment, the admin panel code is using the SQL RPC path, not the Edge Function path.

## Current Authentication Model

### Admin panel

- Uses `telnix_app_login(..., p_require_role := 'admin')`
- Stores an admin session token in `localStorage`
- Validates and refreshes the session via `telnix_app_validate_session`
- Blocks non-admin users from protected pages

### Extension

- Uses `telnix_app_login(..., p_require_role := 'user')`
- Stores the user session in `chrome.storage.local` as `telnix_session`
- Sync scope is derived from:
  - signed-in email
  - matching entries in `public.user_groups`

### Role behavior

- `admin` users can access the admin panel
- `user` users can sign in to the extension
- The current SQL check prevents admin-only accounts from being used as normal extension users

## Policy and Payload Shape

The admin panel builds a single payload object in memory through [js/state.js](C:/Users/DELL/Desktop/Github/telnix/js/state.js), including:

- `orderedPolicies`
- `pendingPolicies`
- `policyGroups`
- `urlLists`
- `customCategories`
- `policySettings`
- `fileTypeLists`
- `bypassTokens`
- `noiseDomains`
- `categoryPolicies`
- `agentConfig`

The extension does not consume every field directly. The main runtime fields currently used are:

- `orderedPolicies`
- `policyGroups`
- `urlLists`
- `customCategories`
- `policySettings`
- `fileTypeLists`
- `bypassTokens`
- `agentConfig`

## Enforcement Features

### Browse enforcement

Browse enforcement is handled primarily by:

- [background/modules/policy_engine.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/policy_engine.js)
- [background/modules/tab_enforcer.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/tab_enforcer.js)
- [background/modules/pre_request_blocker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/pre_request_blocker.js)

Supported concepts in the current code:

- ordered first-match policy evaluation
- policy groups
- user-scoped and group-scoped policies
- schedule-based policies
- category policies
- threat score and reputation policy types
- bypass session awareness

### Download enforcement

Download enforcement is split across:

- [background/modules/download_blocker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/download_blocker.js)
- [background/modules/download_policy_matcher.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/download_policy_matcher.js)

Current behavior includes:

- dynamic download policy matching against ordered policies
- fallback standalone download policy
- notifications for warn/block outcomes
- filename enrichment after Chrome resolves `Content-Disposition`
- bypass session support

### Upload enforcement

Upload control is handled by a combination of:

- [content/injected.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/content/injected.js)
- [content/content.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/content/content.js)
- [background/modules/upload_blocker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/upload_blocker.js)

The current code attempts to intercept:

- `fetch`
- `XMLHttpRequest`
- form submissions
- file-input selections
- some chunked or upload-like traffic patterns

There is also a DNR fallback for block-all upload rules where the request pattern can be represented statically.

### Bypass codes

Bypass codes are managed in:

- Admin: [js/bypass.js](C:/Users/DELL/Desktop/Github/telnix/js/bypass.js)
- Extension: [background/modules/bypass_manager.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/bypass_manager.js)

Current bypass capabilities:

- timed codes
- domain-scoped codes
- activity-scoped codes
- user-restricted codes
- discard/revoke from admin panel
- local bypass sessions stored in `chrome.storage.session`
- Supabase-backed token sync through payload refresh

## Logging and Observability

### Activity logs

The extension writes local activity logs through [background/modules/activity_logger.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/activity_logger.js) and pushes them to Supabase through [background/modules/supabase_sync.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/supabase_sync.js).

The current log model includes:

- browse/download/upload activity
- allow/warn/block action
- reason
- policy and group names
- category
- threat score and reputation flags
- upload and download filenames
- XHR metadata
- local ID used for later enrichment

### DevTools diagnostics

The extension also ships a DevTools panel under [devtools/](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/devtools), with views for:

- overview
- waterfall
- timeline
- root cause
- security
- privacy
- proxy
- AI summary

This uses a HAR listener in DevTools context, plus page timing data captured by the content script.

## Threat Intelligence Status

This part is important to document accurately.

### Fully wired today

The current runtime reputation module in [background/modules/threat_reputation.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/threat_reputation.js) actively uses:

- offline bundled malicious-domain patterns
- Google Safe Browsing, when `gsbApiKey` is configured

### Present in config/sync plumbing but not fully consumed in the current runtime file

The admin and sync layers already carry:

- `urlhausEnabled`
- `urlhausAuthKey`
- `urlhausApiUrl`

These fields are present in:

- [js/configPage.js](C:/Users/DELL/Desktop/Github/telnix/js/configPage.js)
- [background/modules/supabase_sync.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/supabase_sync.js)

But the current checked-in `threat_reputation.js` in this workspace does not yet execute a live URLhaus lookup. In other words:

- the config path for URLhaus exists
- the current runtime reputation engine is still effectively offline DB + GSB

The README reflects the code as it exists now, not the intended future behavior.

## Sync Timings in the Current Code

- Policy pull from Supabase: every 60 seconds
- Log push to Supabase: every 20 seconds
- Startup sync: immediate on service worker start

These values are defined in [background/modules/supabase_sync.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/supabase_sync.js).

## Configuration Constants

The current project is configured by hard-coded constants, not environment injection in the browser app.

Important files with Supabase constants:

- [js/config.js](C:/Users/DELL/Desktop/Github/telnix/js/config.js)
- [login/login.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/login/login.js)
- [background/modules/supabase_sync.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/supabase_sync.js)

These currently contain:

- Supabase project URL
- anon key
- org ID

If you move to a different Supabase project, those files must be updated together.

## Local Setup

### 1. Apply the SQL in Supabase

Run:

- [supabase/sql/telnix_app_users.sql](C:/Users/DELL/Desktop/Github/telnix/supabase/sql/telnix_app_users.sql)

This creates:

- `telnix_app_users`
- `telnix_app_sessions`
- login/session/admin RPCs

### 2. Make sure your core tables already exist

The code expects these existing tables:

- `public.policies`
- `public.activity_logs`
- `public.user_groups`

### 3. Create at least one admin user

Insert a row into `public.telnix_app_users` with:

- your `org_id`
- lowercase email
- bcrypt/crypt password hash
- role = `admin`

The SQL file uses `extensions.crypt(..., extensions.gen_salt('bf', 10))` for hashing.

### 4. Host the admin panel

This admin panel is static, so it can run directly from GitHub Pages or any static host.

There is no npm step in the current implementation.

### 5. Load the Chrome extension

In Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click `Load unpacked`
4. Select `C:\Users\DELL\Desktop\Github\Telnix_v2_supabase\telnix_v2`

## How the Two Parts Connect

### Admin to Supabase

- The admin panel saves one full payload object to `public.policies.payload`
- The payload includes policy definitions, groups, URL lists, categories, bypass tokens, and agent config

### Supabase to extension

- The extension fetches the latest `policies` row
- It filters policies for the current signed-in user
- It copies the filtered result into Chrome storage

### Extension back to Supabase

- Activity logs are collected locally
- Unsynced entries are pushed to `public.activity_logs`

## Known Implementation Notes

- The checked-in extension folder also contains a nested duplicate folder at `telnix_v2/telnix_v2`. The primary runtime folder is the top-level `telnix_v2`.
- The admin panel currently uses SQL RPCs for user creation and auth. The bundled Edge Function is not the active path.
- The codebase is intentionally buildless. Most changes are direct edits to static HTML, CSS, JS, extension scripts, and SQL.
- Supabase anon credentials are embedded client-side in the current implementation. That matches the current code, but if you harden the project later, this is an area to revisit.

## Recommended Starting Points for New Contributors

If you are new to this codebase, start here:

1. Admin shell and auth:
   - [js/appShell.js](C:/Users/DELL/Desktop/Github/telnix/js/appShell.js)
   - [js/auth.js](C:/Users/DELL/Desktop/Github/telnix/js/auth.js)
   - [js/api.js](C:/Users/DELL/Desktop/Github/telnix/js/api.js)
2. Extension runtime:
   - [background/service_worker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/service_worker.js)
   - [background/modules/policy_engine.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/policy_engine.js)
   - [background/modules/supabase_sync.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/supabase_sync.js)
3. Upload/download enforcement:
   - [content/injected.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/content/injected.js)
   - [background/modules/download_blocker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/download_blocker.js)
   - [background/modules/upload_blocker.js](C:/Users/DELL/Desktop/Github/Telnix_v2_supabase/telnix_v2/background/modules/upload_blocker.js)

## Summary

Telnix is currently a static admin panel plus MV3 extension architecture backed by Supabase. The code already supports:

- SQL-backed admin and user sign-in
- payload-based policy management
- user/group scoped sync
- browse/download/upload control
- bypass code lifecycle
- log ingestion and dashboarding
- DevTools diagnostics

The most important thing to know is that the project is operationally centered on one Supabase payload row plus a local-enforcement Chrome extension, and the README above is written to match the current checked-in code rather than an idealized future design.
