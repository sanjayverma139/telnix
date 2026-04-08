// configPage.js — Configuration page (Agent config stored in Supabase payload)

import { D }                from './state.js';
import { $, showAlert }     from './utils.js';
import { saveData }         from './api.js';

export function loadConfigPage() {
  const cfg = D.agentConfig || {};
  const el  = id => $(id);

  if (el('cfg-agent-id'))    el('cfg-agent-id').value    = cfg.agentId    || '';
  if (el('cfg-timezone'))    el('cfg-timezone').value    = cfg.timezone   || 'Asia/Kolkata';
  if (el('cfg-gsb-key'))     el('cfg-gsb-key').value     = cfg.gsbApiKey  || '';
  if (el('cfg-urlhaus-enabled')) el('cfg-urlhaus-enabled').checked = cfg.urlhausEnabled !== false;
  if (el('cfg-urlhaus-api-url')) el('cfg-urlhaus-api-url').value = cfg.urlhausApiUrl || 'https://urlhaus-api.abuse.ch/v1/url/';
  if (el('cfg-bypass-mode')) el('cfg-bypass-mode').value = cfg.bypassMode || 'local';
}

async function saveConfig() {
  const btn = $('btn-save-config');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  D.agentConfig = {
    agentId:        $('cfg-agent-id')?.value.trim()       || '',
    timezone:       $('cfg-timezone')?.value.trim()       || 'Asia/Kolkata',
    gsbApiKey:      $('cfg-gsb-key')?.value.trim()        || '',
    urlhausEnabled: $('cfg-urlhaus-enabled')?.checked !== false,
    urlhausApiUrl:  $('cfg-urlhaus-api-url')?.value.trim() || 'https://urlhaus-api.abuse.ch/v1/url/',
    bypassMode:     $('cfg-bypass-mode')?.value           || 'local',
  };

  const ok = await saveData();
  showAlert('cfg-alert', ok ? 'success' : 'error',
    ok ? '✓ Configuration saved and pushed to all agents' : 'Save failed — check Supabase permissions');
  if (btn) { btn.disabled = false; btn.textContent = '☁ Save & Push to All Agents'; }
}

export function initConfigPage() {
  $('btn-save-config')?.addEventListener('click', saveConfig);
}
