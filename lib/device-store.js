// Small things kept on this phone between opens: who is signed in and the
// last desk, so the app opens straight onto her patients and then
// refreshes. Private windows and full storage just skip it.
export function readStored(key) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writeStored(key, value) {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app still works, it just loads fresh.
  }
}

export function clearStored(prefix) {
  try {
    Object.keys(window.localStorage).filter((key) => key.startsWith(prefix)).forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Nothing to clear.
  }
}
