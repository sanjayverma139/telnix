// ─────────────────────────────────────────────────────────────────────────────
// state.js — Shared mutable application state
// All modules import from here so they share the same objects.
// Never reassign D itself — mutate its properties (Object.assign, push, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/** The main policy data blob — mirrors what's stored in Supabase */
export const D = {
  orderedPolicies:  [],
  policyGroups:     [],
  urlLists:         [],
  customCategories: [],
  policySettings:   { defaultAction: 'allow' },
  fileTypeLists:    [],
  bypassTokens:     [],
};

/** Logged-in user's JWT token */
export let TOK = null;
export function setTOK(t) { TOK = t; }

/** Editing state for modals */
export let ePolId    = null;
export let eListType = null;
export let eListId   = null;
export let eCatId    = null;
export let curAct    = 'block';
export let curActiv  = 'browse';
export let curType   = 'domain';

export function setEPolId(v)    { ePolId    = v; }
export function setEListType(v) { eListType = v; }
export function setEListId(v)   { eListId   = v; }
export function setECatId(v)    { eCatId    = v; }
export function setCurAct(v)    { curAct    = v; }
export function setCurActiv(v)  { curActiv  = v; }
export function setCurType(v)   { curType   = v; }

/** All logs for export */
export let allLogs = [];
export function setAllLogs(v) { allLogs = v; }
