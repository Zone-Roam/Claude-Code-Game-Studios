// Storage port (ADR-0004 section 2): the only file that names localStorage.
// It does not swallow exceptions: a missing localStorage or a throwing call
// propagates to the caller (progress-save wraps every call).

/**
 * Wraps `win.localStorage` as the progress-save storage port.
 * The property is looked up on every call, so a WebView that throws on access
 * throws at the call, not at creation.
 * @param {Object} win the page's window object
 * @returns {{read: function(string): (string|null), write: function(string, string): void,
 *   remove: function(string): void}}
 * @example const storage = createLocalStoragePort(window);
 */
export function createLocalStoragePort(win) {
  function store() {
    const s = win.localStorage;
    if (!s) throw new Error('localStorage is not available');
    return s;
  }
  return {
    /** @param {string} key @returns {(string|null)} */
    read(key) {
      return store().getItem(key);
    },
    /** @param {string} key @param {string} value */
    write(key, value) {
      store().setItem(key, value);
    },
    /** @param {string} key */
    remove(key) {
      store().removeItem(key);
    },
  };
}
