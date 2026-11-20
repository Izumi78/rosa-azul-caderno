import { useSyncExternalStore } from "react";

import { DEFAULT_PREFS, prefsToRootStyle, sanitizePrefs, type Prefs } from "./prefs-model";

const PREFS_KEY = "rosa-azul:prefs:v1";
/** Ready-to-apply snapshot read by the boot script before the page paints. */
const ROOT_STYLE_KEY = "rosa-azul:prefs-root:v1";

/**
 * Runs in <head> before hydration so the chosen theme shows without a flash.
 * It only copies data-* attributes and CSS variables from the stored snapshot.
 */
export const PREFS_BOOT_SCRIPT = `(function(){try{var c=JSON.parse(localStorage.getItem(${JSON.stringify(
  ROOT_STYLE_KEY,
)})||"null");if(!c)return;var r=document.documentElement,k;if(c.dark)r.classList.add("dark");for(k in c.attrs)if(k.indexOf("data-")===0)r.setAttribute(k,String(c.attrs[k]));for(k in c.vars)if(k.indexOf("--")===0)r.style.setProperty(k,String(c.vars[k]));}catch(e){}})();`;

interface PrefsState {
  hydrated: boolean;
  prefs: Prefs;
}

const SERVER_STATE: PrefsState = { hydrated: false, prefs: DEFAULT_PREFS };
let state: PrefsState = SERVER_STATE;
const listeners = new Set<() => void>();

function applyToRoot(p: Prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const s = prefsToRootStyle(p);
  root.classList.toggle("dark", s.dark);
  for (const [k, v] of Object.entries(s.attrs)) root.setAttribute(k, v);
  for (const [k, v] of Object.entries(s.vars)) root.style.setProperty(k, v);
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
    window.localStorage.setItem(ROOT_STYLE_KEY, JSON.stringify(s));
  } catch {
    // storage blocked: the look still applies for this visit
  }
}

function set(p: Prefs) {
  state = { hydrated: true, prefs: p };
  applyToRoot(p);
  for (const l of listeners) l();
}

export function hydratePrefs() {
  if (state.hydrated || typeof window === "undefined") return;
  let raw: unknown = null;
  try {
    raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) ?? "null");
  } catch {
    raw = null;
  }
  set(sanitizePrefs(raw));
}

export function usePrefs(): PrefsState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER_STATE,
  );
}

export const prefsActions = {
  update(patch: Partial<Prefs>) {
    set(sanitizePrefs({ ...state.prefs, ...patch }));
  },
  reset() {
    set(DEFAULT_PREFS);
  },
};
