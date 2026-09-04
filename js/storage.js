/* Storage can be unavailable in private or embedded browsers. Keep a session fallback. */
window.FloraStorage = (function () {
  const memory = {};
  let persistent = true;
  const prefix = "floramind:v2:";
  return {
    get: function (key, fallback) {
      try {
        const raw = localStorage.getItem(prefix + key);
        return raw ? JSON.parse(raw) : (memory[key] || fallback);
      } catch (error) { persistent = false; return memory[key] || fallback; }
    },
    set: function (key, value) {
      memory[key] = value;
      try { localStorage.setItem(prefix + key, JSON.stringify(value)); }
      catch (error) { persistent = false; }
      return persistent;
    },
    isPersistent: function () { return persistent; }
  };
}());
