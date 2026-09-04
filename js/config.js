/* Public configuration only. Never put API keys or device secrets in a static site. */
window.FLORA_CONFIG = Object.assign({
  mode: "mock",
  apiBaseUrl: "",
  deviceId: "C-01",
  pollInterval: 6500,
  requestTimeout: 8000
}, window.FLORA_CONFIG || {});
