// state.js — Shared mutable application state

export const D = {
  orderedPolicies:          [],  // LIVE — extension reads
  pendingPolicies:          [],  // STAGED — admin panel only
  policyGroups:             [],
  urlLists:                 [],  // LIVE — extension reads
  pendingUrlLists:          [],  // STAGED — admin panel only
  customCategories:         [],  // LIVE — extension reads
  pendingCustomCategories:  [],  // STAGED — admin panel only
  policySettings:           { defaultAction: 'allow' },
  fileTypeLists:            [],
  bypassTokens:             [],
  noiseDomains:             [],
  categoryPolicies:         {},
  agentConfig:              {},
};

export let TOK = null;
export function setTOK(t) { TOK = t; }

export let ePolId=null, eListType=null, eListId=null, eCatId=null, eCCId=null;
export let curAct='block', curActiv='browse', curType='domain';

export function setEPolId(v)    { ePolId    = v; }
export function setEListType(v) { eListType = v; }
export function setEListId(v)   { eListId   = v; }
export function setECatId(v)    { eCatId    = v; }
export function setECCId(v)     { eCCId     = v; }
export function setCurAct(v)    { curAct    = v; }
export function setCurActiv(v)  { curActiv  = v; }
export function setCurType(v)   { curType   = v; }

export let allLogs = [];
export function setAllLogs(v) { allLogs = v; }
